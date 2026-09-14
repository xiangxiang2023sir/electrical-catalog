import { listMaterials, lookupMaterials } from './catalog-db.js'
import {
  buildFilterQuery,
  detectCategoryKey,
  extractPrimaryKeyword,
  extractSearchKeywordCandidates,
} from '../src/ai/wizard-steps.js'

const MAX_SAMPLE = 400
const MAX_ITEMS = 20

const SIGNAL_PATTERNS = [
  { label: '24V DC', re: /24\s*V\s*D?C|D?C\s*24\s*V?|24V/i },
  { label: '220V AC', re: /220\s*V|AC\s*220/i },
  { label: '380V AC', re: /380\s*V|AC\s*380/i },
  { label: '12V DC', re: /12\s*V/i },
  { label: '5V DC', re: /5\s*V/i },
]

const RELAY_TYPE_PATTERNS = [
  { label: '固态继电器', re: /固态继电器/ },
  { label: '端子继电器', re: /端子继电器/ },
  { label: '安全继电器', re: /安全继电器/ },
  { label: '继电器模块', re: /继电器模块|IO模块.*DO/i },
]

const CONTACTOR_PATTERNS = [
  { label: '9A 及以下', re: /[^0-9]([1-9])A|9A/i },
  { label: '18~25A', re: /1[89]A|2[0-5]A/i },
  { label: '32~40A', re: /3[2-9]A|40A/i },
  { label: '50A 以上', re: /[5-9]\dA/i },
]

const DISPLAY_SIZE_PATTERNS = [
  { label: '21~22寸', re: /21\.5|22[英寸寸]?|SE2222|P2222/i },
  { label: '27寸', re: /27[英寸寸]?|P2726/i },
  { label: '17寸', re: /17[英寸寸]?/i },
  { label: '15寸及以下', re: /1[0-5][英寸寸]?/i },
]

function isDisplayKeyword(keyword) {
  return /显示器|显示屏|屏幕/i.test(String(keyword || ''))
}

function needKeyword(need) {
  return extractPrimaryKeyword(need)
}

function findCatalogMatch(need) {
  const candidates = extractSearchKeywordCandidates(need)
  const tried = []
  for (const keyword of candidates) {
    if (!keyword || tried.includes(keyword)) continue
    tried.push(keyword)
    const data = listMaterials({ q: keyword, page: 1, pageSize: MAX_SAMPLE })
    if (data.total > 0) {
      return { keyword, data, tried }
    }
  }
  const fallback = candidates[0] || String(need || '').trim()
  return {
    keyword: fallback,
    data: listMaterials({ q: fallback, page: 1, pageSize: MAX_SAMPLE }),
    tried,
  }
}

