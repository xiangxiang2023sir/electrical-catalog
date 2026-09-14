export const CUSTOM_OPTION_ID = 'custom'

export const MATERIAL_CATEGORIES = [
  { id: 'relay', label: '继电器', need: '选型：继电器' },
  { id: 'contactor', label: '接触器', need: '选型：接触器' },
  { id: 'plc', label: 'PLC / 控制器', need: '选型：PLC' },
  { id: 'sensor', label: '传感器', need: '选型：传感器' },
  { id: 'breaker', label: '断路器', need: '选型：断路器' },
  { id: 'power', label: '开关电源', need: '选型：开关电源' },
  { id: 'safety', label: '急停 / 安全', need: '选型：急停安全' },
]

const SKIP_FILTER_LABELS = new Set(['不限', '未填', '这次先不要', '其他'])

const GREETING_RE =
  /^(你好|您好|嗨|在吗|在不在|hi|hello|hey|哈喽|早上好|下午好|晚上好|谢谢|多谢)[!！?？~\s,.，。]*$/i

/** 口语里常见的品类词 → 库内可能用的同义词（按优先级尝试） */
const KEYWORD_ALIASES = {
  显示器: ['显示器', '显示屏', '屏幕'],
  显示屏: ['显示屏', '显示器', '屏幕'],
  屏幕: ['屏幕', '显示器', '显示屏'],
  人机界面: ['人机界面', 'HMI', '触摸屏'],
  触摸屏: ['触摸屏', 'HMI', '人机界面'],
}

const EMBEDDED_PRODUCT_TERMS = [
  ...Object.keys(KEYWORD_ALIASES),
  ...MATERIAL_CATEGORIES.map((c) => c.need.replace(/^选型[：:]\s*/, '')),
  ...MATERIAL_CATEGORIES.map((c) => c.label.replace(/\s+/g, '')),
]

export function extractSearchKeywordCandidates(text) {
  const raw = String(text || '')
    .trim()
    .replace(/^选型[：:]\s*/, '')
    .replace(/[吧呢啊!！?？~]+$/u, '')
    .trim()
  if (!raw) return []

  for (const term of EMBEDDED_PRODUCT_TERMS) {
    if (!term) continue
    if (raw.includes(term)) {
      const aliases = KEYWORD_ALIASES[term] || [term]
      return [...new Set(aliases)]
    }
  }

  let stripped = raw
  let prev = ''
  while (prev !== stripped) {
    prev = stripped
    stripped = stripped
      .replace(/^(帮我|帮忙|给我|请|麻烦)?(选|找|要|需要|来)(一个|一款|个|款|下)?/u, '')
      .replace(/^(帮我|我要|我想要|想要)/u, '')
      .trim()
  }
  stripped = stripped.replace(/^(一个|一款|个|款)/u, '').trim()

  if (stripped && stripped !== raw) {
    const aliases = KEYWORD_ALIASES[stripped] || [stripped]
    return [...new Set(aliases)]
  }

  return [raw]
}

export function extractPrimaryKeyword(text) {
  return extractSearchKeywordCandidates(text)[0] || String(text || '').trim()
}

export function isGreeting(text) {
  return GREETING_RE.test(String(text || '').trim())
}

export function isSelectionIntent(text) {
  const t = String(text || '').trim()
  if (!t || isGreeting(t)) return false
  if (t.length >= 4) return true
  if (/选型|选料|bom|需要|帮我|想要|找|查/i.test(t)) return true
  return MATERIAL_CATEGORIES.some((cat) => {
    const keyword = cat.need.replace(/^选型[：:]\s*/, '')
    return t.includes(keyword) || t.includes(cat.label.replace(/\s+/g, ''))
  })
}

export function getCategoryById(categoryId) {
  return MATERIAL_CATEGORIES.find((c) => c.id === categoryId) || null
}

export function detectCategoryKey(need) {
  const text = String(need || '')
  for (const cat of MATERIAL_CATEGORIES) {
    if (text.includes(cat.need) || text.includes(cat.label)) return cat.id
  }
  return null
}

function answerLabel(step, row) {
  if (!row?.optionId) return ''
  if (row.optionId === CUSTOM_OPTION_ID) return String(row.custom || '').trim()
  const picked = step.options.find((o) => o.id === row.optionId)
  return picked?.label || ''
}

export function buildFilterQuery(need, steps, answers, { upToStepIndex = null } = {}) {
  const parts = []
  const needText = extractPrimaryKeyword(need)
  if (needText) parts.push(needText)
  const limit = upToStepIndex == null ? (steps || []).length - 1 : upToStepIndex
  for (let i = 0; i <= limit && i < (steps || []).length; i += 1) {
    const step = steps[i]
    const label = answerLabel(step, answers?.[step.id])
    if (label && !SKIP_FILTER_LABELS.has(label)) parts.push(label)
  }
  return parts.join(' ').trim()
}

export function emptyAnswers(steps) {
  return Object.fromEntries((steps || []).map((s) => [s.id, { optionId: '', custom: '' }]))
}

export function answersToPromptRows(steps, answers) {
  return (steps || []).map((step) => {
    const row = answers?.[step.id] || { optionId: '', custom: '' }
    const picked = step.options.find((o) => o.id === row.optionId)
    let value = ''
    if (row.optionId === CUSTOM_OPTION_ID) value = String(row.custom || '').trim()
    else if (picked) value = picked.label
    return { id: step.id, title: step.title, value: value || '未填' }
  })
}

export function wizardComplete(steps, answers) {
  if (!steps?.length) return false
  return steps.every((step) => {
    const row = answers?.[step.id]
    if (!row) return false
    if (row.optionId === CUSTOM_OPTION_ID) return Boolean(String(row.custom || '').trim())
    return Boolean(row.optionId)
  })
}
