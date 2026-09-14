import ExcelJS from 'exceljs'
import { fillCompanyBomSheet, BOM_SHEET_NAME } from '../src/export/company-bom.js'

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile('public/templates/eic-bom.xlsx')
const sheet = wb.getWorksheet(BOM_SHEET_NAME)
fillCompanyBomSheet(sheet, {
  project: {
    name: 'AGV小车负载600kg',
    number: '30034254',
    workOrder: '260110',
    mechEngineer: '陈子翌',
    version: 'A',
  },
  user: { name: '纪祥祥' },
  items: [
    {
      orderNo: 'DEMO-000001',
      title: '测试断路器',
      model: 'NSX100F-3P-63A',
      qty: 2,
      unit: 'EA',
      priceNum: 850,
      brand: 'SCHNEIDER',
    },
  ],
})
await wb.xlsx.writeFile('scripts/_bom-fill-check.xlsx')
const check = {
  C1: sheet.getCell('C1').value,
  C2: sheet.getCell('C2').value,
  C3: sheet.getCell('C3').value,
  F2: sheet.getCell('F2').value,
  F3: sheet.getCell('F3').value,
  L2: sheet.getCell('L2').value,
  A6: sheet.getCell('A6').value,
  E6: sheet.getCell('E6').value,
  F6: sheet.getCell('F6').value,
  G6: sheet.getCell('G6').value,
  H6: sheet.getCell('H6').value,
  I6: sheet.getCell('I6').value,
  J6: sheet.getCell('J6').value,
  K6: sheet.getCell('K6').value,
  L6: sheet.getCell('L6').value,
  M6: sheet.getCell('M6').value,
  A7: sheet.getCell('A7').value,
}
console.log(JSON.stringify(check, null, 2))
