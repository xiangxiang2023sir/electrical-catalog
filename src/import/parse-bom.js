import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { BOM_DATA_START, BOM_SHEET_NAME } from '../export/company-bom.js'

const HEADER_LIKE =
  /订货号|标准号|系统自动导出|Order\/Norming|Description|^NO\.?$|^序号$|^名称|^数量$|^单位$/i

function cellText(cell) {
  if (!cell) return ''
  const v = cell.value
  if (v == null || v === '') {
    const t = typeof cell.text === 'string' ? cell.text.trim() : ''
    return t && t !== 'null' ? t.replace(/\s+/g, ' ').trim() : ''
  }
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if (v.result != null && typeof v.result !== 'object') return String(v.result).trim()
    if (typeof v.text === 'string') return v.text.trim()
    if (Array.isArray(v.richText)) return v.richText.map((p) => p.text || '').join('').trim()
    if (v.hyperlink) return String(v.text || v.hyperlink).trim()
  }
  return String(v).replace(/\s+/g, ' ').trim()
}

function parseQty(raw) {
  const s = String(raw ?? '').replace(/,/g, '').trim()
  if (!s) return 1
  const m = s.match(/-?\d+(?:\.\d+)?/)
  if (!m) return 1
  const n = Number(m[0])
  if (!Number.isFinite(n) || n <= 0) return 1
  return n
}

function normalizeOrderNo(raw) {
  return String(raw || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isHeaderLike(text) {
  const s = String(text || '').trim()
  if (!s) return true
  return HEADER_LIKE.test(s)
}

function lastRow(sheet) {
  const dim = sheet.dimensions
  const bottom = dim && Number(dim.bottom)
  return Math.max(sheet.rowCount || 0, Number.isFinite(bottom) ? bottom : 0, BOM_DATA_START)
}

function mergeLines(lines) {
  const map = new Map()
  for (const line of lines) {
    let orderNo = normalizeOrderNo(line.orderNo)
    if (!orderNo || isHeaderLike(orderNo)) orderNo = normalizeOrderNo(line.partNo)
    if (!orderNo || isHeaderLike(orderNo)) continue
    const prev = map.get(orderNo.toLowerCase())
    const qty = parseQty(line.qty)
    if (prev) {
      prev.qty += qty
      continue
    }
    map.set(orderNo.toLowerCase(), {
      orderNo,
      title: String(line.title || '').trim(),
      model: String(line.model || '').trim(),
      unit: String(line.unit || 'EA').trim() || 'EA',
      brand: String(line.brand || '').trim(),
      qty,
      price: Number(String(line.price || '').replace(/[¥,\s]/g, '')) || 0,
    })
  }
  return [...map.values()]
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else quoted = false
      } else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') out.push(cur), (cur = '')
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function headerIndex(headers, re) {
  return headers.findIndex((h) => re.test(h))
}

export function parseBomCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { project: {}, lines: [] }
  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/\s+/g, ''))
  const iOrder = headerIndex(headers, /内部订货号|订货号/)
  if (iOrder < 0) throw new Error('CSV 里没有「内部订货号」或「订货号」列')
  const iTitle = headerIndex(headers, /^名称/)
  const iBrand = headerIndex(headers, /品牌|供应商/)
  const iModel = headerIndex(headers, /型号|规格/)
  const iUnit = headerIndex(headers, /单位/)
  const iQty = headerIndex(headers, /^数量$|数量/)
  const iPrice = headerIndex(headers, /单价/)
  const parsed = []
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line)
    parsed.push({
      orderNo: cols[iOrder] || '',
      title: iTitle >= 0 ? cols[iTitle] : '',
      brand: iBrand >= 0 ? cols[iBrand] : '',
      model: iModel >= 0 ? cols[iModel] : '',
      unit: iUnit >= 0 ? cols[iUnit] : 'EA',
      qty: iQty >= 0 ? cols[iQty] : 1,
      price: iPrice >= 0 ? cols[iPrice] : 0,
    })
  }
  return { project: {}, lines: mergeLines(parsed) }
}

function parseEicSheet(sheet) {
  const project = {
    name: cellText(sheet.getCell('C1')),
    number: cellText(sheet.getCell('C2')),
    workOrder: cellText(sheet.getCell('C3')),
    mechEngineer: cellText(sheet.getCell('F2')),
    version: cellText(sheet.getCell('L2')),
  }
  const parsed = []
  const end = lastRow(sheet)
  for (let r = BOM_DATA_START; r <= end; r += 1) {
    const row = sheet.getRow(r)
    parsed.push({
      orderNo: cellText(row.getCell(5)),
      partNo: cellText(row.getCell(3)),
      title: cellText(row.getCell(6)),
      model: cellText(row.getCell(7)),
      qty: cellText(row.getCell(8)),
      unit: cellText(row.getCell(9)),
      price: cellText(row.getCell(10)),
      brand: cellText(row.getCell(12)),
    })
  }
  return { project, lines: mergeLines(parsed) }
}

function looksLikeLabel(text) {
  return /项目名称|Program Name|项目编号|工作令|版本规则/.test(text)
}

