import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseEnv(text) {
  const out = {}
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 1) continue
    const key = trimmed.slice(0, i).trim()
    let value = trimmed.slice(i + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function applyFile(file, overwrite) {
  if (!existsSync(file)) return
  const parsed = parseEnv(readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(parsed)) {
    if (!overwrite && process.env[key]) continue
    process.env[key] = value
  }
}

let loaded = false

export function loadLocalEnv() {
  if (loaded) return
  loaded = true
  applyFile(join(rootDir, '.env'), false)
  applyFile(join(rootDir, '.env.local'), true)
}
