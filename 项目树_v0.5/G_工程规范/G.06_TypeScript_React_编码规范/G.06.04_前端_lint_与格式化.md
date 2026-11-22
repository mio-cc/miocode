# G.06.04 前端 lint 与格式化

| 项 | 内容 |
|---|---|
| 编号 | G.06.04 |
| 类型 | 规范 |
| 上级 | G.06 TypeScript / React 编码规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 配置
| 工具 | 用途 | 关键设置 |
|---|---|---|
| TypeScript | 类型检查 | `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`verbatimModuleSyntax` |
| ESLint（flat config） | 代码规则 | `typescript-eslint` strict-type-checked；`eslint-plugin-react-hooks`；`react-refresh`；自定义规则 `hx/no-react-in-canvas-core`、`hx/no-bare-store`、`hx/no-cjk-literal`（G.06-R4） |
| Stylelint | 样式规则 | `G.04.06`、`G.06.03` 里列出的规则 |
| Prettier | 格式 | `printWidth: 110`、`singleQuote: true`、`trailingComma: all`、`semi: true` |
| Vitest | 单元测试 | jsdom 环境用于组件；画布几何、Op 层用 node 环境 |
| Playwright | 端到端测试 | Chromium、WebKit、Firefox 三个浏览器 |

## 2. 规则
- **G.06.04-R1** `pnpm -C web lint` = `tsc --noEmit && eslint . && stylelint "src/**/*.css" && prettier --check .`，CI 必须通过。
- **G.06.04-R2** 不允许在 CI 里放宽规则；单处豁免写 `// eslint-disable-next-line <规则> -- 原因`。
- **G.06.04-R3** 包管理器只用 pnpm；`pnpm-lock.yaml` 必须提交；CI 用 `--frozen-lockfile`。
