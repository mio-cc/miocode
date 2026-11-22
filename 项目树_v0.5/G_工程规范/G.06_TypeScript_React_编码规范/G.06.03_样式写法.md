# G.06.03 样式写法

| 项 | 内容 |
|---|---|
| 编号 | G.06.03 |
| 类型 | 规范 |
| 上级 | G.06 TypeScript / React 编码规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | DESIGN |
| 最后修改 | 2026-11-22 |

## 1. 规则
| 编号 | 规则 |
|---|---|
| G.06.03-R1 | 颜色、字号、间距、圆角、阴影、动效时长和曲线**只能用设计令牌** `var(--hx-*)`（INV-20）。不能写 `#fff`、`12px`、`200ms`、`rgba(…)` |
| G.06.03-R2 | 例外只有：`0`、`1px` 边框和发丝线、`100%`、`50%`、布局相关的 `fr` / `minmax`、数学上必须的值（如 `calc(var(--hx-s-4) * 2)`）。其他新值必须先作为令牌加入 `tokens.css`（`U.02`） |
| G.06.03-R3 | 样式用普通 CSS 文件 + BEM 类名（`G.04.06`），和组件放在一起；不使用 CSS-in-JS、不使用 Tailwind |
| G.06.03-R4 | 全局样式只有 `styles/tokens.css`（令牌）和 `styles/base.css`（重置、字体、滚动条）；组件样式不写全局选择器 |
| G.06.03-R5 | 主题切换只靠 `<html data-theme>` 切换令牌值；组件里不写 `[data-theme="dark"]` 分支，除非是令牌表达不了的情况（需注释并登记在 `U.03.04`） |
| G.06.03-R6 | 动画只动 `transform`、`opacity`（以及 `U.07.01` 允许的少数属性）；禁止对 `width`、`height`、`top`、`left` 做动画 |
| G.06.03-R7 | 所有动画都放在 `@media (prefers-reduced-motion: no-preference)` 里，或者在减少动效模式下有替代（`U.07.04`） |
| G.06.03-R8 | z-index 只能用令牌 `--hx-z-*`（`U.06`），不写数字 |
| G.06.03-R9 | 画布引擎里通过 JS 设置样式时，也只能设置令牌引用（`el.style.setProperty('--_pc', 'var(--hx-type-ctx)')`）或几何值（transform 坐标） |

## 2. 检查方式
Stylelint：`color-no-hex`、`declaration-property-value-disallowed-list`（对 color、background、font-size、margin、padding、gap、border-radius、box-shadow、transition-duration、z-index 禁止非 `var(--hx-` 的值，白名单见 R2）、`declaration-property-value-allowed-list`（transition-property）。
