# W.08.05 反馈类

| 项 | 内容 |
|---|---|
| 编号 | W.08.05 |
| 类型 | 实施 |
| 上级 | W.08 基础组件库 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 设10 §10.15–§10.17、§10.22、§10.28；demo v0.5（v0.5.11）`21_flow.css`（隐藏式滚动条）、`17_fix.css`；`U.14.01`、`U.14.02`；`P.09` K123、K124、K126、K128、K129 |
| 最后修改 | 2026-11-27 |

## 1. 职责
单条提示 `Toast`、徽标 `Badge`、状态点 `StatusDot`、旋转弧 `Spinner`、进度条 `ProgressBar`、空状态 `EmptyState`，以及区域容器 `ScrollArea`（滚动条平时隐藏）和 `ErrorBoundary`（区域出错时的兜底）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 提示的排队、最多几条、自动消失与悬停暂停计时、堆叠位置与层级、读屏播报区域 | `W.07.10`（`ToastStack`、`LiveRegion`；本文的 `Toast` 只是一条的外观与交互） |
| 何时显示加载状态（< 300ms 不显示、> 2s 加说明，`U.14.01`） | 调用方（`W.07-R13`）；`Spinner` 只是图形 |
| 节点上的状态点、旋转弧、进度条 | `W.06.03`、`W.06.15`（原生 DOM；外观、令牌与本文一致） |
| 空状态的文案（"还没有运行过"） | 调用方按 `U.14.02` 传入 |
| 出错后"重新加载这一块"的文案和重试做什么 | 调用方的 `fallback`（`W.07` §8） |
| 长列表的窗口化 | 各列表组件（`W.07` §9、`W.08.03` `listNav`）；`ScrollArea` 只是滚动容器 |

## 3. 继承的上级约束
`W.08` §4–§6、`W.08-R1`–`R14`（特别是 R13）；`W.07` §4.3（`Toast`、`Badge`、`StatusDot`、`Spinner`、`ProgressBar`、`EmptyState`、`ErrorBoundary`、`ScrollArea` 八行）、`W.07` §6.5（R20）、§6.6 #14、§8；`W.07.10` §6.1；`G.06-R2`（例外见 `W.08-R13`）；`U.03.02`（全部，特别是 R1、R4）；`U.07.01-R2`、`R3`；`U.07.03`；`U.07.04` §2；`U.11` §2（通知、标签与徽标）；`U.14.01`；`U.14.02-R1`、`R2`；`U.16-R2`、`R5`；`U.23-R6`、`R13`、`R20`；`U.09.02-R10`；`P.09` K123、K124、K126、K128、K129。

## 4. 接口

