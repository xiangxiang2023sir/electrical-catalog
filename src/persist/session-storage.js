const USER_KEY = 'electrical-catalog-user-v1'
const PROJECT_KEY = 'electrical-catalog-project-v1'

export function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.name) return null
    return {
      name: String(data.name).trim(),
      staffId: String(data.staffId || '').trim(),
      role: String(data.role || '电气设计工程师').trim() || '电气设计工程师',
    }
  } catch {
    return null
  }
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
}

export function loadProject() {
  try {
    const raw = localStorage.getItem(PROJECT_KEY)
    if (!raw) return emptyProject()
    const data = JSON.parse(raw)
    return {
      name: String(data.name || '').trim(),
      number: String(data.number || '').trim(),
      workOrder: String(data.workOrder || '').trim(),
      mechEngineer: String(data.mechEngineer || '').trim(),
      version: normalizeVersion(data.version),
      changeNote: String(data.changeNote || '').trim(),
    }
  } catch {
    return emptyProject()
  }
}

export function saveProject(project) {
  localStorage.setItem(PROJECT_KEY, JSON.stringify(project))
}

export function emptyProject() {
  return {
    name: '',
    number: '',
    workOrder: '',
    mechEngineer: '',
    version: 'A',
    changeNote: '',
  }
}

function lettersFromIndex(n) {
  let i = Math.max(1, Math.floor(Number(n) || 1))
  let out = ''
  while (i > 0) {
    const r = (i - 1) % 26
    out = String.fromCharCode(65 + r) + out
    i = Math.floor((i - 1) / 26)
  }
  return out
}

export function normalizeVersion(raw) {
  const s = String(raw || '').trim()
  const numbered = s.match(/^v?\s*(\d+(?:\.\d+)?)$/i)
  if (numbered) {
    const tenths = Math.round(parseFloat(numbered[1]) * 10)
    return lettersFromIndex(Math.max(1, tenths - 9))
  }
  const letters = s.toUpperCase().replace(/[^A-Z]/g, '')
  return letters || 'A'
}

export function nextRevision(current) {
  const letters = normalizeVersion(current)
  let n = 0
  for (const c of letters) n = n * 26 + (c.charCodeAt(0) - 64)
  return lettersFromIndex(n + 1)
}
