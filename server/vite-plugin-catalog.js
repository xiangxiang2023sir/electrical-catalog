import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import {
  createMaterial,
  deleteMaterial,
  getMaterial,
  lookupMaterials,
  imagesDir,
  listCategories,
  listMaterials,
  seedDemoIfEmpty,
  updateMaterial,
} from './catalog-db.js'
import { analyzeNeed, proposeFromAnswers, chatTurn } from './ai-chat.js'

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(json)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(Object.assign(new Error('JSON 无效'), { expose: true }))
      }
    })
    req.on('error', reject)
  })
}

function serveImage(req, res, url) {
  const name = decodeURIComponent(url.pathname.replace(/^\/library-media\/?/, ''))
  if (!name || name.includes('..') || name.includes(sep) || name.includes('/')) {
    res.statusCode = 400
    res.end()
    return true
  }
  const file = join(imagesDir, name)
  const resolved = normalize(file)
  if (!resolved.startsWith(normalize(imagesDir))) {
    res.statusCode = 403
    res.end()
    return true
  }
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    res.statusCode = 404
    res.end()
    return true
  }
  res.statusCode = 200
  res.setHeader('Content-Type', MIME[extname(resolved).toLowerCase()] || 'application/octet-stream')
  createReadStream(resolved).pipe(res)
  return true
}

async function handleCatalog(req, res, url) {
  const method = req.method || 'GET'
  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  // ['api', 'catalog', ...]
  const rest = parts.slice(2)

  if (method === 'GET' && rest.length === 1 && rest[0] === 'categories') {
    const data = listCategories()
    sendJson(res, 200, data)
    return
  }

  if (method === 'POST' && rest.length === 1 && rest[0] === 'lookup') {
    const body = await readJsonBody(req)
    const items = lookupMaterials({
      orderNos: body.orderNos || body.order_nos || [],
      models: body.models || [],
    })
    sendJson(res, 200, { items })
    return
  }

  if (method === 'GET' && rest.length === 1 && rest[0] === 'items') {
    const data = listMaterials({
      q: url.searchParams.get('q') || '',
      cat: url.searchParams.get('cat') || '',
      page: url.searchParams.get('page') || 1,
      pageSize: url.searchParams.get('pageSize') || url.searchParams.get('page_size') || 48,
    })
    sendJson(res, 200, data)
    return
  }

  if (method === 'GET' && rest.length === 2 && rest[0] === 'items') {
    const item = getMaterial(rest[1])
    if (!item) {
      sendJson(res, 404, { error: '物料不存在' })
      return
    }
    sendJson(res, 200, { item })
    return
  }

  if (method === 'POST' && rest.length === 1 && rest[0] === 'items') {
    const body = await readJsonBody(req)
    const result = createMaterial(body)
    sendJson(res, result.ok ? 201 : 409, result)
    return
  }

  if (method === 'PUT' && rest.length === 2 && rest[0] === 'items') {
    const body = await readJsonBody(req)
    const result = updateMaterial(rest[1], body)
    sendJson(res, result.ok ? 200 : result.error === '要改的物料不在库里' ? 404 : 409, result)
    return
  }

  if (method === 'DELETE' && rest.length === 2 && rest[0] === 'items') {
    const result = deleteMaterial(rest[1])
    sendJson(res, result.ok ? 200 : 404, result)
    return
  }

  sendJson(res, 404, { error: '接口不存在' })
}

async function handleAi(req, res, url) {
  const method = req.method || 'GET'
  const path = url.pathname.replace(/\/+$/, '')
  if (method === 'POST' && path === '/api/ai/analyze') {
    const body = await readJsonBody(req)
    const result = await analyzeNeed({
      need: body.need || '',
      planOrderNos: body.planOrderNos || body.plan_order_nos || [],
    })
    sendJson(res, 200, result)
    return
  }
  if (method === 'POST' && path === '/api/ai/propose') {
    const body = await readJsonBody(req)
    const result = await proposeFromAnswers({
      need: body.need || '',
      answers: body.answers || [],
      planOrderNos: body.planOrderNos || body.plan_order_nos || [],
    })
    sendJson(res, 200, result)
    return
  }
  if (method === 'POST' && path === '/api/ai/chat') {
    const body = await readJsonBody(req)
    const result = await chatTurn({
      history: body.history || body.messages || [],
      need: body.need || '',
      answers: body.answers || [],
      planOrderNos: body.planOrderNos || body.plan_order_nos || [],
    })
    sendJson(res, 200, result)
    return
  }
  sendJson(res, 404, { error: '接口不存在' })
}

export function catalogMiddleware(req, res, next) {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname.startsWith('/library-media/')) {
    serveImage(req, res, url)
    return
  }
  const isCatalog = url.pathname.startsWith('/api/catalog')
  const isAi = url.pathname.startsWith('/api/ai')
  if (!isCatalog && !isAi) {
    next()
    return
  }

  Promise.resolve()
    .then(() => seedDemoIfEmpty())
    .then(() => (isAi ? handleAi(req, res, url) : handleCatalog(req, res, url)))
    .catch((e) => {
      const expose =
        e.expose ||
        e.message === '请填写内部订货号（与公司表一致）' ||
        e.message === '请填写名称'
      sendJson(res, expose ? 400 : 500, { ok: false, error: expose ? e.message : isAi ? '助手出错' : '物料库出错' })
      if (!expose) console.error(e)
    })
}

export function catalogApiPlugin() {
  return {
    name: 'electrical-catalog-api',
    configureServer(server) {
      server.middlewares.use(catalogMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(catalogMiddleware)
    },
  }
}