### 4.1 组件
```tsx
// web/src/components/ui/feedback/Toast.tsx
export type ToastLevel = 'info' | 'ok' | 'wait' | 'error' | 'model';
export type ToastAction = { label: string; onClick(): void };
export type ToastProps = {
  level: ToastLevel;
  text: string;
  detail?: string;                     // 第二行 text-2，最多 2 行
  actions?: readonly ToastAction[];    // 最多 3 个（W.07.10 §6.3"应用 · 不应用 · 在监控页看"）
  onClose(): void;                     // × 按钮
  glass?: boolean;                     // 玻璃材质（提示浮在画布上，U.23-R6）
  onHover?(on: boolean): void;         // 指针进入 / 离开或焦点进入 / 离开整条提示（W.07.10 暂停计时）
};
export function Toast(p: ToastProps): JSX.Element;

// web/src/components/ui/feedback/Badge.tsx
export type BadgeProps = { tone: Tone; text: string; dot?: boolean };   // 弱色底 + 实色字（U.03.02-R1）；dot：左侧 6px 圆点
export function Badge(p: BadgeProps): JSX.Element;

// web/src/components/ui/feedback/StatusDot.tsx
export type DotState = 'idle' | 'running' | 'waiting' | 'failed' | 'done';   // NodeState 的界面类别（W.07 §4.3）
export type StatusDotProps = {
  state: DotState;
  label: string;                       // 读屏文字（"运行中""等待审批"，U.16-R2）
  breathing?: boolean;                 // 缺省：state === 'running'；减少动效时静态（U.07.04）
};
export function StatusDot(p: StatusDotProps): JSX.Element;

// web/src/components/ui/feedback/Spinner.tsx
export type SpinnerProps = {
  size: 12 | 16;
  label?: string | null;               // 缺省 t('ui.loading')（role="status"）；null：只是图形（放在已有 aria-busy 的按钮里）
};
export function Spinner(p: SpinnerProps): JSX.Element;

// web/src/components/ui/feedback/ProgressBar.tsx
export type ProgressBarProps = {
  value: number;                       // 0..1，越界夹紧
  tone?: 'accent' | 'ok' | 'danger';   // 缺省 accent（运行中，U.03.02）
  ariaLabel: string;
};
export function ProgressBar(p: ProgressBarProps): JSX.Element;

// web/src/components/ui/feedback/EmptyState.tsx
export type EmptyStateProps = {
  icon?: IconName;                     // 32px 线性图标（U.14.02-R2），可以不放
  title: string;                       // 一句标题
  desc?: string;                       // 一句说明（U.23-R13）
  actions?: readonly { label: string; onClick(): void; variant?: 'secondary' | 'ghost' | 'model' }[];   // 最多 2 个
  size?: 'panel' | 'page';             // 缺省 panel（侧栏、右栏）；page：会话首页、整块画布（标题 20/600，U.14.02）
};
export function EmptyState(p: EmptyStateProps): JSX.Element;

// web/src/components/ui/feedback/ScrollArea.tsx
export type ScrollAreaProps = {
  children: ReactNode;
  gutter?: 'stable';                   // 预留滚动条位置，出现时内容不跳（左栏，U.23-R20）
  axis?: 'y' | 'x' | 'both';           // 缺省 'y'
  className?: string;                  // 调用方的块类名（高度、内边距由调用方定）
  ariaLabel?: string;                  // 有值 → role="region"，tabIndex=0（内容里没有可聚焦元素时用键盘也能滚动）
  onScroll?: React.UIEventHandler<HTMLDivElement>;   // 透传到真正滚动的根元素，供窗口化列表使用（P.09 K307）
  ref?: React.Ref<HTMLDivElement>;     // 调用方保存 / 恢复 scrollTop（W.07.03 §6.1）
};
export function ScrollArea(p: ScrollAreaProps): JSX.Element;

// web/src/components/ui/feedback/ErrorBoundary.tsx —— 全前端唯一的 class 组件（W.08-R13）
export type ErrorBoundaryProps = {
  fallback(retry: () => void): ReactNode;
  children: ReactNode;
  name: string;                        // 写进 console.error，定位是哪一块（"右侧栏 · 监控"）
  resetKey?: unknown;                  // 变化时自动重试（切换会话后旧错误不再挡住新内容）
};
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean; error: unknown }> { /* §6.8，P.09 K307 */ }
```

### 4.2 依赖
`W.08` §4.4（`Tone`、`IconName`）；`W.08.01` 的 `Icon`（`EmptyState` 用 32 号）、`IconButton`（`Toast` 的 ×）、`Button`（`Toast`、`EmptyState` 的动作）；`@/lib/i18n` 的 `useT`（`ui.close`、`ui.loading`、`ui.ai`）。被依赖：`W.08.01` `Button`（`Spinner`）、`W.08.02` `TextArea`（`.hx-scroll` 的滚动条样式）、`W.08.03`（`Badge`、`ScrollArea`）、`W.07.*`、`W.09.*`。

## 5. 数据结构
本文私有：§4.1 的 props；`ErrorBoundary` 的 `state.error`；`Toast` 内部的"指针在里面 / 焦点在里面"两个标记（合成一次 `onHover` 回调）。

## 6. 行为

