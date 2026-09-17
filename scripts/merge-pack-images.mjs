import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { DatabaseSync } from 'node:sqlite'
import { getDb, getMaterial, imagesDir, updateMaterial } from '../server/catalog-db.js'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const packDir = join(rootDir, '..', '..', '库文件整理')

function listArchives(dir, filter) {
  if (!existsSync(dir)) throw new Error(`目录不存在：${dir}`)
  return readdirSync(dir)
    .filter((name) => /\.(tar\.gz|tgz|gz)$/i.test(name))
    .filter((name) => (filter ? filter(name) : true))
    .map((name) => join(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
}

async function extractZip(archivePath, destDir) {
  const zip = await JSZip.loadAsync(readFileSync(archivePath))
  for (const [path, entry] of Object.entries(zip.files)) {
    const outPath = join(destDir, path)
    if (entry.dir) {
      mkdirSync(outPath, { recursive: true })
      continue
    }
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, await entry.async('nodebuffer'))
  }
}

function extractTarGz(archivePath, destDir) {
  mkdirSync(destDir, { recursive: true })
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', destDir], { stdio: 'pipe' })
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() || `解压失败：${archivePath}`)
  }
}

async function extractArchive(archivePath, destDir) {
  if (/\.tar\.gz$|\.tgz$/i.test(archivePath)) {
    extractTarGz(archivePath, destDir)
    return
  }
  await extractZip(archivePath, destDir)
}

function findInTree(dir, name, { dirOnly = false } = {}) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (dirOnly && entry.name === name) return full
      const nested = findInTree(full, name, { dirOnly })
      if (nested) return nested
      continue
    }
    if (!dirOnly && entry.name === name) return full
  }
  return null
}

function readPackMaterials(dbPath) {
  const db = new DatabaseSync(dbPath)
  const rows = db
    .prepare('SELECT order_no, model, desc, img FROM materials ORDER BY order_no')
    .all()
  db.close()
  return rows
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^ab\./, '')
    .replace(/\//g, '-')
}

function buildImageIndex(packImagesDir) {
  const index = new Map()
  const allNames = []
  for (const name of readdirSync(packImagesDir)) {
    const full = join(packImagesDir, name)
    if (!statSync(full).isFile()) continue
    allNames.push(name)
    index.set(name.toLowerCase(), name)
    const stem = extname(name) ? basename(name, extname(name)) : name
    index.set(stem.toLowerCase(), name)
    index.set(normalizeKey(stem), name)
  }
  return { index, allNames }
}

function resolveImageName(row, imageIndex, allNames) {
  const tryKeys = []
  const img = String(row.img || '').trim()
  if (img.startsWith('/library-media/')) {
    const fileName = img.replace('/library-media/', '')
    tryKeys.push(fileName, normalizeKey(fileName))
  }
  const model = String(row.model || '').trim()
  if (model) {
    tryKeys.push(model, model.replace(/^AB\./i, ''), normalizeKey(model))
  }
  const orderNo = String(row.order_no || '').trim()
  if (orderNo) tryKeys.push(orderNo)

  for (const key of tryKeys) {
    const hit = imageIndex.get(String(key).toLowerCase()) || imageIndex.get(normalizeKey(key))
    if (hit) return hit
  }

  const modelKey = normalizeKey(model.replace(/^AB\./i, ''))
  if (modelKey) {
    for (const name of allNames) {
      const stem = normalizeKey(extname(name) ? basename(name, extname(name)) : name)
      if (stem === modelKey || stem.startsWith(`${modelKey}-`) || modelKey.startsWith(`${stem}-`)) {
        return name
      }
      if (stem.includes(modelKey) || modelKey.includes(stem)) return name
    }
  }

  return null
}

