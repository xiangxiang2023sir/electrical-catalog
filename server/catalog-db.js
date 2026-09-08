import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
export const libraryDir = join(rootDir, 'library')
export const imagesDir = join(libraryDir, 'images')
export const dbPath = join(libraryDir, 'catalog.db')

let db

function nowIso() {
  return new Date().toISOString()
}

export function getDb() {
  if (db) return db
  mkdirSync(imagesDir, { recursive: true })
  db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE COLLATE NOCASE,
      title TEXT NOT NULL,
      cat TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      desc TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'EA',
      price REAL,
      tags TEXT NOT NULL DEFAULT '[]',
      img TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_materials_cat ON materials(cat);
    CREATE INDEX IF NOT EXISTS idx_materials_title ON materials(title);
  `)
  migrateUnknownCat(db)
  return db
}

function migrateUnknownCat(database) {
  database.exec(`
    UPDATE materials
    SET cat = replace(cat, '待判定', '未定义')
    WHERE cat LIKE '待判定%';
    UPDATE materials
    SET tags = replace(tags, '待判定', '未定义')
    WHERE tags LIKE '%待判定%';
  `)
}

function parseTags(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String)
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []
  } catch {
    return []
  }
}

export function rowToMaterial(row) {
  if (!row) return null
  return {
    id: row.id,
    orderNo: row.order_no,
    title: row.title,
    cat: row.cat,
    brand: row.brand,
    model: row.model,
    desc: row.desc,
    unit: row.unit || 'EA',
    price: row.price,
    tags: parseTags(row.tags),
    img: row.img || '',
  }
}

function likeQuery(q) {
  return `%${String(q || '').trim().replace(/[%_]/g, '')}%`
}

export function listCategories() {
  const database = getDb()
  const total = database.prepare('SELECT COUNT(*) AS n FROM materials').get().n
  const rollup = database
    .prepare(
      `SELECT
         CASE
           WHEN cat LIKE '电气%' THEN '电气'
           WHEN cat LIKE '机械%' THEN '机械'
           WHEN cat LIKE '未定义%' OR cat LIKE '待判定%' THEN '未定义'
           ELSE '其他'
         END AS name,
         COUNT(*) AS count
       FROM materials
       GROUP BY name
       ORDER BY
         CASE name WHEN '电气' THEN 0 WHEN '机械' THEN 1 WHEN '未定义' THEN 2 ELSE 3 END`
    )
    .all()
  const rows = database
    .prepare(
      `SELECT cat AS name, COUNT(*) AS count
       FROM materials
       WHERE cat IS NOT NULL AND cat != ''
       GROUP BY cat
       ORDER BY
         CASE
           WHEN cat LIKE '电气%' THEN 0
           WHEN cat LIKE '机械%' THEN 1
           ELSE 2
         END,
         cat ASC`
    )
    .all()
  return { total, categories: [...rollup, ...rows] }
}

export function listMaterials({ q = '', cat = '', page = 1, pageSize = 48 } = {}) {
  const database = getDb()
  const pageNum = Math.max(1, Number(page) || 1)
  const size = Math.min(200, Math.max(1, Number(pageSize) || 48))
  const offset = (pageNum - 1) * size
  const keyword = String(q || '').trim()
  const category = String(cat || '').trim()
  const like = likeQuery(keyword)

  const where = []
  const params = []
  if (keyword) {
    where.push(
      '(order_no LIKE ? OR title LIKE ? OR brand LIKE ? OR model LIKE ? OR desc LIKE ? OR tags LIKE ?)'
    )
    params.push(like, like, like, like, like, like)
  }
  if (category && category !== '全部') {
    if (category === '电气' || category === '机械') {
      where.push('cat LIKE ?')
      params.push(`${category}%`)
    } else if (category === '未定义' || category === '待判定') {
      where.push("(cat LIKE '未定义%' OR cat LIKE '待判定%')")
    } else {
      where.push('cat = ?')
      params.push(category)
    }
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const total = database
    .prepare(`SELECT COUNT(*) AS n FROM materials ${whereSql}`)
    .get(...params).n
  const rows = database
    .prepare(
      `SELECT * FROM materials ${whereSql}
       ORDER BY updated_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, size, offset)

  return {
    items: rows.map(rowToMaterial),
    total,
    page: pageNum,
    pageSize: size,
  }
}

