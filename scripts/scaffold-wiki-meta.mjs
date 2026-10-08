import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bomDir = join(root, 'wiki', 'raw', 'bom')
const metaDir = join(root, 'wiki', 'raw', 'projects')

const EMPTY_BODY = `<!-- 填写后执行：npm run sync-bom-wiki -->

- 设备类型：
- 主电压 / 控制电压：
- 一句话说明：

## 对标关系

- 类似项目：
- 差异说明：

## 选型注意

- 品牌 / 客户指定：
- 必含子系统（PLC / 安全 / HMI / …）：
- 其他：
`

const files = readdirSync(bomDir).filter((n) => /\.(xlsx|xlsm)$/i.test(n))
const created = []
for (const file of files) {
  const key = file.replace(/\.(xlsx|xlsm)$/i, '')
  const path = join(metaDir, `${key}.meta.md`)
  if (!existsSync(path)) {
    writeFileSync(path, EMPTY_BODY, 'utf8')
    created.push(`${key}.meta.md`)
  }
}
console.log(JSON.stringify({ created, totalBom: files.length }, null, 2))