### 6.1 `Toast`（`U.11` §2"通知"、`设10` §10.22、`W.07.10` §6.1）
- 结构：`<div class="hx-toastcard hx-toastcard--<level>" role>`：`[级别图标] 文字 / detail · 动作按钮 · ×`。宽度由外层堆叠决定（`W.07.10` 给 320）。
- 外观：底 `bg-2`（`glass` 时玻璃，`W.08` §6.1）、`shadow-float`、`r-lg`、内边距 `s-4 s-5`；文字 `fs-13` `text-1`，`detail` `fs-12` `text-2` 最多 2 行（`-webkit-line-clamp: 2`）。
| `level` | 图标（颜色） | `role` |
|---|---|---|
| `info` | `info`（`text-2`） | `status` |
| `ok` | `check`（`ok`） | `status` |
| `wait` | `pause`（`wait`） | `status` |
| `error` | `failed`（`danger`） | `alert` |
| `model` | `Badge tone='model' text={t('ui.ai')}`（`U.12` §2：AI 做的事用模型色） | `status` |
  颜色之外每级都有不同的图形（`U.16-R2`、`U.03.02-R4`）。
- 动作：`Button variant='ghost' size='sm'`，按顺序排在文字下方一行（只有一个时放在文字右侧）；点击 → `onClick()`（消失由 `W.07.10` 处理）。多于 3 个时只渲染前 3 个，开发模式警告。
- ×：`IconButton icon='x' size=24 label={t('ui.close')}` → `onClose()`。
- `onHover(true)`：指针进入或焦点进入（`focusin`）；`onHover(false)`：指针离开且焦点不在里面。键盘用户 Tab 到提示里的按钮时同样暂停计时。
- 进入动画：`transform: translateX(12px)→none` + `opacity 0→1`，`--hx-t-3` `--hx-ease-out`；减少动效只做透明度。离开由堆叠卸载（不在本组件里做高度动画）。

### 6.2 `Badge`（`U.11` §2"标签、徽标"、`U.03.02-R1`、`设10` §10.15）
- 高 18（`calc(var(--hx-s-7) - var(--hx-s-1))`）、内边距 `0 var(--hx-s-3)`、`r-xs`、`font-mono`、`fs-10`、行高 1、不换行。
| `tone` | 底 | 字 |
|---|---|---|
| `neutral` | `bg-5` | `text-2` |
| `accent` | `accent-weak` | `accent-strong` |
| `ok` | `ok-weak` | `ok` |
| `danger` | `danger-weak` | `danger` |
| `wait` | `wait-weak` | `wait` |
| `model` | `model-weak` | `model` |
- `dot`：左侧 6px（`var(--hx-s-3)`）圆点，颜色同字色。
- 只用于状态、计数、来源标记；不可点击（需要点的是 `Button`）。

### 6.3 `StatusDot`（`W.07` §4.3、`U.16-R2`、`U.07.03`）
- 8×8（`var(--hx-s-4)`），`role="img"`、`aria-label={label}`。颜色之外用形状区分（不能只靠颜色）：
| `state` | 形状 | 颜色 |
|---|---|---|
| `idle` | 空心圆环（`box-shadow: inset 0 0 0 1px`） | `text-3` |
| `running` | 实心圆 + 外圈呼吸光环（`::after`，透明度 0.4 ↔ 1，周期 `--hx-t-breath`） | `accent` |
| `waiting` | 粗圆环（中心空，环宽 2px = `var(--hx-s-1)`） | `wait` |
| `failed` | 实心菱形（方块 `rotate(45deg)`，略小） | `danger` |
| `done` | 实心圆 | `ok` |
- `breathing` 为假或减少动效 → 不呼吸，保持静态实色（`U.07.04` §2）。
- 调用方在旁边有文字时也照样传 `label`（读屏只读这一处时不会漏）。

### 6.4 `Spinner`（`U.14.01`、`U.07.04` §2）
- SVG 圆弧：16 视框、线宽 1.5、`stroke: currentColor`、弧长约 60%（`stroke-dasharray` 是静态属性，不做动画）；整个 SVG `animation: hx-spin var(--hx-t-spin) linear infinite`（`@keyframes` 只动 `transform: rotate`，持续动画按 `U.07.01-R3` 不受 `--hx-t-4` 上限）。
- 减少动效：不旋转，弧改为静态半圆（`stroke-dasharray` 换成半圆长度，`html[data-motion="reduce"]` 下）。
- `label` 为字符串 → `role="status"` + 视觉隐藏的文字；为 `null` → `aria-hidden="true"`。

