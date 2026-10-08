# AI 选型助手与 Wiki 使用说明

路径均相对于 **项目根目录**（含 `package.json` 的 `electrical-catalog-github` 文件夹），与盘符、换哪台电脑无关。

---

## 一、助手能做什么

| 模式 | 条件 | 行为 |
|------|------|------|
| 读库补问 | 默认 | 按物料库统计品牌、参数，出选择题 |
| 读库选料 | 默认 | 按回答从 `library/catalog.db` 搜料 |
| 大模型选料 / 对话 | 右上角 **大模型登录** 且检测为绿 | 先读 **Wiki 成熟 BOM**（若有匹配），再 **工具查库**，再推荐 |

**铁律**：推荐的 **内部订货号** 必须来自物料库工具结果；Wiki 仅作「类似哪个项目、候选号与关键词」参考。

---

## 二、换电脑 / 同事使用要拷什么

| 内容 | 路径 | GitHub |
|------|------|--------|
| 程序 | 整仓 `git clone` | ✅ |
| 物料库 | `library/catalog.db`、`library/images/` | ❌ 需自行拷贝 |
| 标准 BOM | `wiki/raw/bom/*.xlsx` | ❌ |
| 项目说明 | `wiki/raw/projects/*.meta.md` | ❌ |
| 编译 Wiki | `wiki/wiki/*.md` | ❌ 可重新生成 |

新机步骤：

```bash
cd <任意路径>/electrical-catalog-github
npm install
npm run sync-bom-wiki
npm run dev
```

浏览器打开 http://127.0.0.1:5173/

---

## 三、Wiki 目录（成熟 BOM 知识）

```text
wiki/
  raw/bom/           ← 放公司电气 BOM（xlsx，第 6 行起有订货号）
  raw/projects/      ← 与 BOM 同名的 .meta.md（可选，强烈建议）
  wiki/              ← sync 自动生成，勿手改表格
  README.md
  AGENTS.md
```

### 1. 放 BOM

将 **Equipment Innovation Center BOM** 或兼容格式 xlsx 放入 `wiki/raw/bom/`。  
文件名建议含项目名，例如：`260244-标准2050单工位压机.xlsx`。

### 2. 写补充说明（可选）

复制 `wiki/raw/projects/_模板.meta.md` 为：

`wiki/raw/projects/<与 BOM 同名>.meta.md`

填写设备类型、电压、类似项目、品牌约束等。

新建 BOM 后若缺 meta 文件：

```bash
npm run scaffold-wiki-meta
```

### 3. 同步到 Wiki 页

```bash
npm run sync-bom-wiki
```

每个 xlsx 对应一篇 `wiki/wiki/<项目名>.md`，含表头项目信息与物料表。

---

## 四、在助手里怎么问

1. `npm run dev`，打开 **助手**。  
2. （建议）**大模型登录** → 保存并检测 → 按钮变 **绿**。  
3. 提问示例：

- `参考 260045 F03包覆小压机，帮我选 PLC 和触摸屏`
- `对标 260244 标准2050单工位压机，缺 24V 开关电源`
- `选型：接触器`（走品类快捷，不强调 Wiki）

读库模式下，若匹配到 Wiki，brief 中可能出现 **「已匹配 Wiki：…」**。

4. 确认推荐后 **加入方案**，在方案抽屉导出 BOM。

---

## 五、大模型登录

1. 助手页右上角 **大模型登录**  
2. 填写 API Key、Base URL、模型（如 DeepSeek：`deepseek-flash`）  
3. **保存并检测** → 绿 = 可用  

Key 保存在本机浏览器 localStorage，不上传 GitHub、不写入 `catalog.db`。

---

## 六、日常维护（让助手更准）

1. 新项目验收：BOM → `wiki/raw/bom/` → 填 `.meta.md` → `npm run sync-bom-wiki`  
2. 物料库：网页或 `import-order-nos` 保证 Wiki 里订货号在库内有描述  
3. BOM 更新：覆盖 xlsx 后重新 `sync-bom-wiki`  

---

## 七、推荐条数与「显示更多」

- 助手 **每轮** 向大模型要的结果仍 **最多 20 条**（控制速度与稳定性）。
- 若按当前需求在库内 **总数超过 20**，推荐列表下方会出现 **「显示更多」**，每次再加载 **20 条**（同一筛选条件，读库分页）。
- 大模型首轮精推仍 ≤20 条；继续加载走 **读库**，保证订货号来自 `catalog.db`。

---

## 八、相关命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动网页 |
| `npm run sync-bom-wiki` | BOM → `wiki/wiki/*.md` |
| `npm run scaffold-wiki-meta` | 为每个 BOM 创建空 `.meta.md`（不覆盖已有） |
| `npm run import-order-nos -- "清单.xlsx"` | 增量导入订货号到 catalog |

更多 Wiki 约定见 `wiki/README.md`。
