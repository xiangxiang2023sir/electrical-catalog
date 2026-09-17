import { listMaterials, lookupMaterials } from './catalog-db.js'
import {
  analyzeNeedFromCatalog,
  catalogFacetsForQuery,
  proposeFromCatalogSearch,
} from './catalog-facets.js'
const REQUEST_MS = 35_000
const ANALYZE_MS = 20_000
const MAX_TOOL_ROUNDS = 2
const MAX_ITEMS = 20

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_materials',
      description: '按关键词搜索本公司物料库，返回内部订货号。',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: '名称、型号、品牌或订货号关键词' },
          cat: { type: 'string', description: '电气 或 机械，可空' },
        },
        required: ['q'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_order_nos',
      description: '按内部订货号核对物料是否在库。',
      parameters: {
        type: 'object',
        properties: {
          orderNos: { type: 'array', items: { type: 'string' } },
        },
        required: ['orderNos'],
      },
    },
  },
]

const ANALYZE_SYSTEM = `你是电气选型顾问。根据用户需求，找出还缺的关键信息，用于逐步缩小物料库范围。
只输出 JSON：{"brief":"不超过40字","questions":[{"id":"q1","title":"问句","options":[{"id":"a","label":"选项"}]}]}
2到4个问题，每题2到6个短选项。不要问已经说清的事。中文、短。不要推荐订货号。

规则：
- 若需求以「选型：」开头或是单品类选型（继电器、接触器、PLC、传感器、断路器、开关电源、急停安全等），只问该品类关键参数（电压、触点/极数、电流、品牌、安装方式等），不要问「做什么设备」等整机问题。
- 继电器：优先问线圈电压、触点形式/路数、品牌。
- 接触器：优先问线圈电压、主触点电流、品牌。
- PLC：优先问 I/O 规模、通讯接口、品牌。
- 传感器：优先问类型、输出形式、品牌。
- 断路器：优先问极数、额定电流、品牌。
- 开关电源：优先问输出电压、功率、品牌。
- 急停/安全：优先问类型、安全等级、品牌。
- 若是整机/项目描述（如 AGV、产线、电柜），才问设备类型、主电压、品牌偏好、安全需求等。`

const PROPOSE_SYSTEM = `你是电气物料选型助手。只能用工具查本公司库。
最终只输出 JSON：{"summary":"不超过40字","items":[{"orderNo":"订货号","qty":1,"reason":"不超过20字"}]}
最多 ${MAX_ITEMS} 条。orderNo 必须来自工具结果。不要编造。库中没有就 items=[]。中文、短。`

function slim(item) {
  return {
    orderNo: item.orderNo,
    title: item.title,
    cat: item.cat,
    brand: item.brand,
    model: item.model,
  }
}

function runTool(name, args) {
  if (name === 'search_materials') {
    const q = String(args.q || '').trim()
    if (!q) return { items: [] }
    const cat = String(args.cat || '').trim()
    const data = listMaterials({ q, cat, page: 1, pageSize: MAX_ITEMS })
    return { items: data.items.map(slim) }
  }
  if (name === 'lookup_order_nos') {
    const orderNos = Array.isArray(args.orderNos) ? args.orderNos : []
    return { items: lookupMaterials({ orderNos: orderNos.slice(0, 20) }).map(slim) }
  }
  return { error: '未知工具' }
}

