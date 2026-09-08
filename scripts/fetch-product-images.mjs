import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDb, getMaterial, imagesDir, updateMaterial } from '../server/catalog-db.js'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
const LIMIT = Number(process.argv[2] || 40)
const DELAY_MS = 800

mkdirSync(imagesDir, { recursive: true })
const missFile = join(imagesDir, '..', '.image-fetch-miss.txt')

function loadMiss() {
  if (!existsSync(missFile)) return new Set()
  return new Set(
    readFileSync(missFile, 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
  )
}

function rememberMiss(orderNo) {
  const set = loadMiss()
  if (set.has(orderNo)) return
  set.add(orderNo)
  writeFileSync(missFile, [...set].sort().join('\n') + '\n')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function cleanModel(raw) {
  return String(raw || '')
    .replace(/^https?:\/\/\S+/i, '')
    .replace(/EATON\./i, '')
    .replace(/SIE\.?/i, '')
    .replace(/PHOENIX\./i, '')
    .replace(/WEIDMULLER\./i, '')
    .replace(/SCHNEIDER\s*/i, '')
    .replace(/（CE认证）|\(CE认证\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function articleNo(model) {
  const m = String(model || '').match(/\b(\d{7,11})\b/)
  return m ? m[1] : ''
}

function siemensMlfb(model) {
  const m = String(model || '').toUpperCase().replace(/\s+/g, '')
  const hit = m.match(/6[A-Z]{2}\d[\dA-Z.\-]{8,}/)
  return hit ? hit[0] : ''
}

function extFrom(url, buf) {
  const u = url.toLowerCase().split('?')[0]
  if (u.endsWith('.png')) return '.png'
  if (u.endsWith('.webp')) return '.webp'
  if (u.endsWith('.gif')) return '.gif'
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return '.jpg'
  if (buf[0] === 0x89 && buf[1] === 0x50) return '.png'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46) return '.webp'
  if (buf[0] === 0x47 && buf[1] === 0x49) return '.gif'
  return '.jpg'
}

function isImage(buf) {
  if (!buf || buf.length < 24) return false
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf.toString('ascii', 8, 12) === 'WEBP') {
    return true
  }
  return false
}

async function get(url, extra = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,image/*,*/*;q=0.8',
      ...extra,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })
  return res
}

function extractImageUrls(html, pageUrl) {
  const urls = []
  const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  if (og) urls.push(og[1])
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    urls.push(m[1])
  }
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)) {
    urls.push(m[0])
  }
  const abs = []
  for (const raw of urls) {
    let u = raw.replace(/&amp;/g, '&').trim()
    if (!u || u.startsWith('data:')) continue
    if (u.startsWith('//')) u = `https:${u}`
    else if (u.startsWith('/')) {
      try {
        u = new URL(u, pageUrl).href
      } catch {
        continue
      }
    }
    if (u.startsWith('http://')) u = `https://${u.slice(7)}`
    if (!/^https?:\/\//i.test(u)) continue
    const low = u.toLowerCase()
    if (/logo|icon|sprite|pixel|1x1|blank|placeholder|banner|flag|svg|dap_master|favicon|apple-touch|hero|homepage/i.test(low)) continue
    abs.push(u)
  }
  return [...new Set(abs)]
}

function pageUrls(item) {
  const brand = String(item.brand || '').toUpperCase()
  const model = cleanModel(item.model)
  const art = articleNo(item.model)
  const mlfb = siemensMlfb(item.model)
  const q = encodeURIComponent(art || model)
  const list = []
  if (mlfb) {
    const slug = mlfb.toLowerCase().replace(/\./g, '-')
    list.push(`https://www.industrialautomationco.com/products/siemens-${slug}`)
    list.push(`https://electgo.com/catalogsearch/result/?q=${encodeURIComponent(mlfb)}`)
  }
  if (art) {
    list.push(`https://electgo.com/catalogsearch/result/?q=${art}`)
  }
  if (art && /WEIDMULLER|PHOENIX|WAGO/.test(brand)) {
    list.push(`https://eshop.weidmueller.com/p/${art}`)
    list.push(`https://www.phoenixcontact.com/en-us/search?q=${art}`)
  }
  if (model) {
    list.push(`https://www.tracepartsonline.net/search?q=${q}`)
  }
  if (/EATON/.test(brand) && model) {
    list.push(`https://www.eaton.com/us/en-us/skuPage.${encodeURIComponent(model)}.html`)
    list.push(`https://www.partshnc.com/catalogsearch/result/?q=${encodeURIComponent(model)}`)
  }
  if (/SCHNEIDER/.test(brand) && model) {
    list.push(`https://www.se.com/ww/en/product/${encodeURIComponent(model)}`)
  }
  if (/OMRON/.test(brand) && model) {
    list.push(`https://www.ia.omron.com/product/item/${encodeURIComponent(model)}/`)
  }
  return [...new Set(list)].slice(0, 4)
}

