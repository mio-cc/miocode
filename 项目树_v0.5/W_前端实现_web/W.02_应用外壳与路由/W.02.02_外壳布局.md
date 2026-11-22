# W.02.02 外壳布局

| 项 | 内容 |
|---|---|
| 编号 | W.02.02 |
| 类型 | 实施 |
| 上级 | W.02 应用外壳与路由 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5（v0.5.11）`10_body.html`、`40_tidy.js`（`fitTarget`）；demo v0.4 `30_layout.js`、`08_layout.css`；`U.09.01`–`U.09.03` |
| 最后修改 | 2026-11-23 |

## 1. 职责
会话页的整体骨架：顶部条、左侧栏、画布区域（画布 + 浮在画布上的各元素）、右侧栏、横幅的挂载位置和尺寸；侧栏收展、专注模式、断点、适应画布要避开的区域。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 顶部条、左右侧栏、停靠栏、小地图、父图位置卡、提议栏、浮动回复、对话框、横幅的内容 | `W.07.01`–`W.07.10` |
| 浮动面板的拖动、吸附、记住位置 | `W.07.06` |
| 侧栏收展时补偿画布平移量（画布内容不跳） | `W.06.02`（画布引擎自己观察视口尺寸，`U.09.02-R3`） |
| 首次引导页、中心窗口的布局 | `W.09.03`、`W.09.02`（本文只提供"页面模式"的挂载方式） |

## 3. 继承的上级约束
`U.09-R1`–`R3`；`U.09.01`（全部，含 R1、R3、R4、R6）；`U.09.02`（全部）；`U.09.03`（全部，含 K71 的 R2）；`U.06` §3（z-index）；`U.07.01-R1`；`U.23-R4`、`R6`、`R16`；`G.06.02-R7`；`G.06.03`。

前置条件：`U.09.01` §3 的布局令牌（`--hx-top-h`、`--hx-ls-w`、`--hx-ls-w-min`、`--hx-rs-w`、`--hx-comp-max`、`--hx-comp-min`、`--hx-comp-gutter`、`--hx-float-inset`）和 `U.06` §3 的 `--hx-z-*` 已经在 `design/tokens.css` 里。没有时先上报（`G.02.03-R4`），不在组件里写值。

## 4. 接口
### 4.1 组件
```tsx
// web/src/shell/AppShell.tsx
type AppShellProps = {
  mode: 'session' | 'page';           // page：首次引导等整页界面占画布区域，侧栏可见但不可用（U.18-R2）
  page?: ReactNode;                   // mode=page 时渲染在画布区域
  canvasOverlay?: ReactNode;          // mode=session：叠在画布之上、浮动层之下，自身 pointer-events:none（空状态、画布导览，W.09.01、W.09.03，K148）
  cover?: ReactNode;                  // mode=session：盖住画布区域和浮动层（运行历史，W.09.05，K146）；画布保持挂载、不销毁引擎
};
export function AppShell({ mode, page }: AppShellProps): JSX.Element;

// 各区域的插槽组件，由 AppShell 摆放；内容组件从 W.07 引入
// <TopBar/>         W.07.01   <LeftSidebar/>  W.07.02   <RightSidebar/> W.07.03–05
// <CanvasArea>      本文      里面依次：<Canvas/> W.06、<FloatLayer/>（停靠栏、小地图、父图位置卡 W.07.06；
//                            提议栏 W.07.09；浮动回复 W.07.08；对话框 W.07.07；FloatLayer 的子元素整体包在
//                            W.07.08 的 <FloatReplyProvider> 里，对话框的 Esc 要先收拢浮动回复，P.09 K111）
// <BannerSlot/>     本文      顶部条下方：急停横幅、离线横幅、子图库内容提示、窄屏提示（W.07.10）

// web/src/shell/CanvasArea.tsx 另导出（P.09 K111）
export function useCanvasAreaRect(): () => DOMRect | null;   // 画布区域的页面矩形：引擎事件的 at（相对画布根元素）换成页面坐标时用（W.07.11）
```
### 4.2 布局状态（放在 `uiStore`，`W.03.03`）
```ts
type ShellLayout = {
  lsOpen: boolean;                     // localStorage hx:ls-open，默认 true（<900 时默认 false，U.09.03）
  rsOpen: boolean;                     // hx:rs-open，默认 false
  rsTab: 'insp' | 'chat' | 'mon';      // hx:rs-tab，默认 'insp'
  lsFold: Record<'sess' | 'tree' | 'lib', boolean>;   // hx:ls-fold
  focus: null | { ls: boolean; rs: boolean };         // 专注模式：进入前的状态
  bp: 'xl' | 'lg' | 'md' | 'sm' | 'xs';               // 当前断点（K71）
  fitInsets: { top: number; right: number; bottom: number; left: number };   // 适应画布要避开的边距（屏幕像素）
};
// actions
setLs(open: boolean): void;  setRs(open: boolean, tab?: ShellLayout['rsTab']): void;
toggleFocus(): void;         // F
setLsFold(sec, folded): void;
```
### 4.3 断点
```ts
// web/src/shell/breakpoints.ts —— 全前端唯一定义断点的地方（U.09.03-R2、K71）
export const BREAKPOINTS = { lg: 1180, md: 1100, sm: 900, xs: 760 } as const;   // 宽度 < 值 时进入该档
export function bpOf(width: number): ShellLayout['bp'];
```
外壳用 `ResizeObserver` 观察窗口宽度，把 `bp` 写进 `uiStore` 并设到 `.hx-app` 的 `data-bp` 属性上。组件样式只写 `.hx-app[data-bp='md'] .hx-xxx {…}`，不写 `@media (max-width…)`（CI 用 Stylelint `media-feature-name-disallowed-list: width, max-width, min-width` 检查；`prefers-*` 不受限）。