function parseArgs(raw) {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function extractJson(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1].trim() : raw
  try {
    return JSON.parse(body)
  } catch {
    const start = body.indexOf('{')
    const end = body.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(body.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function resolveConfig(llm) {
  const apiKey = String(llm?.apiKey || '').trim()
  if (!apiKey) return null
  return {
    apiKey,
    baseUrl: String(llm?.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: String(llm?.model || 'gpt-4o-mini').trim(),
  }
}

function requireKey(llm) {
  const cfg = resolveConfig(llm)
  if (!cfg) {
    const err = new Error('请先在助手右上角「大模型登录」填入你自己的 API Key。')
    err.expose = true
    throw err
  }
  return cfg
}

function messageText(msg) {
  if (!msg) return ''
  let main = ''
  if (typeof msg.content === 'string') main = msg.content
  else if (Array.isArray(msg.content)) {
    main = msg.content.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('')
  }
  if (String(main).trim()) return main
  return String(msg.reasoning_content || '')
}

async function chatCompletions({ baseUrl, apiKey, model, messages, tools, toolChoice, maxTokens }, signal) {
  const body = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: maxTokens || 800,
  }
  if (String(baseUrl).includes('deepseek')) {
    body.thinking = { type: 'disabled' }
  }
  if (tools) {
    body.tools = tools
    body.tool_choice = toolChoice || 'auto'
  }
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data.error?.message || data.message || `HTTP ${res.status}`
    const err = new Error(`模型接口失败：${detail}`)
    err.expose = true
    throw err
  }
  return data
}

function withTimeout(ms) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ms)
  return { signal: ac.signal, done: () => clearTimeout(timer) }
}

function normalizeQuestions(parsed) {
  const list = Array.isArray(parsed?.questions) ? parsed.questions : []
  const out = []
  const seen = new Set()
  for (const q of list) {
    if (out.length >= 4) break
    const title = String(q?.title || '').trim().slice(0, 40)
    if (!title) continue
    const opts = []
    const optSeen = new Set()
    for (const o of Array.isArray(q?.options) ? q.options : []) {
      if (opts.length >= 6) break
      const label = String(o?.label || '').trim().slice(0, 24)
      if (!label) continue
      let id = String(o?.id || `o${opts.length + 1}`).replace(/[^\w-]/g, '').slice(0, 20)
      if (!id || optSeen.has(id)) id = `o${opts.length + 1}`
      optSeen.add(id)
      opts.push({ id, label })
    }
    if (opts.length < 2) continue
    let id = String(q?.id || `q${out.length + 1}`).replace(/[^\w-]/g, '').slice(0, 20)
    if (!id || seen.has(id)) id = `q${out.length + 1}`
    seen.add(id)
    out.push({ id, title, options: opts })
  }
  return out
}

function hydrateItems(parsed, alreadyInPlan) {
  const requested = Array.isArray(parsed?.items) ? parsed.items : []
  const orderNos = requested.map((row) => String(row?.orderNo || '').trim()).filter(Boolean)
  const found = lookupMaterials({ orderNos })
  const byNo = new Map(found.map((item) => [String(item.orderNo).toLowerCase(), item]))
  const skip = new Set(alreadyInPlan.map((n) => String(n).toLowerCase()))
  const items = []
  const seen = new Set()
  for (const row of requested) {
    if (items.length >= MAX_ITEMS) break
    const orderNo = String(row?.orderNo || '').trim()
    const key = orderNo.toLowerCase()
    if (!orderNo || seen.has(key) || skip.has(key)) continue
    const material = byNo.get(key)
    if (!material) continue
    seen.add(key)
    items.push({
      ...material,
      qty: Math.max(1, Math.min(99, Math.floor(Number(row.qty) || 1))),
      reason: String(row.reason || '').trim().slice(0, 40),
    })
  }
  const summary = String(parsed?.summary || '').trim().slice(0, 80)
  return {
    summary: summary || (items.length ? `建议 ${items.length} 条` : '库中未找到合适物料'),
    items,
  }
}

function abortError(label) {
  const err = new Error(`${label}超过时限，请稍后再试`)
  err.expose = true
  return err
}

