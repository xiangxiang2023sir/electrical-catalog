const STORAGE_KEY = 'electrical-catalog-items-v1'
const LEGACY_KEY = 'ai-selection-catalog-v1'

export function loadSavedCatalog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return Array.isArray(data) && data.length ? data : null
  } catch {
    return null
  }
}

export function saveCatalog(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    console.error('保存物料库失败', e)
  }
}
