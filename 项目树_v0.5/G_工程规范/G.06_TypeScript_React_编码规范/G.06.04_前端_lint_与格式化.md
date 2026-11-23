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
| ESLint（flat config） | 代码规则 | `typescript-eslint` strict-type-checked；`eslint-plugin-react-hooks`；`react-refresh`；自定义规则 `hx/no-react-in-canvas-core`、`hx/no-bare-store`、`hx/no-cjk-literal`（G.06-R4），实现放在 `tools/lint/eslint/`，作为本地插件 `hx` 注册（`W.12` §6.4，`P.09` K173） |
| Stylelint | 样式规则 | `G.04.06`、`G.06.03` 里列出的规则 |
| Prettier | 格式 | `printWidth: 110`、`singleQuote: true`、`trailingComma: all`、`semi: true` |
| Vitest | 单元测试 | 缺省 jsdom；`src/ops/`、`src/state/`、`src/lib/protocol/`、`src/canvas/core/geom/`、`src/canvas/core/layout/`、`tools/lint/eslint/` 用 node 环境（`W.12` §6.2，`P.09` K174） |
| Playwright | 端到端测试、视觉回归 | 端到端在 Chromium、WebKit、Firefox 三个浏览器上跑全部用例；视觉回归只在 Chromium + Linux 比对；性能测量只用 Chromium（`W.11`、`W.12` §6.5、§6.6，`P.09` K174） |

## 2. 规则
- **G.06.04-R1** `pnpm -C web lint` = `tsc --noEmit && eslint . && stylelint "src/**/*.css" && prettier --check .`，CI 必须通过。
- **G.06.04-R2** 不允许在 CI 里放宽规则；单处豁免写 `// eslint-disable-next-line <规则> -- 原因`。
- **G.06.04-R3** 包管理器只用 pnpm；`pnpm-lock.yaml` 必须提交；CI 用 `--frozen-lockfile`。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §1：`hx/*` 规则的位置；Vitest 各目录的环境；Playwright 三个浏览器只用于端到端，视觉回归与性能只用 Chromium | 第 10 棒写 `W.12`；`P.09` K173、K174 |