export function getMaterial(id) {
  const row = getDb().prepare('SELECT * FROM materials WHERE id = ?').get(Number(id))
  return rowToMaterial(row)
}

export function getMaterialsByOrderNos(orderNos) {
  return lookupMaterials({ orderNos })
}

function compactKey(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[\s.\-]/g, '')
}

export function lookupMaterials({ orderNos = [], models = [] } = {}) {
  const database = getDb()
  const items = []
  const seen = new Set()
  const add = (row) => {
    if (!row || seen.has(row.id)) return
    seen.add(row.id)
    items.push(rowToMaterial(row))
  }
  const byOrder = database.prepare('SELECT * FROM materials WHERE order_no = ?')
  const byModel = database.prepare(
    `SELECT * FROM materials
     WHERE replace(replace(replace(upper(model), ' ', ''), '.', ''), '-', '') = ?
     LIMIT 3`
  )
  const nos = [
    ...new Set((Array.isArray(orderNos) ? orderNos : []).map((n) => String(n || '').trim()).filter(Boolean)),
  ].slice(0, 1500)
  const mods = [
    ...new Set((Array.isArray(models) ? models : []).map((n) => String(n || '').trim()).filter(Boolean)),
  ].slice(0, 1500)
  for (const orderNo of nos) add(byOrder.get(orderNo))
  for (const model of mods) {
    const key = compactKey(model)
    if (key.length < 5) continue
    for (const row of byModel.all(key)) add(row)
  }
  return items
}

export function countMaterials() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM materials').get().n
}

export function createMaterial(payload) {
  let item
  try {
    item = normalizePayload(payload)
  } catch (e) {
    if (e.expose) return { ok: false, error: e.message }
    throw e
  }
  const ts = nowIso()
  try {
    const result = getDb()
      .prepare(
        `INSERT INTO materials
          (order_no, title, cat, brand, model, desc, unit, price, tags, img, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        item.orderNo,
        item.title,
        item.cat,
        item.brand,
        item.model,
        item.desc,
        item.unit,
        item.price,
        JSON.stringify(item.tags),
        item.img,
        ts,
        ts
      )
    return { ok: true, item: getMaterial(Number(result.lastInsertRowid)) }
  } catch (e) {
    if (String(e.message || e).includes('UNIQUE')) {
      return { ok: false, error: '这个内部订货号已经存在' }
    }
    throw e
  }
}

export function updateMaterial(id, payload) {
  const existing = getMaterial(id)
  if (!existing) return { ok: false, error: '要改的物料不在库里' }
  let item
  try {
    item = normalizePayload({ ...existing, ...payload, orderNo: payload.orderNo ?? existing.orderNo })
  } catch (e) {
    if (e.expose) return { ok: false, error: e.message }
    throw e
  }
  const ts = nowIso()
  try {
    getDb()
      .prepare(
        `UPDATE materials SET
          order_no = ?, title = ?, cat = ?, brand = ?, model = ?, desc = ?,
          unit = ?, price = ?, tags = ?, img = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        item.orderNo,
        item.title,
        item.cat,
        item.brand,
        item.model,
        item.desc,
        item.unit,
        item.price,
        JSON.stringify(item.tags),
        item.img,
        ts,
        Number(id)
      )
    return { ok: true, item: getMaterial(id) }
  } catch (e) {
    if (String(e.message || e).includes('UNIQUE')) {
      return { ok: false, error: '这个内部订货号已经存在' }
    }
    throw e
  }
}

export function deleteMaterial(id) {
  const existing = getMaterial(id)
  if (!existing) return { ok: false, error: '要删的物料不在库里' }
  getDb().prepare('DELETE FROM materials WHERE id = ?').run(Number(id))
  return { ok: true, item: existing }
}

