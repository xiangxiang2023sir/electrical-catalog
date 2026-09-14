# 电气物料目录（electrical-catalog）

这是**正在维护的选型程序**：浏览物料、补资料、加入方案、按公司 BOM 模板导出。也可把已有公司 BOM 导回方案，在原清单上加料后再导出新版本。

它**不是** `D:\ai-selection`。物料数据在外挂库里，加料、删料不要改 `src` 程序。

## 外挂物料库

- 数据库：`library/catalog.db`（SQLite，两三万条也够用）
- 图片：`library/images/`，库里只存路径或网址
- 空库第一次打开网页时，会写入 34 条演示物料，方便看界面
- **增量导入**公司订货号（已有订货号跳过）：

```bash
npm run import-order-nos -- "你的物料清单.xlsx"
```

- **整库替换**（慎用，会清空现有库）：

```bash
npm run import-order-nos -- --replace "你的物料清单.xlsx"
```

Excel 需有「订货号」列（或「订货号|标准号」）。

## 公司 BOM 模板

导出公司 BOM 需要 `public/templates/eic-bom.xlsx`。

```bash
npm run generate-bom-template
```

也可把公司原版 Equipment Innovation Center BOM 空模板放到该路径。详见 `public/templates/README.md`。

## 启动

```bash
cd D:\electrical-catalog
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:5173/（本机专用，默认不监听局域网）。

物料库（`library/catalog.db` 和图片）不进 GitHub。别人克隆程序后，需要再拷贝你的 `library` 文件夹才能看到完整物料。

## 选型助手（可选）

左侧图标栏「助手」：先选品类或写需求，按库内数据补问，再选料加入方案。Key 只放本机 `.env.local`，不要进 Git。

1. 复制 `.env.example` 为 `.env.local`
2. 填写 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`（DeepSeek / 通义等兼容接口改 Base URL 即可）
3. 重新跑 `npm run dev`

助手页标题旁会显示当前模式：**读库补问** / **读库选料** / **大模型选料** / **大模型对话**。

没配 Key 时仍可完成补问与读库选料；继续自由对话、大模型精推需要 Key。

## 反向导入 BOM

在「方案」抽屉点「导入已有 BOM」，可选：

- 公司「Equipment Innovation Center BOM」xlsx（物料从第 6 行、按内部订货号匹配库）
- 本软件导出的 CSV

库里有的物料进入方案并可改数量；库里没有的订货号会标「库外」留在方案里，避免再导出时丢掉。导入后可继续从目录加料，再导出新版本。
