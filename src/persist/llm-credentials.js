const STORAGE_KEY = 'electrical-catalog-llm-v1'

export const LLM_DEFAULTS = {
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-flash',
}

export function loadLlmCredentials() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const apiKey = String(data?.apiKey || '').trim()
    if (!apiKey) return null
    return {
      apiKey,
      baseUrl: String(data?.baseUrl || LLM_DEFAULTS.baseUrl).trim() || LLM_DEFAULTS.baseUrl,
      model: String(data?.model || LLM_DEFAULTS.model).trim() || LLM_DEFAULTS.model,
    }
  } catch {
    return null
  }
}

export function saveLlmCredentials({ apiKey, baseUrl, model }) {
  const key = String(apiKey || '').trim()
  if (!key) return { ok: false, error: '请填写 API Key' }
  const row = {
    apiKey: key,
    baseUrl: String(baseUrl || LLM_DEFAULTS.baseUrl).trim() || LLM_DEFAULTS.baseUrl,
    model: String(model || LLM_DEFAULTS.model).trim() || LLM_DEFAULTS.model,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(row))
  return { ok: true, cred: row }
}

export function clearLlmCredentials() {
  localStorage.removeItem(STORAGE_KEY)
}

export function maskApiKey(apiKey) {
  const key = String(apiKey || '').trim()
  if (key.length <= 8) return '已配置'
  return `${key.slice(0, 3)}…${key.slice(-4)}`
}
