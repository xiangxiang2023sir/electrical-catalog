const PLAN_KEY = 'electrical-catalog-plan-v1'

export function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
      .map((row) => {
        const item = row?.item || row
        const qty = Math.max(1, Math.floor(Number(row?.qty) || 1))
        if (!item || item.id == null) return null
        return { id: String(item.id), qty, item }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

export function savePlan(entries) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(entries))
}

export function clearSavedPlan() {
  localStorage.removeItem(PLAN_KEY)
}