export async function analyzeNeed({ need, planOrderNos, llm }) {
  const text = String(need || '').trim()
  if (text.length < 4) {
    const err = new Error('请先写清楚需求，至少几个字')
    err.expose = true
    throw err
  }

  const catalogResult = analyzeNeedFromCatalog(text)
  if (catalogResult.questions.length >= 2 || catalogResult.matchTotal === 0) {
    return { ...catalogResult, engine: 'catalog' }
  }

  const cfg = resolveConfig(llm)
  if (!cfg) return { ...catalogResult, engine: 'catalog' }

  const facets = catalogFacetsForQuery(text)
  const already = (Array.isArray(planOrderNos) ? planOrderNos : []).map(String).filter(Boolean).slice(0, 40)
  const catalogHint = [
    `库内共 ${facets.total} 条匹配「${facets.keyword}」`,
    facets.brands.length
      ? `品牌（库内）：${facets.brands.map((b) => `${b.label}(${b.count})`).join('、')}`
      : '',
    facets.signals.length
      ? `常见电压/参数：${facets.signals.map((s) => `${s.label}(${s.count})`).join('、')}`
      : '',
    facets.types.length ? `常见类型：${facets.types.map((t) => `${t.label}(${t.count})`).join('、')}` : '',
    '补问选项必须来自上面库内数据，不要编造库里没有的品牌或参数。',
  ]
    .filter(Boolean)
    .join('\n')

  const userText = [
    `需求：${text}`,
    catalogHint,
    already.length ? `方案里已有订货号：${already.join('、')}` : '方案目前是空的。',
    '请输出 JSON。',
  ].join('\n')

  const wait = withTimeout(ANALYZE_MS)
  try {
    const data = await chatCompletions(
      {
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
        messages: [
          { role: 'system', content: ANALYZE_SYSTEM },
          { role: 'user', content: userText },
        ],
        maxTokens: 700,
      },
      wait.signal
    )
    const parsed = extractJson(messageText(data.choices?.[0]?.message))
    const questions = normalizeQuestions(parsed)
    const brief = String(parsed?.brief || '').trim().slice(0, 80)
    if (questions.length >= 2) {
      return { brief: brief || catalogResult.brief, questions, fallback: false, catalogDriven: false, engine: 'llm' }
    }
    return { ...catalogResult, engine: 'catalog' }
  } catch (e) {
    if (e.name === 'AbortError') throw abortError('分析')
    return { ...catalogResult, engine: 'catalog' }
  } finally {
    wait.done()
  }
}

const CHAT_SYSTEM = `你是电气选型助手，用中文短句对话。需要查料时用工具搜本公司库。
最终只输出 JSON：{"reply":"不超过80字","items":[{"orderNo":"订货号","qty":1,"reason":"不超过20字"}]}
没有可推荐的料就 items=[]。orderNo 必须来自工具。不要编造。不要改用户 BOM。`

async function runJsonToolLoop({ apiKey, baseUrl, model, system, userMessages, already, wait }) {
  const messages = [{ role: 'system', content: system }, ...userMessages]
  for (let round = 0; round <= MAX_TOOL_ROUNDS + 1; round += 1) {
    const useTools = round < MAX_TOOL_ROUNDS
    const data = await chatCompletions(
      {
        baseUrl,
        apiKey,
        model,
        messages,
        tools: useTools ? TOOLS : undefined,
        toolChoice: useTools ? 'auto' : undefined,
        maxTokens: 1600,
      },
      wait.signal
    )
    const msg = data.choices?.[0]?.message
    if (!msg) {
      const err = new Error('模型没有返回内容')
      err.expose = true
      throw err
    }
    messages.push(msg)
    const calls = msg.tool_calls
    if (Array.isArray(calls) && calls.length) {
      if (useTools) {
        // 必须为每一个 tool_call 补一条 tool 响应，否则下一轮会报
        // "assistant message with 'tool_calls' must be followed by tool messages"
        for (const call of calls) {
          const name = call.function?.name
          const result = runTool(name, parseArgs(call.function?.arguments))
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          })
        }
        continue
      }
      // 已关闭工具阶段模型仍返回 tool_calls：把孤儿 tool_calls 剥离，避免接口报错
      delete messages[messages.length - 1].tool_calls
    }
    const parsed = extractJson(messageText(msg))
    if (!parsed) {
      messages.push({ role: 'user', content: '只输出 JSON，不要其它文字。' })
      continue
    }
    const hydrated = hydrateItems(
      { summary: parsed.summary || parsed.reply, items: parsed.items },
      already
    )
    return {
      ...hydrated,
      reply: String(parsed.reply || parsed.summary || hydrated.summary || '').trim().slice(0, 200),
      engine: 'llm',
    }
  }
  const err = new Error('对话超时，请再试一次')
  err.expose = true
  throw err
}

