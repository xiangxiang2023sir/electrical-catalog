# 电气物料目录（electrical-catalog）

这是**正在维护的选型程序**：浏览物料、补资料、加入方案、按公司 BOM 模板导出。也可把已有公司 BOM 导回方案，在原清单上加料后再导出新版本。

它**不是** `D:\ai-selection`。物料数据在外挂库里，加料、删料不要改 `src` 程序。

## 外挂物料库

- 数据库：`library/catalog.db`（SQLite，两三万条也够用）
- 图片：`library/images/`，库里只存路径或网址
- 空库第一次打开网页时，会写入 34 条演示物料，方便看界面
- 导入公司订货号（不覆盖已有号）：

```bash
npm run import-order-nos -- "你的物料清单.xlsx"
```

Excel 需有「订货号」列（或「订货号|标准号」）。

## 启动

```bash
cd D:\electrical-catalog
npm install
npm run dev
```

浏览器打开提示的地址（一般是 http://127.0.0.1:5173/ 或 5174）。

物料库（`library/catalog.db` 和图片）不进 GitHub。别人克隆程序后，需要再拷贝你的 `library` 文件夹才能看到完整物料。

## 反向导入 BOM

在「方案」抽屉点「导入已有 BOM」，可选：

- 公司「Equipment Innovation Center BOM」xlsx（物料从第 6 行、按内部订货号匹配库）
- 本软件导出的 CSV

库里有的物料进入方案并可改数量；库里没有的订货号会标「库外」留在方案里，避免再导出时丢掉。导入后可继续从目录加料，再导出新版本。
