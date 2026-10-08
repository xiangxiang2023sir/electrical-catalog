import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
export const wikiRoot = join(rootDir, 'wiki')
export const wikiPagesDir = join(wikiRoot, 'wiki')

const MAX_PAGES = 2
const MAX_CHARS_PER_PAGE = 2800
const MAX_TOTAL_CHARS = 5000

/** 中文整句无空格时也要能抽出「压机」「CPU」等，避免误选 Wiki 列表第一个项目 */
const WIKI_HINT_TERMS = [
  '标准2050',
  '单工位压机',
  '小压机',
  '包覆',
  '四转台',
  '锡焊',
  '超声波',
  '焊接机',
  '焊机',
  'welding',
  'lamination',
  '压机',
  '控制器',
  '触摸屏',
  'cpu',
  'plc',
  '260244',
  '260045',
  '260138',
  '260135',
  '260079',
  '260239',
  '230088',
]

function tokenize(text) {
  const raw = String(text || '').toLowerCase().replace(/选型[：:]/g, ' ')
  const tokens = new Set()
  for (const part of raw.split(/[\s,，、/\\|]+/)) {
    const t = part.trim()
    if (t.length >= 2) tokens.add(t)
  }
  for (const term of WIKI_HINT_TERMS) {
    if (raw.includes(term.toLowerCase())) tokens.add(term.toLowerCase())
  }
  return [...tokens]
}

function titlePenalty(pageTitle, tokens) {
  const title = String(pageTitle || '').toLowerCase()
  const wantPress = [...tokens].some((t) => /压机|2050|260244|260045|260138|包覆|小压/.test(t))
  const wantWeld = [...tokens].some((t) => /焊|welding|超声波|锡焊|230088/.test(t))
  let delta = 0
  if (wantPress && !wantWeld && /焊|welding|超声波/.test(title)) delta -= 40
  if (wantWeld && !wantPress && /压机|2050单工位/.test(title) && !/焊/.test(title)) delta -= 20
  return delta
}

function listMarkdownPages() {
  if (!existsSync(wikiPagesDir)) return []
  return readdirSync(wikiPagesDir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .map((name) => {
      const path = join(wikiPagesDir, name)
      if (!statSync(path).isFile()) return null
      const body = readFileSync(path, 'utf8')
      return { name, path, body, title: basename(name, '.md') }
    })
    .filter(Boolean)
}

function scorePage(page, tokens, rawNeed) {
  const hay = `${page.title}\n${page.body}`.toLowerCase()
  const need = String(rawNeed || '').toLowerCase()
  let score = 0
  for (const t of tokens) {
    if (page.title.toLowerCase().includes(t)) score += 8
    if (hay.includes(t)) score += 3
  }
  if (need.length >= 4 && page.title.toLowerCase().includes(need.slice(0, 20))) score += 5
  if (/类似|参考|对标|模板|项目/.test(need)) score += 1
  score += titlePenalty(page.title, tokens)
  return score
}

export function searchWikiPages(need, { maxPages = MAX_PAGES } = {}) {
  const pages = listMarkdownPages()
  if (!pages.length) return []

  const tokens = tokenize(need)
  const ranked = pages
    .map((p) => ({ ...p, score: scorePage(p, tokens, need) }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)

  // 无有效匹配时不要默认第一个 Wiki 页（曾导致「找压机」对标到焊机）
  const picked = ranked.length ? ranked.slice(0, maxPages) : []
  return picked.map(({ title, body, name, score }) => ({
    title,
    file: name,
    score,
    excerpt: body.length > MAX_CHARS_PER_PAGE ? `${body.slice(0, MAX_CHARS_PER_PAGE)}\n…（已截断）` : body,
  }))
}

export function formatWikiContextForPrompt(need) {
  const hits = searchWikiPages(need)
  if (!hits.length) {
    return {
      text: '',
      hits: [],
      hasWiki: listMarkdownPages().length > 0,
    }
  }

  let total = 0
  const parts = [
    '【成熟项目 Wiki 参考 — 先读此再查库】',
    '规则：Wiki 中的订货号仅作线索；最终推荐的 orderNo 必须来自 search_materials / lookup_order_nos 工具结果。',
  ]
  for (const h of hits) {
    if (total >= MAX_TOTAL_CHARS) break
    const chunk = `\n---\n### ${h.title}\n${h.excerpt}`
    parts.push(chunk.slice(0, MAX_TOTAL_CHARS - total))
    total += chunk.length
  }

  return {
    text: parts.join('\n'),
    hits: hits.map((h) => h.title),
    hasWiki: true,
  }
}