function preferProductShots(urls, item) {
  const keys = [siemensMlfb(item.model), articleNo(item.model), cleanModel(item.model)]
    .filter(Boolean)
    .map((s) => s.toLowerCase().replace(/\s+/g, ''))
  const score = (u) => {
    const low = u.toLowerCase()
    let n = 0
    for (const k of keys) {
      if (k.length >= 6 && low.includes(k.toLowerCase())) n += 5
      if (k.includes('-') && low.includes(k.replace(/\./g, '-'))) n += 5
    }
    if (/shopify|cdn\.shopify|product|1200x/i.test(low)) n += 2
    return n
  }
  return [...urls].sort((a, b) => score(b) - score(a))
}

async function downloadImage(url, orderNo, referer) {
  const res = await get(url, referer ? { Referer: referer } : {})
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (!isImage(buf) || buf.length < 3000 || buf.length > 4_000_000) return null
  const ext = extFrom(url, buf)
  const name = `${orderNo}${ext}`
  const dest = join(imagesDir, name)
  const tmp = `${dest}.part`
  writeFileSync(tmp, buf)
  if (existsSync(dest)) unlinkSync(dest)
  writeFileSync(dest, buf)
  unlinkSync(tmp)
  return name
}

async function findImage(item) {
  for (const page of pageUrls(item)) {
    try {
      const res = await get(page)
      if (!res.ok) continue
      const html = await res.text()
      if (html.length < 200) continue
      const imgs = preferProductShots(extractImageUrls(html, page), item)
      for (const img of imgs.slice(0, 8)) {
        try {
          const name = await downloadImage(img, item.order_no, page)
          if (name) return name
        } catch {
          /* try next */
        }
      }
    } catch {
      /* try next page */
    }
    await sleep(200)
  }
  return null
}

function candidates(limit) {
  const miss = loadMiss()
  const rows = getDb()
    .prepare(
      `SELECT id, order_no, title, brand, model, cat, img, tags
       FROM materials
       WHERE cat LIKE '电气%'
         AND (img IS NULL OR img = '')
         AND length(trim(model)) >= 5
         AND model NOT LIKE '%http%'
         AND model NOT LIKE '%淘宝%'
         AND model NOT LIKE '%请使用%'
         AND brand IN ('SIE','SIEMENS','SCHNEIDER','PHOENIX','EATON','OMRON','KEYENCE','WAGO','PILZ','HARTING','MOXA')
       ORDER BY
         CASE brand
           WHEN 'SIE' THEN 0 WHEN 'SIEMENS' THEN 0 WHEN 'PHOENIX' THEN 1
           WHEN 'SCHNEIDER' THEN 2 WHEN 'EATON' THEN 3
           ELSE 4
         END,
         id
       LIMIT ?`
    )
    .all(Math.max(limit * 25, 500))
  return rows.filter((r) => !miss.has(r.order_no)).slice(0, limit)
}

function setImg(id, fileName) {
  const existing = getMaterial(id)
  if (!existing) return false
  const result = updateMaterial(id, {
    ...existing,
    img: `/library-media/${fileName}`,
    price: existing.price,
  })
  return result.ok
}

const rows = candidates(LIMIT)
let ok = 0
let miss = 0
for (const row of rows) {
  const local = ['jpg', 'jpeg', 'png', 'webp'].some((ext) =>
    existsSync(join(imagesDir, `${row.order_no}.${ext}`))
  )
  if (local) {
    const found = ['jpg', 'jpeg', 'png', 'webp']
      .map((ext) => `${row.order_no}.${ext}`)
      .find((n) => existsSync(join(imagesDir, n)))
    if (found && setImg(row.id, found)) {
      ok += 1
      console.log('had', row.order_no, found)
    }
    continue
  }
  process.stdout.write(`try ${row.order_no} ${row.brand} ${cleanModel(row.model)} ... `)
  const file = await findImage(row)
  if (file && setImg(row.id, file)) {
    ok += 1
    console.log('got', file)
  } else {
    miss += 1
    rememberMiss(row.order_no)
    console.log('skip')
  }
  await sleep(DELAY_MS)
}
console.log(JSON.stringify({ tried: rows.length, saved: ok, skipped: miss }))
