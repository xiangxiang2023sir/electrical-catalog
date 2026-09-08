import ExcelJS from 'exceljs'
import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { replaceMaterials, seedDemoIfEmpty } from '../server/catalog-db.js'
import { classify, parseCsvLine } from './classify-materials.mjs'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const defaultFullCsv = join(rootDir, 'library', '新增品牌申请_物料清单_表格.csv')

function cellText(value) {
  if (value == null) return ''
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map((t) => t.text).join('').trim()
    if (value.text) return String(value.text).trim()
    if (value.result != null) return String(value.result).trim()
    if (value.hyperlink) return String(value.text || value.hyperlink).trim()
  }
  return String(value).trim()
}

function headerKey(text) {
  const t = String(text || '').replace(/\s+/g, '')
  if (/订货号|标准号/i.test(t)) return 'orderNo'
  if (t === '新名称') return 'newTitle'
  if (t === '新规格') return 'newSpec'
  if (/名称描述/.test(t) || (/^名称/.test(t) && !/型号/.test(t))) return 'title'
  if (/物料大类|^分类|类别/.test(t)) return 'cat'
  if (/品牌|供应商/.test(t)) return 'brand'
  if (/老材料|规格型号/.test(t)) return 'model'
  if (/单位/.test(t) && !/起订/.test(t)) return 'unit'
  if (/单价|价格/.test(t)) return 'price'
  if (/采购目录/.test(t)) return 'inCatalog'
  if (/长周期|链接/.test(t)) return 'link'
  return null
}

function mapCategory(raw) {
  const t = String(raw || '').replace(/^\d+\.\s*/, '').trim()
  if (!t) return '未分类'
  if (t.replace(/\s+/g, '') === '信号IO元器件') return '信号 IO 元器件'
  return t
}

function mapUnit(raw) {
  const value = String(raw || 'EA').trim()
  const upper = value.toUpperCase()
  if (['EA', 'SE', 'M', 'PK', 'PR'].includes(upper)) return upper
  if (['PCS', 'PC', '个', '件', '只'].includes(value) || ['PCS', 'PC'].includes(upper)) return 'EA'
  if (value === '米' || upper === 'M') return 'M'
  return upper || 'EA'
}

function pickSheet(wb) {
  return wb.getWorksheet('全部物料') || wb.worksheets[0]
}

function catalogCat(major, minor) {
  return `${major} / ${minor}`
}

function readFullCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const orderNo = (cols[4] || '').trim()
    if (!orderNo || orderNo.includes('订货号')) continue
    const title = (cols[7] || '').trim() || (cols[5] || '').trim()
    const oldModel = (cols[6] || '').trim()
    const newSpec = (cols[8] || '').trim()
    const brand = (cols[14] || '').trim()
    const inCatalog = (cols[9] || '').trim()
    const stop = (cols[18] || '').trim()
    const link = (cols[15] || '').trim()
    const classified = classify({
      orderNo,
      title,
      newTitle: (cols[7] || '').trim(),
      oldModel,
      newSpec,
      brand,
    })
    const tags = [classified.major]
    if (inCatalog === '是') tags.push('采购目录')
    if (stop) tags.push('停用')
    rows.push({
      orderNo,
      title,
      cat: catalogCat(classified.major, classified.minor),
      brand,
      model: newSpec || oldModel,
      desc: link,
      unit: mapUnit(cols[11]),
      price: cols[12],
      tags,
    })
  }
  return rows
}

async function readExcelRows(filePath) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  const sheet = pickSheet(wb)
  if (!sheet) throw new Error('Excel 里没有工作表')

  let map = null
  const rows = []
  sheet.eachRow((row) => {
    const values = []
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col] = cellText(cell.value)
    })
    if (!map) {
      const next = {}
      values.forEach((text, col) => {
        const key = headerKey(text)
        if (key && next[key] == null) next[key] = col
      })
      if (next.orderNo) map = next
      return
    }
    const orderNo = values[map.orderNo] || ''
    if (!orderNo) return
    const title = (map.newTitle && values[map.newTitle]) || (map.title ? values[map.title] : '')
    const model = (map.newSpec && values[map.newSpec]) || (map.model ? values[map.model] : '')
    const tags = []
    if (map.inCatalog && values[map.inCatalog] === '是') tags.push('采购目录')
    const link = map.link ? values[map.link] : ''
    rows.push({
      orderNo,
      title,
      cat: map.cat ? mapCategory(values[map.cat]) : '未分类',
      brand: map.brand ? values[map.brand] : '',
      model,
      desc: link,
      unit: map.unit ? mapUnit(values[map.unit]) : 'EA',
      price: map.price ? values[map.price] : '',
      tags,
    })
  })
  if (!map) throw new Error('找不到「订货号」列，请确认是公司物料表')
  return rows
}

const filePath = process.argv[2] || (fs.existsSync(defaultFullCsv) ? defaultFullCsv : '')
if (!filePath) {
  await seedDemoIfEmpty()
  console.log('未找到完整物料表。空库会写入演示物料。')
  process.exit(0)
}

const rows = filePath.toLowerCase().endsWith('.csv')
  ? readFullCsv(filePath)
  : await readExcelRows(filePath)
const result = replaceMaterials(rows)
console.log(
  `已用完整表替换资料库。读到 ${rows.length} 行，写入 ${result.inserted} 条（重复订货号保留最后一条，去掉 ${result.droppedDupes} 行）。库内共 ${result.total} 条。`
)
