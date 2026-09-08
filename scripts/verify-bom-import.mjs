import ExcelJS from 'exceljs'
import { fillCompanyBomSheet, BOM_SHEET_NAME } from '../src/export/company-bom.js'
import { parseBomWorkbook, parseBomCsv } from '../src/import/parse-bom.js'
import { getMaterialsByOrderNos } from '../server/catalog-db.js'

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile('public/templates/eic-bom.xlsx')
const sheet = wb.getWorksheet(BOM_SHEET_NAME)
const sample = [
  {
    orderNo: 'SIE-000140',
    title: '输入模块',
    model: '6ES7131-6BH01-0BA0',
    qty: 2,
    unit: 'EA',
    priceNum: 1,
    brand: 'SIE',
  },
  {
    orderNo: 'SIE-000138',
    title: '接口模块',
    model: '6ES7155-6AA01-0BN0',
    qty: 0,
    unit: 'EA',
    priceNum: 0,
    brand: 'SIE',
  },
  {
    orderNo: 'NOT-IN-CATALOG-999',
    title: '库外测试件',
    model: 'X-1',
    qty: 3,
    unit: 'EA',
    priceNum: 0,
    brand: 'TEST',
  },
]
fillCompanyBomSheet(sheet, {
  project: {
    name: '导入测试项目',
    number: '30000001',
    workOrder: '260001',
    mechEngineer: '测试机械',
    version: 'B',
  },
  user: { name: '纪祥祥' },
  items: sample,
})
const buf = await wb.xlsx.writeBuffer()
await wb.xlsx.writeFile('scripts/_bom-fill-check.xlsx')

const parsed = await parseBomWorkbook(buf)
const found = getMaterialsByOrderNos(parsed.lines.map((l) => l.orderNo))
const csv = parseBomCsv(
  '内部订货号,名称,品牌,型号,分类,单位,数量,单价\n"SIE-000140","输入","SIE","6ES7","电气","EA",4,"¥1"'
)

console.log(
  JSON.stringify(
    {
      project: parsed.project,
      lines: parsed.lines,
      lookup: found.map((i) => i.orderNo),
      csv,
    },
    null,
    2
  )
)
if (parsed.lines.length !== 3) throw new Error('应解析出 3 行')
if (parsed.lines.find((l) => l.orderNo === 'SIE-000138')?.qty !== 1) throw new Error('空数量应记为 1')
if (parsed.project.name !== '导入测试项目') throw new Error('项目名称未读出')
if (parsed.project.version !== 'B') throw new Error('版本未读出')
if (!found.some((i) => i.orderNo === 'SIE-000140')) throw new Error('库内订货号应对上')
if (csv.lines[0].qty !== 4) throw new Error('CSV 数量不对')
console.log('ok')
