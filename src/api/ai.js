async function asJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `请求失败 ${res.status}`)
  }
  return data
}

export async function analyzeNeed({ need, planOrderNos }) {
  return asJson(
    await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ need, planOrderNos }),
    })
  )
}

export async function chatWithAssistant({ history, need, answers, planOrderNos }) {
  return asJson(
    await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, need, answers, planOrderNos }),
    })
  )
}

export async function proposeMaterials({ need, answers, planOrderNos }) {
  return asJson(
    await fetch('/api/ai/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ need, answers, planOrderNos }),
    })
  )
}