### 6.5 `ProgressBar`（`U.07.01-R2`、`设10` §10.16）
- 轨道高 4px（`var(--hx-s-2)`）、底 `line-2`、`r-full`、`overflow: hidden`；填充是一个 100% 宽的子元素，`transform: scaleX(var(--_v))`、`transform-origin: left`，`--_v` 由组件写 0..1（几何值）；过渡 `transform var(--hx-t-2) var(--hx-ease)`；减少动效无过渡。颜色 `--hx-<tone>`。
- `role="progressbar"`、`aria-valuemin=0`、`aria-valuemax=100`、`aria-valuenow=round(value×100)`、`aria-label`。
- 不做"不确定进度"的循环条（`U.14.01-R1` 不用扫光；没有进度时用 `Spinner`）。

### 6.6 `EmptyState`（`U.14.02`、`U.23-R13`）
- 纵向居中一列，间距 `s-4`：`Icon size=32`（`text-3`，`aria-hidden`）· 标题（`panel`：`fs-14` 600 `text-1`；`page`：`fs-20` 600）· 说明（`fs-13` `text-2`，最多一句）· 按钮（`Button`，缺省 `secondary`；"让 AI 帮我做"用 `model`）。
- 不放插画（`U.14.02-R2`）；`actions` 多于 2 个只渲染前 2 个，开发模式警告。
- 文案温和具体由调用方保证（`U.14.02-R1`）。

### 6.7 `ScrollArea`（`U.23-R20`、`U.09.02-R10`、`U.24` #14、`P.09` K123）
- 一个 `<div class="hx-scroll [hx-scroll--stable] [hx-scroll--x|--both] {className}">`，`overflow-y: auto`（`x` / `both` 按 `axis`）、`overscroll-behavior: contain`、`min-height: 0`（放在 flex 列里能收缩）。
- 滚动条平时完全隐藏，指针进入区域（`:hover`）或焦点在里面（`:focus-within`）时出现 6px 半透明细滑块：
  - Firefox：`scrollbar-width: thin; scrollbar-color: transparent transparent`，悬停时 `scrollbar-color: var(--hx-bg-thumb) transparent`；
  - Chromium / WebKit：`::-webkit-scrollbar { width: var(--hx-s-3); height: var(--hx-s-3) }`，轨道透明，滑块平时透明、悬停时 `background: var(--hx-bg-thumb)`、`border-radius: var(--hx-r-full)`。
  - 颜色只用新令牌 `--hx-bg-thumb`（demo 的 `color-mix(… 16% …)` 不迁移，`G.06.03-R1`）。
- `gutter='stable'` → `scrollbar-gutter: stable`（出现滑块时内容不跳，左栏用，`U.23-R20`）。
- `.hx-scroll` 的滚动条规则同时用于 `W.08.02` 的 `TextArea`（它的根元素同时带 `hx-scroll` 类）。
- 不用 JS 模拟滚动条；`onScroll` 与 `ref` 原样转给滚动根元素（`P.09` K307）。

### 6.8 `ErrorBoundary`（`W.07` §8、`P.09` K129、K307）
- `static getDerivedStateFromError(error)` → `{hasError: true, error}`（用独立 `hasError` 标志，不以 `error === null` 判断，避免 `throw null` 漏判）；`componentDidCatch(error, info)` → `console.error('[ErrorBoundary]', this.props.name, error, info.componentStack)`（`G.12` §2.1，`G.12-R10`）。
- `hasError` 为真时渲染 `fallback(retry)`，`retry = () => this.setState({hasError: false, error: null})`；`componentDidUpdate` 里 `resetKey` 与上次不同（`Object.is`）且 `hasError` 为真 → 自动重试。
- 只接住渲染、生命周期里的错误；事件处理函数和 Promise 里的错误不经过它（React 的行为），由调用方按 `W.07` §8 处理。
- 这是全前端唯一的 class 组件；其余组件一律函数组件（`G.06-R2`，`W.08-R13`）。

