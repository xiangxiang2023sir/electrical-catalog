import { getDb, getMaterial, updateMaterial } from '../server/catalog-db.js'

function idByOrder(orderNo) {
  const row = getDb()
    .prepare('SELECT id FROM materials WHERE order_no = ? COLLATE NOCASE')
    .get(orderNo)
  return row?.id
}

function patch(orderNo, fields) {
  const id = idByOrder(orderNo)
  if (!id) {
    console.log('missing', orderNo)
    return
  }
  const existing = getMaterial(id)
  const tags = [...new Set([...(existing.tags || []), ...(fields.tags || [])])]
  const result = updateMaterial(id, {
    ...existing,
    ...fields,
    tags,
    price: existing.price,
  })
  console.log(orderNo, result.ok ? 'updated' : result.error)
}

patch('WEIDMULLER-000002', {
  model: 'SAKDU 2.5N',
  desc: '魏德米勒直通端子 SAKDU 2.5N（订货号 1485790000）。额定截面 2.5mm²，额定电压 800V，额定电流 24A，螺钉接线，宽 5.5mm，导轨 TS35，灰色 PA66，UL94 V-0。资料来自 Weidmüller 官方样本。',
  tags: ['电气', '2.5mm²', '800V', '24A'],
  img: '/library-media/WEIDMULLER-000002.jpg',
})

patch('WEIDMULLER-000004', {
  model: 'SAKDU 4N',
  desc: '魏德米勒直通端子 SAKDU 4N（订货号 1485800000）。额定截面 4mm²，螺钉接线，导轨 TS35。资料来自 Weidmüller 官方产品页。',
  tags: ['电气', '4mm²'],
  img: '/library-media/WEIDMULLER-000004.webp',
})

patch('EATON-000014', {
  model: 'ZB65-65',
  desc: 'Eaton Moeller ZB65 热过载继电器，型号 ZB65-65，目录号 278460。整定电流 50–65A，1NO+1NC，直接安装于 DILM40–DILM65 接触器，CLASS 10A，防护 IP00。资料来自 Eaton 官方产品页。',
  tags: ['电气', '50-65A', 'CLASS10'],
})

patch('EATON-000076', {
  model: 'PKZM0-16',
  desc: 'Eaton Moeller PKZM0 电动机保护断路器，型号 PKZM0-16，目录号 046938。热磁保护，整定 10–16A，3极，螺钉接线，约 7.5kW（AC-3 400V），旋转手柄，导轨安装。资料来自 Eaton 官方产品页。',
  tags: ['电气', '10-16A', '3P'],
})
