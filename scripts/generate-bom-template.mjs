import ExcelJS from 'exceljs'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BOM_DATA_START, BOM_ITEM_TYPE, BOM_SHEET_NAME } from '../src/export/company-bom.js'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(rootDir, 'public', 'templates')
const outPath = join(outDir, 'eic-bom.xlsx')

mkdirSync(outDir, { recursive: true })

const wb = new ExcelJS.Workbook()
const sheet = wb.addWorksheet(BOM_SHEET_NAME)

sheet.getCell('A1').value = '项目名称 Program Name'
sheet.getCell('C1').value = ''
sheet.getCell('A2').value = '项目编号 Program Number'
sheet.getCell('C2').value = ''
sheet.getCell('A3').value = '工作令 Work Order'
sheet.getCell('C3').value = ''
sheet.getCell('E2').value = '机械工程师'
sheet.getCell('F2').value = ''
sheet.getCell('E3').value = '电气工程师'
sheet.getCell('F3').value = ''
sheet.getCell('K2').value = '版本 Version'
sheet.getCell('L2').value = 'A'

const header = sheet.getRow(BOM_DATA_START)
header.getCell(1).value = 'NO.'
header.getCell(3).value = 'Part No.'
header.getCell(5).value = 'Order/Norming No.'
header.getCell(6).value = 'Description'
header.getCell(7).value = 'Specification'
header.getCell(8).value = 'Qty'
header.getCell(9).value = 'Unit'
header.getCell(10).value = 'Price'
header.getCell(11).value = 'Item Type'
header.getCell(12).value = 'Brand'

const sample = sheet.getRow(BOM_DATA_START + 1)
sample.getCell(1).value = 1
sample.getCell(5).value = '示例-000001'
sample.getCell(6).value = '示例物料（导出时会被覆盖）'
sample.getCell(7).value = '规格型号'
sample.getCell(8).value = 1
sample.getCell(9).value = 'EA'
sample.getCell(11).value = BOM_ITEM_TYPE
sample.getCell(12).value = 'BRAND'

await wb.xlsx.writeFile(outPath)
console.log(`已生成 BOM 模板：${outPath}`)