### 4.4 依赖
`W.03.03` uiStore；`W.02.04` 注册 `[`、`]`、`I`、`F` 的处理函数；`W.07.*` 的区域组件；`W.06` `<Canvas>`。

## 5. 数据结构
`ShellLayout` 见 §4.2，是 `uiStore` 的一部分（不随会话切换，`U.09.04` §2"全局"一栏）。

## 6. 行为
### 6.1 网格
```
.hx-app            grid-template-rows: var(--hx-top-h) auto 1fr      （顶部条 / 横幅 / 主体）
.hx-app__main      grid-template-columns: <左栏> 1fr <右栏>
  左栏宽 = lsOpen ? var(--hx-ls-w) : var(--hx-ls-w-min)
  右栏宽 = (rsOpen && bp ∈ {xl, lg}) ? var(--hx-rs-w) : 0
```
- 顶部条与左栏同一块底色 `bg-0`，不画分割线；画布区域和右栏是浮在底色上的圆角卡片（`U.23-R4`）。
- 收展时列宽一次性改变，侧栏内容用 `transform` + `opacity` 做进出动画，不对宽度做动画（`U.07.01-R1`）。
- `bp ∈ {md, sm, xs}`（< 1100）：右栏改为覆盖式——绝对定位在画布区域右侧，宽 `--hx-rs-w`，`shadow-float`，层级 `--hx-z-pane`；在画布空白处按下鼠标时关闭（`U.09.03`）。

### 6.2 画布区域里的浮动元素
| 元素 | 位置 | 层级 |
|---|---|---|
| 停靠栏 | 左侧、垂直居中，距左 `--hx-float-inset`；可拖动（`W.07.06`） | `--hx-z-float` |
| 父图位置卡 | 左上，只在子图里（`U.13.06` §3） | `--hx-z-float` |
| 小地图 | 左下 | `--hx-z-float` |
| 浮动回复 | 对话框正上方；有提议栏时在提议栏上方 | `--hx-z-float` |
| 提议栏 | 对话框正上方 | `--hx-z-float` |
| 对话框 | 底部居中，距底 `--hx-s-5` | `--hx-z-composer` |

