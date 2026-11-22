# G.04.06 CSS 类名与设计令牌命名

| 项 | 内容 |
|---|---|
| 编号 | G.04.06 |
| 类型 | 规范 |
| 上级 | G.04 命名规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | DESIGN, 设18 |
| 最后修改 | 2026-11-22 |

## 1. 规则
| 对象 | 规则 | 例子 |
|---|---|---|
| 类名前缀 | 一律 `hx-` | `.hx-node` |
| 块、元素 | BEM：`hx-块__元素` | `.hx-node__head`、`.hx-peek__cv` |
| 变体 | `hx-块--变体`（长期的外观变体） | `.hx-btn--primary` |
| 状态 | `is-` / `has-` 修饰类，只表示临时状态 | `.is-running`、`.is-selected`、`.has-children` |
| JS 钩子 | 不用 class 做 JS 选择器，用 `data-*` | `data-node-id`、`data-port` |
| 设计令牌 | `--hx-<类别>-<名>`；类别：`bg`、`line`、`text`、`accent`、`ok`、`danger`、`wait`、`model`、`type`、`fs`、`s`、`r`、`t`、`ease`、`shadow`、`font`、`node`、`ctl`、`z`、`mark` | `--hx-bg-2`、`--hx-type-ctx`、`--hx-z-overlay` |
| 组件局部变量 | `--_` 开头，只在组件内部使用 | `--_pc`（端口颜色） |

- **G.04.06-R1** demo 里的 `.hx-btn.is-primary`（用状态类表示变体）在正式实现中改为 `.hx-btn--primary`。`is-` 只用于会变化的状态。
- **G.04.06-R2** 新增令牌走 `U.02` 流程；令牌名一经发布不改名（`交接说明`）。
- **G.04.06-R3** 不使用 id 选择器写样式；不使用 `!important`（覆盖第三方样式时例外，需注释原因）。

## 2. 检查方式
Stylelint：`selector-class-pattern`（`^hx-[a-z0-9]+(__[a-z0-9-]+)?(--[a-z0-9-]+)?$|^is-|^has-`）、`custom-property-pattern`、`declaration-no-important`（`G.06.04`）。