function cleanProject(project) {
  const next = { ...project }
  if (looksLikeLabel(next.name)) next.name = ''
  if (looksLikeLabel(next.number)) next.number = ''
  if (looksLikeLabel(next.workOrder)) next.workOrder = ''
  return next
}

function parseGenericSheet(sheet) {
  let headerRow = 0
  const col = { order: 0, part: 0, title: 0, model: 0, qty: 0, unit: 0, brand: 0, price: 0 }
  const maxCol = Math.min(sheet.columnCount || 20, 20)
  for (let r = 1; r <= 20; r += 1) {
    const texts = []
    for (let c = 1; c <= maxCol; c += 1) texts.push(cellText(sheet.getRow(r).getCell(c)))
    const joined = texts.join('|')
    if (!/订货号|内部订货号|Order\/Norming/i.test(joined)) continue
    headerRow = r
    texts.forEach((t, i) => {
      const c = i + 1
      if (/订货号|Order\/Norming/i.test(t) && !col.order) col.order = c
      else if (/零件号|Com\.?\s*No/i.test(t) && !col.part) col.part = c
      else if (/名称|Description/i.test(t) && !col.title) col.title = c
      else if (/规格|型号|Material\/Type/i.test(t) && !col.model) col.model = c
      else if (/数量|Quantity/i.test(t) && !col.qty) col.qty = c
      else if (/^单位$|^Unit$/i.test(t) && !col.unit) col.unit = c
      else if (/供应商|品牌|Supplier/i.test(t) && !col.brand) col.brand = c
      else if (/单价|Price/i.test(t) && !col.price) col.price = c
    })
    break
  }
  if (!headerRow || !col.order) return null
  const parsed = []
  const end = Math.max(lastRow(sheet), headerRow + 1)
  for (let r = headerRow + 1; r <= end; r += 1) {
    const row = sheet.getRow(r)
    parsed.push({
      orderNo: cellText(row.getCell(col.order)),
      partNo: col.part ? cellText(row.getCell(col.part)) : '',
      title: col.title ? cellText(row.getCell(col.title)) : '',
      model: col.model ? cellText(row.getCell(col.model)) : '',
      qty: col.qty ? cellText(row.getCell(col.qty)) : 1,
      unit: col.unit ? cellText(row.getCell(col.unit)) : 'EA',
      brand: col.brand ? cellText(row.getCell(col.brand)) : '',
      price: col.price ? cellText(row.getCell(col.price)) : 0,
    })
  }
  return { project: {}, lines: mergeLines(parsed) }
}

const SKIP_ZIP =
  /xl\/(drawings|media|charts|chartsheets|printerSettings|comments|embeddings)|vmlDrawing|ctrlProp|threadedComment|person\.xml/i

async function stripHeavyParts(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  for (const name of Object.keys(zip.files)) {
    if (SKIP_ZIP.test(name)) zip.remove(name)
  }
  for (const name of Object.keys(zip.files)) {
    if (!/xl\/worksheets\/_rels\/.+\.rels$/i.test(name)) continue
    const file = zip.file(name)
    if (!file) continue
    const rels = await file.async('string')
    zip.file(
      name,
      rels.replace(/<Relationship[^>]+Target="[^"]*(drawings|media|charts|embeddings)[^"]*"[^>]*\/>/gi, '')
    )
  }
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
}

async function loadWorkbook(buffer) {
  const options = { ignoreNodes: ['drawing', 'legacyDrawing', 'picture', 'oleObjects'] }
  const stripped = await stripHeavyParts(buffer)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(stripped, options)
  return workbook
}

export async function parseBomWorkbook(buffer) {
  const workbook = await loadWorkbook(buffer)
  const eic = workbook.getWorksheet(BOM_SHEET_NAME)
  const candidates = []
  if (eic) {
    const parsed = parseEicSheet(eic)
    parsed.project = cleanProject(parsed.project)
    candidates.push(parsed)
  }
  for (const sheet of workbook.worksheets) {
    if (sheet.name === 'Change Log' || sheet.name === 'Fill Instruction') continue
    if (eic && sheet.name === eic.name) continue
    const generic = parseGenericSheet(sheet)
    if (generic) candidates.push(generic)
  }
  candidates.sort((a, b) => (b.lines?.length || 0) - (a.lines?.length || 0))
  if (candidates[0]?.lines?.length) return candidates[0]
  if (eic) {
    const parsed = parseEicSheet(eic)
    parsed.project = cleanProject(parsed.project)
    return parsed
  }
  throw new Error('没有找到可导入的物料行（需要公司 BOM 模板，第 6 行起要有订货号）')
}

export async function parseBomFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const buffer = await file.arrayBuffer()
  if (name.endsWith('.csv')) return parseBomCsv(new TextDecoder('utf-8').decode(buffer))
  if (name.endsWith('.xls') && !name.endsWith('.xlsx') && !name.endsWith('.xlsm')) {
    throw new Error('请另存为 xlsx 后再导入（旧版 xls 暂不支持）')
  }
  return parseBomWorkbook(buffer)
}