function destImageName(row, sourceName) {
  const ext = extname(sourceName) || '.jpg'
  const model = String(row.model || '')
    .trim()
    .replace(/^AB\./i, '')
    .replace(/\//g, '-')
    .replace(/[\\/:*?"<>|]/g, '-')
  return model ? `${model}${ext}` : sourceName
}

async function mergeOneArchive(archivePath, { missingOnly, mergeDesc }) {
  const tempDir = mkdtempSync(join(tmpdir(), 'catalog-pack-'))
  const results = {
    archive: archivePath,
    total: 0,
    copied: 0,
    descUpdated: 0,
    imgUpdated: 0,
    skippedNoMain: 0,
    skippedNoChange: 0,
    stillMissing: 0,
    errors: [],
  }

  try {
    await extractArchive(archivePath, tempDir)
    const packDb = findInTree(tempDir, 'catalog.db')
    const packImages = findInTree(tempDir, 'images', { dirOnly: true })
    if (!packDb || !packImages) throw new Error('压缩包结构不对，缺少 catalog.db 或 images/')

    const materials = readPackMaterials(packDb)
    const { index: imageIndex, allNames } = buildImageIndex(packImages)
    results.total = materials.length

    for (const row of materials) {
      const orderNo = String(row.order_no || '').trim()
      const mainRow = getDb()
        .prepare('SELECT id FROM materials WHERE order_no = ? COLLATE NOCASE')
        .get(orderNo)
      if (!mainRow) {
        results.skippedNoMain += 1
        results.errors.push(`主库无订货号：${orderNo}`)
        continue
      }

      const existing = getMaterial(mainRow.id)
      const skipImg = missingOnly && existing.img
      if (skipImg && !mergeDesc) {
        results.skippedNoChange += 1
        continue
      }

      const patch = { ...existing, price: existing.price }
      let changed = false

      if (mergeDesc) {
        const packDesc = String(row.desc || '').trim()
        if (packDesc && packDesc !== String(existing.desc || '').trim()) {
          patch.desc = packDesc
          changed = true
          results.descUpdated += 1
        }
      }

      const imageName = skipImg ? null : resolveImageName(row, imageIndex, allNames)
      if (imageName) {
        const src = join(packImages, imageName)
        const destName = destImageName(row, imageName)
        copyFileSync(src, join(imagesDir, destName))
        results.copied += 1
        const imgPath = `/library-media/${destName}`
        if (imgPath !== String(existing.img || '').trim()) {
          patch.img = imgPath
          changed = true
          results.imgUpdated += 1
        }
      } else if (missingOnly && !existing.img) {
        results.stillMissing += 1
        results.errors.push(`仍缺图：${orderNo} ${row.model}`)
      }

      if (!changed) {
        results.skippedNoChange += 1
        continue
      }

      const result = updateMaterial(mainRow.id, patch)
      if (result.ok) {
        console.log('ok', orderNo, patch.desc !== existing.desc ? 'desc' : '', patch.img !== existing.img ? patch.img : '')
      } else {
        results.errors.push(`${orderNo}: ${result.error}`)
      }
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }

  return results
}

async function main() {
  const missingOnly = process.argv.includes('--missing-only')
  const mergeDesc = process.argv.includes('--merge-desc')
  const all = process.argv.includes('--all')
  const archiveArgs = process.argv.filter((arg) => !arg.startsWith('-') && /\.(tar\.gz|tgz|gz)$/i.test(arg))

  mkdirSync(imagesDir, { recursive: true })

  let archives = archiveArgs
  if (!archives.length) {
    archives = all ? listArchives(packDir) : listArchives(packDir)
  }
  if (!archives.length) throw new Error(`在 ${packDir} 找不到物料包`)

  console.log('mode:', missingOnly ? 'missing-only' : 'full', mergeDesc ? '+desc' : 'images-only')
  const summary = []
  for (const archivePath of archives) {
    console.log('\narchive:', archivePath)
    summary.push(await mergeOneArchive(archivePath, { missingOnly, mergeDesc }))
  }
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