- 对话框、提议栏、浮动回复的**水平中心是画布区域的中心**，不是窗口中心（`U.09.01-R3`）：它们放在画布区域内部的一个 `position: absolute; inset: 0` 浮动层里居中。
- 对话框宽度：`width: min(var(--hx-comp-max), 100cqw - var(--hx-comp-gutter))`，最小 `min(var(--hx-comp-min), 100cqw - var(--hx-float-inset) * 2)`；画布区域设 `container-type: inline-size`。`bp` < 1100 时改为 `100cqw - var(--hx-float-inset) * 2`（`U.09.03`）。
- 浮动面板（停靠栏、对话框、小地图、浮动回复、提示）使用玻璃材质（`U.23-R6`）；这是 `U.01` §3 的唯一例外（`P.09` K55）。
- 互不遮挡（`U.09.01-R4`）：外壳每次布局变化后检查小地图矩形和对话框矩形，相交时给小地图加 `is-hidden`；`bp` < 1100 时小地图始终隐藏（`U.09.03`）。

### 6.3 适应画布要避开的区域（`U.09.01-R1`）
外壳用 `ResizeObserver` 观察对话框和浮动回复的高度，算出 `fitInsets` 写进 `uiStore`，画布引擎在"适应画布""聚焦节点"时读取（`W.06.02`）：
| 边 | 值 |
|---|---|
| left | 当前在子图里（`scope ≠ root`）：304；否则 64 |
| top | 28 |
| right | 28 |
| bottom | 对话框高度 + 浮动回复高度（最多 80；收拢、没有回复时为 0）+ 44 |

这几个数和 demo v0.5 `fitTarget` 一致；它们是几何量，以常量写在 `web/src/shell/layout.ts` 并注释出处 `U.09.01-R1`，不是样式值，不受 `G.06.03-R1` 约束。停靠栏、父图位置卡被用户拖到别处后，避让值仍按上表计算（v1 不按实际位置算）。

### 6.4 收展与专注
| 操作 | 结果 | 规范 |
|---|---|---|
| 顶部条左栏开关 / `[` | `setLs(!lsOpen)`；专注模式中则退出专注 | `U.09.02` §1、§3 |
| 顶部条右栏开关 / `]` | `setRs(!rsOpen)`，打开时显示上次的标签页；专注模式中则退出专注 | `U.09.02` §2 |
| `I` | `setRs(true, 'insp')` | — |
| 点浮动回复 | `setRs(true, 'chat')` | `U.09.02` §2 |
| 点运行按钮旁的状态 / 运行卡片 | `setRs(true, 'mon')` | `U.09.07` |
| `F` | 第一次：记下 `{ls, rs}`，两侧都收起；第二次：恢复 | `U.09.02` §3 |
| 选中节点 | **不**打开右栏；右栏收起时右栏开关显示小圆点 | `U.09.02-R1` |

- 不设专注按钮；右栏里不放收起按钮（`U.09.02-R6`）。
- 收展状态写 localStorage（`G.06.02-R7`），键见 §4.2。

### 6.5 页面模式（`mode='page'`）
首次引导等整页界面渲染在画布区域里；顶部条和左栏照常显示但设 `inert`（不可聚焦、不可点击），右栏收起，浮动层不渲染（`U.18-R2`）。急停按钮除外：首次引导以外的页面里急停必须可用（`U.14.04-R1`），所以只有 `/welcome` 才让顶部条整体 `inert`。

### 6.5a 两个会话页插槽（`P.09` K146、K148）
- `canvasOverlay`：放在 `CanvasArea` 里 `<Canvas/>` 与 `<FloatLayer/>` 之间，`position: absolute; inset: 0; pointer-events: none`；里面的卡片、按钮自己设 `pointer-events: auto`。
- `cover`：放在 `CanvasArea` 最上层，`position: absolute; inset: 0`，`bg-1`；有 `cover` 时 `FloatLayer` 不渲染（对话框、浮动回复、停靠栏都不显示），`<Canvas/>` 照常挂载（主画布引擎不销毁，回来时不重建 DOM 池）；顶部条、左右侧栏照常可用。

### 6.6 横幅位置
急停横幅、离线横幅、窄屏提示（`bp='xs'`，"窗口太窄，建议加宽到 900 以上使用"）放在 `BannerSlot`（网格第 2 行），出现和消失时主体区域高度变化，画布引擎按视口尺寸变化处理，不额外补偿。