export async function proposeFromAnswers({ need, answers, planOrderNos, questions, answersMap, llm }) {
  const rows = Array.isArray(answers) ? answers : []
  const already = (Array.isArray(planOrderNos) ? planOrderNos : []).map(String).filter(Boolean).slice(0, 80)
  const catalogFallback = () => ({
    ...proposeFromCatalogSearch({ need, answers, planOrderNos, questions, answersMap }),
    engine: 'catalog',
  })

  const cfg = resolveConfig(llm)
  if (!cfg) return catalogFallback()

  const facets = catalogFacetsForQuery(need)
  const userText = [
    `原始需求：${String(need || '').trim() || '未写'}`,
    '补充问答：',
    ...rows.map((r) => `- ${r.title || r.id}：${r.value || '未填'}`),
    facets.total
      ? `库内约 ${facets.total} 条相关物料；品牌含 ${facets.brands.map((b) => b.label).slice(0, 6).join('、') || '多种'}`
      : '',
    already.length ? `方案里已有订货号（不要再推荐）：${already.join('、')}` : '方案目前是空的。',
    '请先搜库，再输出 JSON。orderNo 必须来自工具结果。',
  ].join('\n')

  const wait = withTimeout(REQUEST_MS)
  try {
    const result = await runJsonToolLoop({
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      system: PROPOSE_SYSTEM,
      userMessages: [{ role: 'user', content: userText }],
      already,
      wait,
    })
    if (result.items?.length) return { ...result, engine: 'llm' }
    return catalogFallback()
  } catch (e) {
    if (e.name === 'AbortError') throw abortError('选料')
    return catalogFallback()
  } finally {
    wait.done()
  }
}

export async function verifyLlm(llm) {
  const cfg = resolveConfig(llm)
  if (!cfg) {
    const err = new Error('请先填写 API Key')
    err.expose = true
    throw err
  }
  const wait = withTimeout(12_000)
  try {
    await chatCompletions(
      {
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 8,
      },
      wait.signal
    )
    return { ok: true }
  } catch (e) {
    if (e.name === 'AbortError') {
      return { ok: false, error: '连接超时，请检查接口地址与网络' }
    }
    return { ok: false, error: e.message || '模型接口失败' }
  } finally {
    wait.done()
  }
}

export async function chatTurn({ history, need, answers, planOrderNos, llm }) {
  const { apiKey, baseUrl, model } = requireKey(llm)
  const already = (Array.isArray(planOrderNos) ? planOrderNos : []).map(String).filter(Boolean).slice(0, 80)
  const rows = Array.isArray(answers) ? answers : []
  const prior = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .slice(-10)
    .map((m) => ({
      role: m.role,
      content: String(m.content || '').trim().slice(0, 300),
    }))
  if (!prior.length) {
    const err = new Error('请先输入要说的话')
    err.expose = true
    throw err
  }
  const context = [
    `原始需求：${String(need || '').trim() || '未写'}`,
    rows.length ? `已回答：${rows.map((r) => `${r.title}=${r.value}`).join('；')}` : '',
    already.length ? `方案已有订货号：${already.join('、')}` : '方案目前是空的。',
  ]
    .filter(Boolean)
    .join('\n')

  const wait = withTimeout(REQUEST_MS)
  try {
    return await runJsonToolLoop({
      apiKey,
      baseUrl,
      model,
      system: CHAT_SYSTEM,
      userMessages: [{ role: 'user', content: context }, ...prior],
      already,
      wait,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw abortError('对话')
    throw e
  } finally {
    wait.done()
  }
}

