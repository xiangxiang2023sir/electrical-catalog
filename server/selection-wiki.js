import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
export const wikiRoot = join(rootDir, 'wiki')
export const wikiPagesDir = join(wikiRoot, 'wiki')

const MAX_PAGES = 2
const MAX_CHARS_PER_PAGE = 2800
const MAX_TOTAL_CHARS = 5000

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/选型[：:]/g, ' ')
    .split(/[\s,，、/\\|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
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

  const picked = ranked.length ? ranked.slice(0, maxPages) : pages.slice(0, 1)
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
