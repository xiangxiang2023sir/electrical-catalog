# 选型 Wiki（成熟 BOM 参考）

路径均相对 **项目根目录**（`electrical-catalog-github/`），换电脑只需把整个项目拷到任意盘符，或 `git clone` 后再拷 `wiki/` 与 `library/`。

助手流程：**先读这里编译出的 Wiki 页 → 再用工具查 `catalog.db` → 再推荐**。

完整步骤见 **`docs/AI助手与Wiki使用说明.md`**。

## 你要放文件的地方

### 1. 原始 BOM（你来放）

```
wiki/raw/bom/
  某某项目-标准电柜.xlsx
  另一条线-AGV.xlsx
```

- 支持 `.xlsx` / `.xls`（和公司物料表类似，需有 **订货号** 列）
- 文件名建议带 **项目/产线名**，会用来生成 Wiki 页标题
- **勿提交 GitHub**（已在 `.gitignore`），仅本机或内网共享盘

### 2. 可选：项目补充说明（强烈建议，帮助「进化」）

```
wiki/raw/projects/
  某某项目-标准电柜.meta.md
```

与 BOM **同名**（仅扩展名不同），用几行字写 BOM 里说不清的信息，例如：

- 设备类型、电压、控制方式
- 和哪条产线类似 / 差异点
- 哪些件是客户指定品牌

**只有 BOM 也够用**；有 `.meta.md` 时助手对标项目更准，你后期维护更轻松。

### 3. 给助手读的 Wiki 页（自动生成，勿手改）

```
wiki/wiki/
  某某项目-标准电柜.md
```

放完 BOM 后在本项目根目录执行：

```bash
npm run sync-bom-wiki
```

已为每个 BOM 建好空的 `wiki/raw/projects/<同名>.meta.md`，填写说明可参考 `wiki/raw/projects/_模板.meta.md`。

会把 `raw/bom` 里每个 Excel 转成一篇 Markdown，助手运行时 **按关键词检索这些页**。

## 对「AI 进化」有没有帮助？

| 你提供的 | 作用 |
|----------|------|
| 仅 BOM + 文件名/表内项目信息 | ✅ 能对标 **「某某项目用了哪些订货号」**，查库推荐 |
| 再加 `.meta.md` 工况说明 | ✅✅ 能对标 **「类似工况选哪套结构」**，少问废话 |
| 定期 `sync-bom-wiki` + 补库描述 | ✅✅✅ Wiki 与 catalog 一致，推荐更稳 |

进化方式：**多放成熟项目 BOM → 同步 Wiki → 主库补全订货号与描述**；不是模型自动训练，而是 **可积累的公司标配知识**。

## 维护节奏建议

1. 新项目验收后：BOM 丢进 `wiki/raw/bom/`（+ 可选 `.meta.md`）
2. 运行 `npm run sync-bom-wiki`
3. 打开助手，用「类似 XX 项目」试一轮，不对就改库或改 meta

详见 `wiki/AGENTS.md`（编写 meta 与命名约定）。
