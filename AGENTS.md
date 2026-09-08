# 给 AI 的说明

本仓库是祥祥的电气物料目录网页，独立于 `D:\ai-selection`。

- **要改程序：只改本目录。**
- 不要去改、引用或继续扩展 `D:\ai-selection` 里的 FastAPI 双后端、选型引擎空壳、InvenTree。
- 数据约定：公司 Excel 只提供内部订货号（用 `npm run import-order-nos` 写入外挂库）；名称、规格、图、单价在本应用维护，存在 `library/catalog.db`，不要改 `src` 里的演示数组当正式库。分类大类为 `电气`、`机械`、`未定义`。
- 正式导出对齐公司「Equipment Innovation Center BOM」模板：`public/templates/eic-bom.xlsx`。表头写项目名称/编号/工作令、机械/电气工程师、版本 A/B/C…；物料从第 6 行写内部订货号、名称、规格型号、数量、单位、单价、种类、供应商。CSV 只作临时清单。
