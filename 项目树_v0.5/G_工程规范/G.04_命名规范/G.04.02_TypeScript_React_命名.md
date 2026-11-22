# G.04.02 TypeScript / React 命名

| 项 | 内容 |
|---|---|
| 编号 | G.04.02 |
| 类型 | 规范 |
| 上级 | G.04 命名规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设18 |
| 最后修改 | 2026-11-23 |

## 1. 规则
| 对象 | 规则 | 正例 | 反例 |
|---|---|---|---|
| React 组件 | PascalCase；文件名同组件名 | `NestCard.tsx` 导出 `NestCard` | `nestCard.tsx`、`index.tsx` 里放组件 |
| hook | `use` 开头 camelCase | `useSelection` | `selectionHook` |
| zustand store | `use<域>Store`，工厂函数 `create<域>Store` | `useGraphStore`、`createViewStore` | `graphStore` |
| 非 React 的类 | PascalCase | `CanvasEngine`、`RunBridge` | — |
| 函数、变量 | camelCase | `fitTarget` | `fit_target` |
| 类型、接口 | PascalCase，不加 `I` 前缀；props 类型叫 `<组件>Props` | `NodeVisual`、`NestCardProps` | `INode` |
| 常量 | 模块级不可变常量 UPPER_SNAKE；生成的常量对象见 `C.14-R6` | `MAX_FLOAT_REPLIES` | — |
| 事件处理 | props 叫 `onXxx`，内部实现叫 `handleXxx` | `onEnter`、`handleEnter` | `enterCallback` |
| 布尔 props | `is`、`has`、`can` 开头。例外：`components/ui` 里与 HTML / ARIA 同名的（`disabled`、`checked`、`readOnly`、`autoFocus`、`open`、`pressed`、`invalid`）和 `W.08-R12` 列出的配置型 props（`loading`、`glass`、`mono`、`danger`、`model`、`breathing`、`filterable`、`autosize`、`trapFocus`、`closeOnOutside`、`scrim`、`dismissible`、`busy`）不加前缀（`P.09` K125） | `isGhost` | `ghost` |
| 测试 | 与被测文件同名加 `.test.ts(x)` | `bezier.test.ts` | `test_bezier.ts` |

## 2. JSON 字段
前端内部一律 camelCase；和后端通信时由 `lib/protocol/mapping.ts` 统一转换（`W.04.03`）。组件和 store 里不出现 snake_case 字段名，生成的类型除外。

## 3. 检查方式
ESLint：`@typescript-eslint/naming-convention`、`react-refresh/only-export-components`（`G.06.04`）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 布尔 props 规则加 `components/ui` 的例外 | 第 9 棒写 `W.08`；`P.09` K125 |