## 7. 不变量
- 每个 `StatusDot` 都有非空的读屏文字，且五种状态在灰度截图里也能区分（形状不同）。
- `ProgressBar` 的填充只改 `transform`，宽度不变（`U.07.01-R2`）。
- `ScrollArea` 平时不显示滚动条；任何时刻都不改变内容的宽度（`gutter='stable'` 时）。
- `ErrorBoundary` 接住错误后，它外面的区域和画布照常工作（错误不向外冒）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `ProgressBar` 的 `value` 不是有限数 | 按 0 显示，开发模式警告一次 |
| `StatusDot` 的 `label` 为空 | 开发模式抛错（`U.16-R2`）；生产模式用 `state` 作为读屏文字并 `console.error` 一次 |
| `ErrorBoundary` 的 `fallback` 自己抛错 | 不再接住（交给更外层的边界或应用根的边界），`console.error` |
| `Toast` 的 `actions` 多于 3 个 / `EmptyState` 的多于 2 个 | 只渲染前几个，开发模式警告 |

## 9. 性能与资源
- `Badge`、`StatusDot`、`ProgressBar` 渲染 ≤ 0.05ms；结构树 500 行的状态点合计 ≤ 15ms。
- `StatusDot` 的呼吸、`Spinner` 的旋转是纯 CSS 动画（合成层，只动 `transform` / `opacity`），不占 JS。
- `ProgressBar` 值变化只改一个 CSS 变量，不重建 DOM。

## 10. 验收标准
1. `Toast` 五种级别：图标形状各不相同；`error` 是 `role="alert"`，其余 `role="status"`；三个动作按钮都能点；指针悬停和键盘 Tab 进去都回调 `onHover(true)`；减少动效只淡入。
2. `Badge` 六种语气在浅色 / 深色主题下文字对比度 ≥ 4.5:1（`U.03.05-R3`）。
3. `StatusDot`：五种状态灰度截图可区分；运行中呼吸，打开减少动效后静止；读屏读出 `label`。
4. `Spinner` 旋转；减少动效时变成静态半圆弧；放在按钮里时读屏不重复读"加载中"。
5. `ProgressBar` 从 0.2 到 0.8：只有 `transform` 变化（Performance 面板无布局）；读屏读出百分比。
6. `EmptyState`：监控页"还没有运行过"一句标题 + 一句说明 + "运行"按钮；没有插画。
7. `ScrollArea`：左栏平时看不到滚动条，指针移入出现 6px 细滑块，内容不左右跳动；Firefox 与 Chromium 都满足。
8. `ErrorBoundary`：右侧栏监控页里一个组件抛错 → 只有监控页显示兜底内容，画布和左栏照常；点"重新加载这一块"恢复；`resetKey` 变化自动恢复；控制台有带 `name` 的错误。

