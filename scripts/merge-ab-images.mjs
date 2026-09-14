import {
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
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { DatabaseSync } from 'node:sqlite'
import { getDb, getMaterial, imagesDir, updateMaterial } from '../server/catalog-db.js'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const packDir = join(rootDir, '..', '..', '库文件整理')

function findArchive(dir) {
  if (!existsSync(dir)) throw new Error(`目录不存在：${dir}`)
  const hit = readdirSync(dir).find((name) => /AB/i.test(name))
  if (!hit) throw new Error(`在 ${dir} 找不到 AB 物料包`)
  return join(dir, hit)
}

async function extractArchive(archivePath, destDir) {
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

function detectExt(buf, fallback = '.jpg') {
  if (!buf || buf.length < 4) return fallback
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf.toString('ascii', 8, 12) === 'WEBP') {
    return '.webp'
  }
  return fallback
}

function safeModelName(model) {
  return String(model || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
}

function readPackMaterials(dbPath) {
  const db = new DatabaseSync(dbPath)
  const rows = db.prepare('SELECT order_no, model FROM materials ORDER BY order_no').all()
  db.close()
  return rows
}

function matchImageFile(filePath, materials) {
  const fileName = basename(filePath)
  const stem = extname(fileName) ? basename(fileName, extname(fileName)) : fileName
  const stemLower = stem.toLowerCase()

  for (const row of materials) {
    const model = String(row.model || '').trim()
    const orderNo = String(row.order_no || '').trim()
    if (model && stemLower === model.toLowerCase()) return row
    if (orderNo && stemLower === orderNo.toLowerCase()) return row
  }
  return null
}

async function main() {
  const archivePath = process.argv[2] || findArchive(packDir)
  const tempDir = mkdtempSync(join(tmpdir(), 'ab-pack-'))
  mkdirSync(imagesDir, { recursive: true })

  console.log('archive:', archivePath)
  await extractArchive(archivePath, tempDir)

  const packDb = findInTree(tempDir, 'catalog.db')
  const packImages = findInTree(tempDir, 'images', { dirOnly: true })
  if (!packDb || !packImages) throw new Error('压缩包结构不对，缺少 catalog.db 或 images/')

  const materials = readPackMaterials(packDb)
  const imageFiles = readdirSync(packImages)
    .map((name) => join(packImages, name))
    .filter((p) => statSync(p).isFile())

  const results = { copied: 0, updated: 0, errors: [] }

  for (const filePath of imageFiles) {
    const row = matchImageFile(filePath, materials)
    if (!row) {
      results.errors.push(`无法匹配图片：${basename(filePath)}`)
      continue
    }

    const model = safeModelName(row.model)
    if (!model) {
      results.errors.push(`缺少型号：${row.order_no}`)
      continue
    }

    const buf = readFileSync(filePath)
    const extRaw = detectExt(buf, extname(filePath).toLowerCase() || '.jpg')
    const ext = extRaw === '.jpeg' ? '.jpg' : extRaw
    const fileName = `${model}${ext}`
    writeFileSync(join(imagesDir, fileName), buf)
    results.copied += 1

    const mainRow = getDb()
      .prepare('SELECT id FROM materials WHERE order_no = ? COLLATE NOCASE')
      .get(row.order_no)
    if (!mainRow) {
      results.errors.push(`主库无订货号：${row.order_no}`)
      continue
    }

    const existing = getMaterial(mainRow.id)
    const patch = updateMaterial(mainRow.id, {
      ...existing,
      img: `/library-media/${fileName}`,
      price: existing.price,
    })
    if (patch.ok) {
      results.updated += 1
      console.log('ok', row.order_no, fileName)
    } else {
      results.errors.push(`${row.order_no}: ${patch.error}`)
    }
  }

  rmSync(tempDir, { recursive: true, force: true })
  console.log(JSON.stringify(results, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