function countPatterns(items, patterns) {
  const counts = new Map()
  for (const item of items) {
    const blob = `${item.title} ${item.desc} ${item.model} ${item.cat}`
    for (const p of patterns) {
      if (p.re.test(blob)) {
        counts.set(p.label, (counts.get(p.label) || 0) + 1)
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

function countBrands(items) {
  const counts = new Map()
  for (const item of items) {
    const brand = String(item.brand || '').trim()
    if (!brand) continue
    const key = brand.toUpperCase()
    if (!counts.has(key)) counts.set(key, { label: brand, count: 0 })
    counts.get(key).count += 1
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}

export function catalogFacetsForQuery(q = '') {
  const { keyword, data } = findCatalogMatch(q)
  const categoryKey = detectCategoryKey(keyword) || detectCategoryKey(`选型：${keyword}`) || detectCategoryKey(q)
  const typePatterns =
    categoryKey === 'relay'
      ? RELAY_TYPE_PATTERNS
      : categoryKey === 'contactor'
        ? CONTACTOR_PATTERNS
        : isDisplayKeyword(keyword)
          ? DISPLAY_SIZE_PATTERNS
          : []
  return {
    keyword,
    categoryKey,
    total: data.total,
    sampleSize: data.items.length,
    brands: countBrands(data.items).slice(0, 6),
    signals: countPatterns(data.items, SIGNAL_PATTERNS).slice(0, 6),
    types: countPatterns(data.items, typePatterns).slice(0, 6),
  }
}

function optionsFromCounts(rows, prefix, { includeAny = true } = {}) {
  const opts = rows
    .filter((r) => r.count > 0)
    .slice(0, 5)
    .map((r, i) => ({ id: `${prefix}${i + 1}`, label: r.label }))
  if (includeAny && opts.length > 1) opts.push({ id: `${prefix}any`, label: '不限' })
  return opts
}

export function buildQuestionsFromFacets(facets, rawNeed = '') {
  if (!facets?.total) {
    const tried = extractSearchKeywordCandidates(rawNeed || facets?.keyword).join('、')
    return {
      brief: tried ? `库中没有与「${tried}」相关的物料，可换个说法或点上方品类` : '库中没有相关物料',
      questions: [],
    }
  }
  const questions = []

  if (facets.types?.length >= 2) {
    const opts = optionsFromCounts(facets.types, 't')
    if (opts.length >= 2) {
      questions.push({
        id: 'type',
        title: isDisplayKeyword(facets.keyword) ? '屏幕尺寸？' : '具体类型？',
        options: opts,
      })
    }
  }

  if (facets.signals?.length >= 2) {
    const opts = optionsFromCounts(facets.signals, 'v')
    if (opts.length >= 2) {
      questions.push({
        id: 'signal',
        title: '电压 / 线圈？',
        options: opts,
      })
    }
  } else if (facets.signals?.length === 1) {
    questions.push({
      id: 'signal',
      title: '电压 / 线圈？',
      options: [
        { id: 'v1', label: facets.signals[0].label },
        { id: 'vany', label: '不限' },
      ],
    })
  }

  if (facets.brands?.length >= 2) {
    const opts = optionsFromCounts(facets.brands, 'b')
    if (opts.length >= 2) {
      questions.push({
        id: 'brand',
        title: '品牌偏好？（库内现有）',
        options: opts,
      })
    }
  }

  const brief = `库内约 ${facets.total} 条「${facets.keyword}」相关物料，再确认 ${Math.min(questions.length, 4)} 项`
  return {
    brief,
    questions: questions.slice(0, 4),
  }
}

export function analyzeNeedFromCatalog(need) {
  const text = String(need || '').trim()
  const facets = catalogFacetsForQuery(text)
  const built = buildQuestionsFromFacets(facets, text)
  const meta = {
    fallback: false,
    catalogDriven: true,
    matchTotal: facets.total,
    resolvedKeyword: facets.keyword,
  }
  if (built.questions.length >= 2) {
    return { ...built, ...meta }
  }
  if (facets.total === 0) {
    return { ...built, ...meta, fallback: true, matchTotal: 0 }
  }
  return {
    brief: built.brief || `库内约 ${facets.total} 条，请补充更具体的需求`,
    questions: built.questions,
    ...meta,
    fallback: true,
  }
}

function rowsToAnswers(answers) {
  return Array.isArray(answers) ? answers : []
}

function answersToFilter(need, answers) {
  const rows = rowsToAnswers(answers)
  const steps = rows.map((r) => ({
    id: r.id,
    title: r.title,
    options: [{ id: 'picked', label: r.value }],
  }))
  const ans = Object.fromEntries(
    rows.map((r) => [r.id, { optionId: 'picked', custom: r.value === '未填' ? '' : r.value }])
  )
  return buildFilterQuery(need, steps, ans)
}

export function proposeFromCatalogSearch({ need, answers, planOrderNos, questions, answersMap }) {
  let q = ''
  if (questions?.length && answersMap) {
    q = buildFilterQuery(need, questions, answersMap)
  } else {
    q = answersToFilter(need, answers)
  }
  if (!q) q = needKeyword(need) || String(need || '').trim()

  const data = listMaterials({ q, page: 1, pageSize: MAX_ITEMS + 4 })
  const skip = new Set((Array.isArray(planOrderNos) ? planOrderNos : []).map((n) => String(n).toLowerCase()))
  const items = []
  for (const row of data.items) {
    if (items.length >= MAX_ITEMS) break
    const key = String(row.orderNo).toLowerCase()
    if (skip.has(key)) continue
    items.push({
      ...row,
      qty: 1,
      reason: '匹配筛选条件',
    })
  }

  const summary =
    items.length > 0
      ? `从库内 ${data.total} 条中推荐 ${items.length} 条`
      : data.total > 0
        ? `库内有 ${data.total} 条相关物料，但没有符合全部条件的；可改选「不限」再试`
        : '库中未找到合适物料'

  return { summary, items, reply: summary }
}
