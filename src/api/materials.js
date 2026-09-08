import { normalizeItem } from '../domain/material.js'

async function asJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `请求失败 ${res.status}`)
    err.payload = data
    throw err
  }
  return data
}

export async function fetchCategories() {
  const data = await asJson(await fetch('/api/catalog/categories'))
  const categories = data.categories || []
  return {
    total: data.total || 0,
    names: ['全部', ...categories.map((c) => c.name)],
    counts: Object.fromEntries(categories.map((c) => [c.name, c.count])),
  }
}

export async function fetchMaterialsPage({ page, pageSize, q, cat }) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (q?.trim()) params.set('q', q.trim())
  if (cat && cat !== '全部') params.set('cat', cat)
  const data = await asJson(await fetch(`/api/catalog/items?${params}`))
  return {
    items: (data.items || []).map((m) => normalizeItem(m)),
    total: data.total || 0,
  }
}

export async function fetchMaterial(id) {
  const data = await asJson(await fetch(`/api/catalog/items/${id}`))
  return normalizeItem(data.item)
}

export async function lookupMaterialsByOrderNos(orderNos, models = []) {
  const data = await asJson(
    await fetch('/api/catalog/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNos, models }),
    })
  )
  return (data.items || []).map((m) => normalizeItem(m))
}

export async function createMaterial(payload) {
  const res = await fetch('/api/catalog/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) return { ok: false, error: data.error || '保存失败' }
  return { ok: true, item: normalizeItem(data.item) }
}

export async function updateMaterial(id, payload) {
  const res = await fetch(`/api/catalog/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) return { ok: false, error: data.error || '保存失败' }
  return { ok: true, item: normalizeItem(data.item) }
}

export async function deleteMaterial(id) {
  const res = await fetch(`/api/catalog/items/${id}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) return { ok: false, error: data.error || '删除失败' }
  return { ok: true }
}
