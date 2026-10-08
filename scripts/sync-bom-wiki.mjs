import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { parseBomWorkbook } from '../src/import/parse-bom.js'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const bomDir = join(rootDir, 'wiki', 'raw', 'bom')
const metaDir = join(rootDir, 'wiki', 'raw', 'projects')
const outDir = join(rootDir, 'wiki', 'wiki')

function readMeta(projectKey) {
  const path = join(metaDir, `${projectKey}.meta.md`)
  if (!existsSync(path)) return ''
  return readFileSync(path, 'utf8').trim()
}

function escCell(s) {
  return String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function projectBlock(project, fileName) {
  const lines = []
  if (project?.name) lines.push(`- 项目名称：${project.name}`)
  if (project?.number) lines.push(`- 项目编号：${project.number}`)
  if (project?.workOrder) lines.push(`- 工作令：${project.workOrder}`)
  if (project?.mechEngineer) lines.push(`- 机械工程师：${project.mechEngineer}`)
  if (project?.version) lines.push(`- BOM 版本：${project.version}`)
  if (!lines.length) lines.push(`- 来源文件：${fileName}`)
  return lines.join('\n')
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  if (!existsSync(bomDir)) {
    console.log('请先创建并放入 BOM：wiki/raw/bom/')
    process.exit(0)
  }

  const files = readdirSync(bomDir).filter((n) => /\.(xlsx|xlsm)$/i.test(n))
  if (!files.length) {
    console.log('wiki/raw/bom/ 里没有 xlsx，请放入标准 BOM 后再运行。')
    process.exit(0)
  }

  const summary = []
  for (const file of files) {
    const projectKey = basename(file).replace(/\.(xlsx|xlsm)$/i, '')
    const buffer = readFileSync(join(bomDir, file))
    let parsed
    try {
      parsed = await parseBomWorkbook(buffer)
    } catch (e) {
      summary.push({ project: projectKey, rows: 0, error: e.message || String(e) })
      continue
    }
    const rows = parsed.lines || []
    const meta = readMeta(projectKey)
    const now = new Date().toISOString()

    let md = `---\nproject: ${projectKey}\nsource: wiki/raw/bom/${file}\nsynced: ${now}\n---\n\n`
    md += `# 成熟 BOM 参考：${projectKey}\n\n`
    md += `> 助手对标类似项目时使用。推荐订货号须与 catalog.db 工具核对。\n\n`
    md += `## 项目信息（来自 BOM 表头）\n\n${projectBlock(parsed.project, file)}\n\n`
    if (meta) {
      md += `## 补充说明\n\n${meta}\n\n`
    }
    md += `## 物料清单（${rows.length} 条）\n\n`
    md += `| 订货号 | 名称 | 型号 | 品牌 | 数量 | 单位 |\n|--------|------|------|------|------|------|\n`
    for (const r of rows) {
      md += `| ${escCell(r.orderNo)} | ${escCell(r.title)} | ${escCell(r.model)} | ${escCell(r.brand)} | ${escCell(r.qty)} | ${escCell(r.unit)} |\n`
    }

    const outPath = join(outDir, `${projectKey}.md`)
    writeFileSync(outPath, md, 'utf8')
    summary.push({
      project: projectKey,
      rows: rows.length,
      out: outPath,
      hasMeta: Boolean(meta),
      projectName: parsed.project?.name || '',
    })
  }

  console.log(JSON.stringify({ synced: summary.filter((s) => !s.error).length, projects: summary }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
