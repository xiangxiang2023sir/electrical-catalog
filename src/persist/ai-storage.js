const AI_KEY = 'electrical-catalog-ai-v3'

function emptyThread() {
  return {
    need: '',
    brief: '',
    questions: [],
    answers: null,
    stepIndex: 0,
    summary: '',
    items: [],
    selected: [],
    messages: [],
  }
}

export function projectThreadKey(project) {
  const number = String(project?.number || '').trim()
  const workOrder = String(project?.workOrder || '').trim()
  if (!number && !workOrder) return '__none__'
  return `${number}::${workOrder}`
}

export function loadAiStore() {
  try {
    const raw = localStorage.getItem(AI_KEY)
    if (!raw) return { threads: {} }
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object' || typeof data.threads !== 'object') return { threads: {} }
    return { threads: data.threads }
  } catch {
    return { threads: {} }
  }
}

export function saveAiStore(payload) {
  localStorage.setItem(AI_KEY, JSON.stringify({ threads: payload.threads || {} }))
}

export function getThread(threads, key) {
  const row = threads?.[key]
  if (!row || typeof row !== 'object') return emptyThread()
  return {
    need: String(row.need || ''),
    brief: String(row.brief || ''),
    questions: Array.isArray(row.questions) ? row.questions : [],
    answers: row.answers && typeof row.answers === 'object' ? row.answers : null,
    stepIndex: Math.max(0, Number(row.stepIndex) || 0),
    summary: String(row.summary || ''),
    items: Array.isArray(row.items) ? row.items : [],
    selected: Array.isArray(row.selected) ? row.selected : [],
    messages: Array.isArray(row.messages) ? row.messages : [],
  }
}