### 实施卡
- 要建 / 要改的文件：`web/src/components/ui/feedback/Toast.tsx`、`web/src/components/ui/feedback/Toast.css`、`web/src/components/ui/feedback/Toast.test.tsx`、`web/src/components/ui/feedback/Badge.tsx`、`web/src/components/ui/feedback/Badge.css`、`web/src/components/ui/feedback/Badge.test.tsx`、`web/src/components/ui/feedback/StatusDot.tsx`、`web/src/components/ui/feedback/StatusDot.css`、`web/src/components/ui/feedback/StatusDot.test.tsx`、`web/src/components/ui/feedback/Spinner.tsx`、`web/src/components/ui/feedback/Spinner.css`、`web/src/components/ui/feedback/Spinner.test.tsx`、`web/src/components/ui/feedback/ProgressBar.tsx`、`web/src/components/ui/feedback/ProgressBar.css`、`web/src/components/ui/feedback/ProgressBar.test.tsx`、`web/src/components/ui/feedback/EmptyState.tsx`、`web/src/components/ui/feedback/EmptyState.css`、`web/src/components/ui/feedback/EmptyState.test.tsx`、`web/src/components/ui/feedback/ScrollArea.tsx`、`web/src/components/ui/feedback/ScrollArea.css`、`web/src/components/ui/feedback/ScrollArea.test.tsx`、`web/src/components/ui/feedback/ErrorBoundary.tsx`、`web/src/components/ui/feedback/ErrorBoundary.test.tsx`、`web/src/components/ui/index.ts`
- 说明：`ErrorBoundary` 是全前端唯一 class 组件（`W.08-R13`），当前 `web/eslint.config.js` 无需额外豁免（`P.09` K304）。
- 不许碰的文件：`web/src/styles/`、`web/src/state/`、`web/src/ops/`、`web/src/shell/`、`web/src/panels/`、`web/src/pages/`、`web/src/canvas/`、`web/src/lib/protocol/`
- 函数签名：见 §4。
- 测试用例：
  - `W0805-T1 props 对照`：八个组件含 `W.07` §4.3 对应行的全部 props（`expectTypeOf`）；`Toast` 用 `actions`（`W.08` §4.5，`P.09` K126）
  - `W0805-T2 Toast 级别`：五种 `level` 的图标名 / `Badge` 与 `role` 符合 §6.1 表；`detail` 渲染第二行
  - `W0805-T3 Toast 交互`：动作按钮点击调对应 `onClick`；× 调 `onClose`，`aria-label` 为 `ui.close`；4 个动作只渲染 3 个
  - `W0805-T4 Toast 悬停`：`pointerenter` → `onHover(true)`；`pointerleave` 时焦点在里面 → 不调 `onHover(false)`；焦点也离开 → `onHover(false)` 1 次
  - `W0805-T5 Badge`：六种 `tone` 的类名 `hx-badge--<tone>`；`dot` 渲染圆点；CSS 只用表里的令牌（源码断言）
  - `W0805-T6 StatusDot`：`role="img"`、`aria-label`；`running` 缺省带 `is-breathing`；`breathing=false` 不带；`label=''` 开发模式抛错
  - `W0805-T7 Spinner`：缺省 `role="status"` 且有视觉隐藏的 `ui.loading` 文字；`label=null` → `aria-hidden="true"`、没有 `role`
  - `W0805-T8 ProgressBar`：`value=1.4` → `--_v: 1`、`aria-valuenow=100`；`value=NaN` → 0；只有 `transform` 依赖 `--_v`（CSS 源码断言没有 `width` 过渡）
  - `W0805-T9 EmptyState`：标题、说明、按钮按顺序；`size='page'` 加 `hx-empty--page`；3 个动作只渲染 2 个；没有 `img`
  - `W0805-T10 ScrollArea`：类名、`gutter='stable'` → `hx-scroll--stable`；`ariaLabel` → `role="region"`、`tabIndex=0`；`ref` 指向根元素；`onScroll` 绑在滚动根元素上触发回调；CSS 里滑块颜色是 `var(--hx-bg-thumb)`、宽 `var(--hx-s-3)`
  - `W0805-T11 ErrorBoundary`：子组件抛错（含 `throw null`）→ 渲染 `fallback`，`console.error` 的参数含 `name`；调 `retry` → 子组件重新渲染；`resetKey` 改变 → 自动恢复；兄弟组件不受影响
  - `W0805-T12 减少动效`：CSS 源码里 `html[data-motion="reduce"]` 下 `.hx-spin` 无 `animation`、`.hx-dot` 无呼吸、`.hx-toastcard` 无 `transform` 动画
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部；另：不在 `Toast` 里自己计时消失；不用 JS 画滚动条；不用 `width` 做进度动画；除 `ErrorBoundary` 外不写 class 组件；空状态不放插画。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 9 棒；`P.09` K123、K124、K126、K128、K129 |
| 2026-11-23 | `ErrorBoundary` 的日志规则改为引用 `G.12` §2.1 | W 全枝复查；`P.09` K180 |
| 2026-11-27 | `ScrollArea` 增加 `onScroll`、`ErrorBoundary` 改为独立 `hasError` 标志并补 `throw null` 用例 | 第 ⑨b 片主线评审修复片 `m1-web-ui-fix`（`P.09` K307） |