## 7. 不变量
- 画布在会话页任何时候都可见，占据左右栏之间的全部空间（`U.09-R1`）。
- 对话框任何时候可见、可输入（`U.09-R2`；页面模式除外）。
- 浮动元素的层级只来自 `--hx-z-*` 令牌（`G.06.03-R8`）。
- 外壳代码不读写画布的视图（平移、缩放）。
- 组件里没有宽度媒体查询（§4.3）。

## 8. 错误处理
无运行时错误；令牌缺失时样式检查（Stylelint、`tools/gen tokens` 的完整性检查）在构建阶段失败。

## 9. 性能与资源
- 窗口缩放、侧栏收展时不触发画布节点重建；React 只重渲染外壳本身和受影响的侧栏（`U.17-R10` 只约束平移、缩放、拖动、运行状态，收展允许 React 提交）。
- `ResizeObserver` 回调里只写 `uiStore`，用 `requestAnimationFrame` 合并，一帧最多一次。
- 侧栏收展的视觉反馈 ≤ 100ms（`U.17` §1）。

## 10. 验收标准
1. 在 1440、1180、1100、900、760 五个宽度截图，没有重叠、没有截断（`U.09.03` §2、`U.20`）。
2. 右栏打开 / 关闭、左栏收展时，画布上的节点在屏幕上不移动（与 `W.06.02` 联合测试）。
3. < 1100 时右栏覆盖在画布上，点画布空白处关闭；小地图隐藏。
4. 对话框的水平中心等于画布区域中心（右栏打开前后都成立）。
5. 在子图里点"适应画布"，节点不被父图位置卡、停靠栏、对话框、浮动回复遮挡。
6. 刷新后左栏开合、分区折叠、右栏开合和标签页保持。
7. `/welcome` 时侧栏不可聚焦；其他页面急停按钮可用。

### 实施卡
- 要建 / 要改的文件：`web/src/shell/AppShell.tsx`、`web/src/shell/AppShell.css`、`web/src/shell/CanvasArea.tsx`、`web/src/shell/CanvasArea.css`、`web/src/shell/FloatLayer.tsx`、`web/src/shell/BannerSlot.tsx`、`web/src/shell/layout.ts`、`web/src/shell/breakpoints.ts`、`web/src/shell/layout.test.ts`、`web/src/shell/AppShell.test.tsx`、`web/tests/visual/shell.spec.ts`（五个宽度 × 浅色深色截图）；`web/.stylelintrc.json` 只加 §4.3 的媒体查询限制。
- 不许碰的文件：`design/tokens.css`（令牌缺失时上报）、`web/src/styles/tokens.css`（生成物）、`web/src/canvas/`、`web/src/panels/` 各组件的实现、`schema/`。
- 函数签名：见 §4.1–§4.3。
- 测试用例：
  - `W0202-T1 bpOf`：759→xs、760→sm、899→sm、900→md、1099→md、1100→lg、1179→lg、1180→xl
  - `W0202-T2 fitInsets`：根图 / 子图；浮动回复收拢 / 展开 / 高 120（取 80）
  - `W0202-T3 专注模式`：`F` 两次恢复原状；专注中按 `[` 退出专注并只打开左栏
  - `W0202-T4 覆盖式右栏`：宽 1000 时打开右栏，主体列宽不变；在画布空白按下后关闭
  - `W0202-T5 小地图避让`：宽 1180、画布窄到与对话框相交时小地图隐藏
  - `W0202-T6 持久化`：§10 验收 6
  - `W0202-T7 视觉回归`：§10 验收 1
- 允许使用的依赖：`react`、`zustand`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部；另：不对宽度、高度、`left`、`top` 做动画；不写宽度媒体查询；不在外壳里改画布视图。
- 完成标志：`G.14` 全部条件（含浅色、深色截图）；§10 七条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §4.1：`FloatLayer` 的子元素包在 `FloatReplyProvider` 里；新增 `useCanvasAreaRect`；横幅列出子图库内容提示 | 第 8 棒写 `W.07`；`P.09` K111 |
| 2026-11-23 | `AppShell` 新增 `canvasOverlay`、`cover` 两个插槽（§4.1、§6.5a） | 第 9 棒写 `W.09`；`P.09` K146、K148 |
