export function parsePrice(p) {
  if (p == null || p === '') return 0
  if (typeof p === 'number') return p
  const m = String(p).replace(/[¥,]/g, '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : 0
}

export function formatPrice(n) {
  if (!n || n <= 0) return ''
  return `¥${n.toLocaleString()}`
}

export function parseTags(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean)
  return String(tags || '')
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function normalizeItem(raw) {
  const model = raw.model || raw.spec_model || raw.skus?.[0]?.name || ''
  const priceNum = parsePrice(raw.price ?? raw.unit_price ?? raw.skus?.[0]?.price)
  return {
    id: raw.id,
    title: raw.title || raw.name_desc || raw.name || '未命名',
    cat: raw.cat || raw.category_name || '未分类',
    desc: raw.desc || '',
    brand: raw.brand || raw.brand_name || '',
    model,
    orderNo: raw.orderNo || raw.order_no || '',
    unit: raw.unit || 'EA',
    priceNum,
    priceLabel: formatPrice(priceNum),
    tags: parseTags(raw.tags),
    img: raw.img || '',
  }
}

export function displayCat(cat) {
  return String(cat || '').replace(/^\d+\./, '')
}

export const PLACEHOLDER_IMG =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23f0f0f0" width="200" height="150"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E暂无图%3C/text%3E%3C/svg%3E'
