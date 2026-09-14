# 公司 BOM 模板

导出公司 BOM 时使用 `eic-bom.xlsx`（工作表名：`Equipment Innovation Center BOM`）。

## 获取方式

1. **推荐**：运行生成脚本（仓库已带生成逻辑）：

```bash
npm run generate-bom-template
```

会在本目录生成 `eic-bom.xlsx`。

2. **或使用公司原版模板**：从 Equipment Innovation Center BOM 导出一份空模板，重命名为 `eic-bom.xlsx` 放到此目录即可。

没有此文件时，网页「导出公司 BOM」会提示找不到模板。
