import ExcelJS from 'exceljs'
import { downloadBlob } from './plan-file.js'

export const BOM_SHEET_NAME = 'Equipment Innovation Center BOM'
export const BOM_DATA_START = 6
export const BOM_ITEM_TYPE = 'P:Purchased Parts'
export const BOM_TEMPLATE_URL = '/templates/eic-bom.xlsx'

const UNIT_SET = new Set(['EA', 'SE', 'M', 'PK', 'PR'])

export function bomFilename(project) {
  const name = sanitizeFilename(project?.name || '项目')
  const version = String(project?.version || 'A').trim().toUpperCase() || 'A'
  return `${name}-电气-BOM ${version}.xlsx`
}

export function mapBomUnit(unit) {
  const raw = String(unit || 'EA').trim()
  const upper = raw.toUpperCase()
  if (UNIT_SET.has(upper)) return upper
  if (['PCS', 'PC', '个', '件', '只'].includes(raw) || ['PCS', 'PC'].includes(upper)) return 'EA'
  if (raw === '米' || upper === 'M') return 'M'
  return 'EA'
}

export function mapBomSpec(item) {
  return String(item.model || item.desc || '').trim()
}

function sanitizeFilename(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '项目'
}

function clearDataRows(sheet) {
  const last = Math.max(sheet.rowCount || BOM_DATA_START, BOM_DATA_START)
  for (let r = BOM_DATA_START; r <= last; r += 1) {
    const row = sheet.getRow(r)
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.value = null
    })
  }
}

function copyRowStyle(sheet, fromRow, toRow) {
  const src = sheet.getRow(fromRow)
  const dest = sheet.getRow(toRow)
  src.eachCell({ includeEmpty: true }, (cell, col) => {
    dest.getCell(col).style = { ...cell.style }
  })
  if (src.height) dest.height = src.height
}

export function fillCompanyBomSheet(sheet, { project, user, items }) {
  sheet.getCell('C1').value = project.name || ''
  sheet.getCell('C2').value = project.number || ''
  sheet.getCell('C3').value = project.workOrder || ''
  sheet.getCell('F2').value = project.mechEngineer || ''
  sheet.getCell('F3').value = user?.name || ''
  sheet.getCell('L2').value = String(project.version || 'A').trim().toUpperCase() || 'A'

  clearDataRows(sheet)

  items.forEach((item, index) => {
    const rowNumber = BOM_DATA_START + index
    if (rowNumber > BOM_DATA_START) {
      copyRowStyle(sheet, BOM_DATA_START, rowNumber)
    }
    const row = sheet.getRow(rowNumber)
    row.getCell(1).value = index + 1
    row.getCell(5).value = item.orderNo || ''
    row.getCell(6).value = item.title || ''
    row.getCell(7).value = mapBomSpec(item)
    row.getCell(8).value = Number(item.qty) || 0
    row.getCell(9).value = mapBomUnit(item.unit)
    if (item.priceNum > 0) row.getCell(10).value = item.priceNum
    row.getCell(11).value = BOM_ITEM_TYPE
    row.getCell(12).value = item.brand || ''
  })
}

export async function exportCompanyBomXlsx({ project, user, items }) {
  const res = await fetch(BOM_TEMPLATE_URL)
  if (!res.ok) throw new Error('找不到公司 BOM 模板')
  const buffer = await res.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet(BOM_SHEET_NAME)
  if (!sheet) throw new Error('模板里没有 Equipment Innovation Center BOM 工作表')
  fillCompanyBomSheet(sheet, { project, user, items })
  const out = await workbook.xlsx.writeBuffer()
  downloadBlob(
    new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    bomFilename(project)
  )
}