export function importOrderNos(rows) {
  const database = getDb()
  const insert = database.prepare(
    `INSERT OR IGNORE INTO materials
      (order_no, title, cat, brand, model, desc, unit, price, tags, img, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const ts = nowIso()
  let inserted = 0
  database.exec('BEGIN')
  try {
    for (const raw of rows) {
      const orderNo = String(raw.orderNo || '').trim()
      if (!orderNo) continue
      const result = insert.run(
        orderNo,
        String(raw.title || '').trim() || '资料待补',
        String(raw.cat || '').trim(),
        String(raw.brand || '').trim(),
        String(raw.model || '').trim(),
        String(raw.desc || '').trim(),
        String(raw.unit || '').trim() || 'EA',
        parsePrice(raw.price ?? raw.priceNum),
        JSON.stringify(parseTags(raw.tags || [])),
        String(raw.img || '').trim(),
        ts,
        ts
      )
      if (result.changes) inserted += 1
    }
    database.exec('COMMIT')
  } catch (e) {
    database.exec('ROLLBACK')
    throw e
  }
  return { inserted, total: countMaterials() }
}

export async function seedDemoIfEmpty() {
  if (countMaterials() > 0) return { seeded: false, total: countMaterials() }
  const { demoItems } = await import('../src/data/demo-items.js')
  const result = importOrderNos(demoItems)
  return { seeded: true, ...result }
}

function parsePrice(raw) {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw === 0 ? null : raw
  const n = Number(String(raw).replace(/[¥,]/g, ''))
  if (!Number.isFinite(n) || n === 0) return null
  return n
}

export function replaceMaterials(rows) {
  const database = getDb()
  const ts = nowIso()
  const byKey = new Map()
  for (const raw of rows) {
    const orderNo = String(raw.orderNo || '').trim()
    if (!orderNo) continue
    byKey.set(orderNo.toLowerCase(), {
      orderNo,
      title: String(raw.title || '').trim() || '资料待补',
      cat: String(raw.cat || '').trim() || '未分类',
      brand: String(raw.brand || '').trim(),
      model: String(raw.model || '').trim(),
      desc: String(raw.desc || '').trim(),
      unit: String(raw.unit || '').trim() || 'EA',
      price: parsePrice(raw.price ?? raw.priceNum),
      tags: parseTags(raw.tags || []),
      img: String(raw.img || '').trim(),
    })
  }
  const items = [...byKey.values()]
  const insert = database.prepare(
    `INSERT INTO materials
      (order_no, title, cat, brand, model, desc, unit, price, tags, img, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  database.exec('BEGIN')
  try {
    database.exec('DELETE FROM materials')
    for (const item of items) {
      insert.run(
        item.orderNo,
        item.title,
        item.cat,
        item.brand,
        item.model,
        item.desc,
        item.unit,
        item.price,
        JSON.stringify(item.tags),
        item.img,
        ts,
        ts
      )
    }
    database.exec('COMMIT')
  } catch (e) {
    database.exec('ROLLBACK')
    throw e
  }
  return { inserted: items.length, total: countMaterials(), droppedDupes: rows.length - items.length }
}

function normalizePayload(payload) {
  const orderNo = String(payload.orderNo || payload.order_no || '').trim()
  const title = String(payload.title || '').trim()
  if (!orderNo) throw Object.assign(new Error('请填写内部订货号（与公司表一致）'), { expose: true })
  if (!title) throw Object.assign(new Error('请填写名称'), { expose: true })
  const priceRaw = payload.price ?? payload.priceNum
  let price = null
  if (priceRaw !== '' && priceRaw != null) {
    const n = Number(String(priceRaw).replace(/[¥,]/g, ''))
    price = Number.isFinite(n) ? n : null
  }
  return {
    orderNo,
    title,
    cat: String(payload.cat || '').trim() || '未分类',
    brand: String(payload.brand || '').trim(),
    model: String(payload.model || '').trim(),
    desc: String(payload.desc || '').trim(),
    unit: String(payload.unit || '').trim() || 'EA',
    price,
    tags: parseTags(payload.tags),
    img: String(payload.img || '').trim(),
  }
}
