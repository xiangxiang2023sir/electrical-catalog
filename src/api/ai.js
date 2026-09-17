import { loadLlmCredentials } from '../persist/llm-credentials.js'

async function asJson(res, { allowErrorBody = false } = {}) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok && !allowErrorBody) {
    throw new Error(data.error || `请求失败 ${res.status}`)
  }
  return data
}

function withLlm(body) {
  const llm = loadLlmCredentials()
  return llm ? { ...body, llm } : body
}

export async function analyzeNeed({ need, planOrderNos }) {
  return asJson(
    await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withLlm({ need, planOrderNos })),
    })
  )
}

export async function chatWithAssistant({ history, need, answers, planOrderNos }) {
  return asJson(
    await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withLlm({ history, need, answers, planOrderNos })),
    })
  )
}

export async function proposeMaterials({ need, answers, planOrderNos, questions, answersMap }) {
  return asJson(
    await fetch('/api/ai/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withLlm({ need, answers, planOrderNos, questions, answersMap })),
    })
  )
}

export async function verifyLlmConnection(llm) {
  return asJson(
    await fetch('/api/ai/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ llm }),
    }),
    { allowErrorBody: true }
  )
}
