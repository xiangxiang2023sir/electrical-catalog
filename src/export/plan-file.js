export function downloadBlob(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function exportPlanJson(list) {
  const payload = list.map((i) => ({
    内部订货号: i.orderNo,
    名称: i.title,
    品牌: i.brand,
    型号: i.model,
    分类: i.cat,
    单位: i.unit,
    数量: i.qty,
    单价: i.priceLabel,
  }))
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  downloadBlob(blob, 'plan.json')
}

export function exportPlanCsv(list) {
  const header = '内部订货号,名称,品牌,型号,分类,单位,数量,单价'
  const rows = list.map(
    (i) =>
      `"${i.orderNo}","${i.title}","${i.brand}","${i.model}","${i.cat}","${i.unit}",${i.qty},"${i.priceLabel}"`
  )
  const blob = new Blob(['\ufeff' + [header, ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  downloadBlob(blob, 'plan.csv')
}
