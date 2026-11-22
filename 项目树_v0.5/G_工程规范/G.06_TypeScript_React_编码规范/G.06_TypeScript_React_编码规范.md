# G.06 TypeScript / React 编码规范

| 项 | 内容 |
|---|---|
| 编号 | G.06 |
| 类型 | 规范 |
| 上级 | G 工程规范 |
| 下级 | G.06.01 组件写法、G.06.02 状态使用规则、G.06.03 样式写法、G.06.04 前端 lint 与格式化 |
| 状态 | 草稿 |
| 素材 | 设18 |
| 最后修改 | 2026-11-22 |

## 1. 目的
统一前端代码写法。前端最大的风险是性能（画布）和样式失控（主题），所以本组规则主要围绕这两点。

## 2. 总规则
- **G.06-R1** TypeScript `strict: true`，另外开启 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`。不允许 `any`（生成代码和第三方类型补丁除外）；需要时用 `unknown` 再收窄。
- **G.06-R2** React 19，只写函数组件。
- **G.06-R3** 画布引擎（`web/src/canvas/core/`）是纯 TypeScript，不 import React（`G.02.05-R24`）。
- **G.06-R4** 界面文案一律从 `lib/i18n` 取（`W.10`），组件里不写中文字符串字面量（测试除外）。
- **G.06-R5** 不引入 UI 组件库的主题（MUI、Ant Design、Chakra、Tailwind 颜色体系）；无样式组件库（assistant-ui 的 headless 组件、Radix 的行为原语）按 `G.10` 登记后可用。

## 3. 下级清单
| 编号 | 名称 |
|---|---|
| G.06.01 | 组件写法 |
| G.06.02 | 状态使用规则 |
| G.06.03 | 样式写法 |
| G.06.04 | 前端 lint 与格式化 |
