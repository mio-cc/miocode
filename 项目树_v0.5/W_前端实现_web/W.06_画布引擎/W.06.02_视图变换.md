# W.06.02 视图变换

| 项 | 内容 |
|---|---|
| 编号 | W.06.02 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设07（视图、网格、缩放）；设17 R1、R9；demo `设计规范_v0.3/src/24_render.js`（`renderView`、`animateView`、`fitTarget`）、`25_pointer.js`（`zoomAt`、`onWheel`）；demo v0.5 `40_tidy.js`（新的 `fitTarget`）；demo v0.4 `30_layout.js`（`lastLeft` 补偿）；`15_art.css`（点阵） |
| 最后修改 | 2026-11-23 |

## 1. 职责
画布的平移、缩放和视图过渡：把 `View {x, y, k}` 写到世界容器和背景上；处理滚轮、触控板、捏合；"适应画布""聚焦节点""把某处移进视口"的计算和动画；视口尺寸变化（侧栏收展）时的补偿；画布背景（点阵、光晕、颗粒、暗角、指针柔光）；每帧把视图写回 view store。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 按层记住视图、写 localStorage、`zoomPct` 防抖 | `W.03.02` |
| 拖动画布的指针模式判断（空格、平移工具、中键） | `W.06.07`（判断后调本文的 `panBy`） |
| LOD 级别切换 | `W.06.05`（订阅本文的 `onSettle`） |
| 换层时的转场动画 | `W.06.13`（本文只给它 `apply` / `animateTo`） |
| `fitInsets` 的测量 | `W.02.02` §6.3（本文只读 `ui.layout.fitInsets`） |
| 停靠栏上的缩放按钮、缩放百分比显示 | `W.07.06`（调 `cmd.zoomBy`、读 `useZoomPercent`） |

## 3. 继承的上级约束
`W.06` §4.4（`ViewportApi`）、§6.2（`view` 阶段）、`W.06-R3`、`R4`、`R7`；`W.03.02` §4、§6.4；`U.10.01-R1`–`R5`；`U.17-R1`、`R9`、`R10`；`U.07.01`（视图过渡用 `--hx-t-4`、`--hx-ease-out`）、`U.07.01-R4`；`U.07.04` §2；`U.09.01-R1`；`U.09.02-R3`（`P.09` K97）；`U.13.02` §2；`U.13.06` §2（滚轮缩放关闭预览）；`U.23-R7`；`W.02.02` §6.3、§6.6、§10 验收 2、5。

## 4. 接口
```ts
// web/src/canvas/core/view/viewport.ts
export function createViewport(ctx: EngineCtx): ViewportApi & { dispose(): void };   // ViewportApi 见 W.06 §4.4

// web/src/canvas/core/view/fit.ts —— 纯函数
export type Insets = { top: number; right: number; bottom: number; left: number };
export const FIT_PAD = 40;                                   // 内容四周留白（世界像素，demo fitTarget 的 +40）
export function fitTarget(b: Rect | null, vp: { w: number; h: number }, ins: Insets, o?: { maxK?: number }): View;
export function revealTarget(cur: View, r: Rect, vp: { w: number; h: number }, ins: Insets): View | null;   // r 已在可见区域内 → null
export function zoomAround(cur: View, s: Pt, f: number): View;                          // 夹到 [ZOOM_MIN, ZOOM_MAX]
export function compensate(cur: View, dLeft: number): View;                             // K97

// web/src/canvas/core/view/wheel.ts —— 纯函数
export type WheelIntent = { kind: 'zoom'; f: number } | { kind: 'pan'; dx: number; dy: number };
export function readWheel(e: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'deltaMode' | 'ctrlKey' | 'metaKey'>): WheelIntent;

// web/src/canvas/core/view/animate.ts
export function parseEase(token: string): (t: number) => number;   // 'cubic-bezier(a,b,c,d)' → 缓动函数；解析失败用 ease-out 三次曲线
export function parseMs(token: string): number;                      // '380ms' / '0.38s' → 毫秒；解析失败 0

// web/src/canvas/core/view/background.ts
export function createBackground(ctx: EngineCtx): { apply(v: View): void; dispose(): void };
// web/src/canvas/core/view/resize.ts
export function watchResize(ctx: EngineCtx, onResize: (size: { w: number; h: number }, dLeft: number) => void): () => void;
```
### 4.1 依赖
`W.03.02` 的 `View`、`ZOOM_MIN`、`ZOOM_MAX`、`ViewStoreApi.actions.setView / markFitted`；`W.03.03` 的 `ui.layout.fitInsets`；`W.06.10` 的 `geom.bounds`；`W.06.13` 的 `nest.closePeek`；`deps.theme`。

## 5. 数据结构
- 模块内部：`cur: View`（引擎当前正在显示的视图，store 的 `view` 只在帧末同步）、`size: {w, h}`、`left`（根元素上次的窗口横坐标）、`anim: { from, to, t0, ms, resolve } | null`、`zoomTimer`、`dur`（`--hx-t-4` 毫秒）、`ease`（`--hx-ease-out`）。
- 不新增持久化数据（视图持久化归 `W.03.02`）。

## 6. 行为

### 6.1 写视图（`apply` / 每帧 `view` 阶段）
1. `cur` 与上一次写入的值相同 → 什么都不写。
2. 世界容器：`transform = translate3d(x px, y px, 0) scale(k)`（x、y 保留 2 位小数，k 保留 4 位）；`will-change: transform` 写在 CSS 里（`U.17-R1`）。
3. 背景层（`scene.bg`）：网格间距 `step = L.grid × k`，`k < 0.5` 时 `step × 2`（`U.10.01-R2`）；写 `background-size: step step`、`background-position: x y`（`U.10.01-R3`）。点阵的颜色、点形在 `background.css` 里用 `--hx-grid-dot`（`U.10.01-R1`）。
4. 帧末 `view.actions.setView(cur)`（每帧最多一次，`W.06-R3`）；store 回调触发的 `apply` 因值相同不再写。

### 6.2 平移
- `panBy(dx, dy)`（屏幕像素）：`cur.x += dx`、`cur.y += dy`，`frame.request('view')`。拖动画布、触控板双指滑动、拖动节点到画布边缘的自动平移都走这里（`U.13.02` §1、§2）。
- 平移不改 `k`，不触发 `is-zooming`，不切换 LOD。

### 6.3 缩放
- `zoomAt(s, f)`：`cur = zoomAround(cur, s, f)`——光标下的世界点缩放前后在屏幕上不动（`U.10.01-R5`）；`k` 夹到 `[0.2, 2.5]`。
- 每次缩放给根元素加 `is-zooming`（CSS 里据此关闭网格、文字的过渡），最后一次缩放 120ms 后移除并调用 `onSettle(k)` 的回调（`U.10.01-R4`、`U.17-R9`；LOD 在这时切换，`U.10.06-R2`）。
- 预览浮层打开时，主画布的滚轮缩放先关闭预览（`nest.closePeek()`），再缩放（`U.13.06` §2）。
- `cmd.zoomBy(f)`：以可见区域中心（扣掉 `fitInsets`）为中心 `zoomAt`，带 `animateTo`（停靠栏 + / −，每次 ×1.2 或 ÷1.2）。

### 6.4 滚轮与触控板（`readWheel`）
| 输入 | 判定 | 结果 |
|---|---|---|
| `ctrlKey` 或 `metaKey` 为真，且 `|deltaY| < 50`、`deltaMode = 0` | 触控板捏合（浏览器把捏合报成带 Ctrl 的滚轮） | 缩放，`f = 1.1 ^ (−deltaY / 10)` |
| `deltaMode = 1`（按行）或 `2`（按页） | 鼠标滚轮 | 缩放，每格 ×1.1：`f = 1.1 ^ (−sign(deltaY))` |
| `deltaMode = 0`、`deltaX = 0`、`|deltaY| ≥ 50` | 鼠标滚轮（像素模式，一格约 100） | 缩放，`f = 1.1 ^ (−deltaY / 100)` |
| 其余 | 触控板双指滑动 | 平移，`panBy(−deltaX, −deltaY)` |
- 单次事件的 `f` 夹到 `[0.5, 2]`，防止异常大的增量一下跳满。
- 监听挂在根元素上，`passive: false` 并 `preventDefault()`（阻止页面滚动）；处理函数只记录意图，计算放进 `rAF`（多次滚轮在一帧内合并：缩放因子相乘、平移量相加，以最后一次的光标位置为中心）。
- 目标在节点的多行文本框、可滚动的内联控件、`hx-canvas-ui` 里的浮层上时不处理，交给元素自己（`U.10.07-R2`）。

### 6.5 适应画布、聚焦、移进视口
- `cmd.fit()`：`b = geom.bounds()`（当前层的节点和便签）；`fitTarget(b, size, insets)`：可见区域 `W = max(200, w − left − right)`、`H = max(160, h − top − bottom)`；`k = clamp(min(W / (b.w + 2·FIT_PAD), H / (b.h + 2·FIT_PAD)), 0.2, maxK=1)`；内容中心对准可见区域中心。空层：`k = 1`，世界原点放在可见区域中心。`insets` 取 `ui.layout.fitInsets`（`U.09.01-R1`、`W.02.02` §6.3），所以子图里会避开父图位置卡。
- `cmd.focusNodes(ids)`：同上，只算这些节点的包围盒（快捷键 `2`，`U.13.04` §2）。
- `reveal(r)`：`r`（世界矩形）已经完全在可见区域内 → 不动；比可见区域小 → 保持 `k` 只平移，让 `r` 居中；比可见区域大 → 按 `fitTarget` 缩放。给 `W.06.13` 的定位用（`U.13.03-R6`）。
- 三者都返回最终视图；`animate` 缺省为 true。

### 6.6 视图过渡（`animateTo`）
- 时长取 `--hx-t-4`、曲线取 `--hx-ease-out`（`U.07.01` §1）：构造时和 `theme` 报告 `motion` 变化时用 `getComputedStyle(root)` 读一次（不在帧任务里读）。
- 每帧插值 `x`、`y`、`k`（`k` 按对数插值，缩放感受均匀），写 `cur` 并 `request('view')`；完成时 resolve。
- 减少动效（`deps.theme.reducedMotion()`，或读到的时长为 0）：直接跳到目标（`U.07.04` §2）。
- 动画不阻塞操作（`U.07.01-R4`）：动画进行中有 `pointerdown`、滚轮、键盘平移 → 立即停在当前位置并 resolve 当前值；新的 `animateTo` 替换旧的。

### 6.7 视口尺寸变化（`P.09` K97）
- `ResizeObserver` 观察根元素：回调里（不在帧任务里）记新尺寸，并用 `root.getBoundingClientRect().left` 算根元素左边缘在窗口里移动了多少 `dLeft`。
- `cur = compensate(cur, dLeft)`：`x −= dLeft`。效果：左栏收展、右栏开合时，节点在屏幕上的位置不变（`U.09.02-R3`、`W.02.02` §10 验收 2）；右栏在窄屏覆盖画布时画布尺寸不变，什么都不做。
- 顶部横幅出现、消失（`W.02.02` §6.6）只改变高度、不补偿。
- 尺寸变化后通知 `W.06.05` 重新裁剪、`W.06.12` 重画小地图视口框。

### 6.8 背景（`U.23-R7`）
- `background.css`：点阵（`--hx-grid-dot`）、两团主题色光晕（CSS 动画，48 秒周期缓慢漂移）、细颗粒、四角暗角；光晕动画写在 `@media (prefers-reduced-motion: no-preference)` 里，并在 `html[data-motion="reduce"]` 下关闭（`U.07.04-R2`）。
- 指针柔光：根元素上的 `pointermove`（不论是否在拖动）记录最新屏幕坐标，`overlay` 阶段写到 `scene.bg` 的 `--_px`、`--_py`（几何值，`G.06.03-R9`）；只写 `bg`，不写根元素（避免整棵子树样式重算）。减少动效时不写。
- 缩放到 LOD 第 3 级时颗粒和指针柔光关闭（`.lod-3` 下隐藏），降低大图时的绘制成本。

## 7. 不变量
- 只有世界容器写 `transform`；节点、连线不因平移缩放而被写（`U.17-R1`）。
- `cur.k` 始终在 `[0.2, 2.5]`；`cur` 的三个值都是有限数。
- 每帧最多一次 `setView`；平移缩放期间 React 提交为 0（`U.17-R10`）。
- 侧栏收展前后，任一节点在窗口里的屏幕坐标变化 ≤ 1px。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `bounds` 为 null（空层） | §6.5 空层规则 |
| 视口尺寸为 0（画布被隐藏，如页面模式） | 不计算适应画布，等尺寸 > 0 再执行推迟的 `fit`（`needsFit` 保持） |
| 令牌解析失败 | 时长 0、曲线 ease-out，`console.warn` 一次 |
| 滚轮增量为 `NaN` | 忽略这一次 |

## 9. 性能与资源
- `view` 阶段写入 ≤ 0.2ms；平移、缩放时没有布局（Performance 无 Layout 块）、Paint flashing 只有背景层闪（`设17` §8）。
- 适应画布计算 ≤ 1ms（500 节点，`geom.bounds` 有缓存）。
- 每秒 120 次滚轮事件：每帧只处理一次。

## 10. 验收标准
1. 鼠标滚轮每格缩放 ×1.1，以光标为中心；触控板双指滑动平移、捏合缩放；`Ctrl` + 滚轮缩放（`U.10.01-R5`）。
2. 缩放过程中网格、文字没有过渡动画，停下 120ms 后恢复并切换 LOD（`U.10.01-R4`、`U.10.06-R2`）。
3. 在子图里按 `1`：节点不被父图位置卡、停靠栏、对话框、浮动回复遮挡（`W.02.02` §10 验收 5）。
4. 左栏收展、右栏开合：节点在屏幕上不移动（`W.02.02` §10 验收 2）。
5. 视图过渡进行中拖动画布：动画立即停止，画布跟手。打开减少动效后适应画布直接跳到目标。
6. 200 节点图上连续平移、缩放 5 秒：60fps，React 提交 0 次，localStorage 只在停下后写一次（与 `W0302-T4` 联合）。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/view/viewport.ts`、`fit.ts`、`wheel.ts`、`animate.ts`、`background.ts`、`background.css`、`resize.ts`，以及各自的 `*.test.ts`；`web/tests/e2e/canvas-view.spec.ts`。
- 不许碰的文件：`web/src/state/viewStore.ts`（只调用它的 action）、`web/src/shell/layout.ts`（`fitInsets` 由外壳算）、`web/src/canvas/core/` 下其他叶子的目录、`design/tokens.css`。
- 函数签名：见 §4。
- 测试用例：
  - `W0602-T1 apply`：同一视图 apply 两次只写一次 `transform`；`k=0.4` 时网格 `background-size` = `16px 16px`（20 × 0.4 × 2）
  - `W0602-T2 以光标为中心`：`zoomAround({x:0,y:0,k:1}, {x:100,y:50}, 2)` → 世界点 (100, 50) 缩放后仍在屏幕 (100, 50)；结果 `k` 夹在 2.5
  - `W0602-T3 滚轮判定`：`deltaMode=1, deltaY=3` → 缩放 1/1.1；`deltaMode=0, deltaY=100, deltaX=0` → 缩放；`ctrlKey, deltaY=-4` → 捏合放大；`deltaX=12, deltaY=8` → 平移 (−12, −8)
  - `W0602-T4 一帧合并`：同一帧 5 次滚轮缩放 → `setView` 1 次，`k` = 5 次因子之积
  - `W0602-T5 settle`：假时钟连续缩放 1 秒 → 期间 `is-zooming` 一直在；最后一次后 120ms 回调 `onSettle` 一次
  - `W0602-T6 适应画布`：包围盒 (0,0,1000,500)、视口 1440×900、`fitInsets` {28,28,200,64} → `k` 与手算一致、内容中心在可见区域中心；空层 → `k=1`
  - `W0602-T7 reveal`：矩形已在可见区域内 → null；在外面且较小 → 只平移、`k` 不变；比可见区域大 → 缩放
  - `W0602-T8 补偿`：根元素左边缘右移 208（左栏展开）→ `x` 减 208；左边缘不变、宽度减 340（右栏打开）→ 视图不变
  - `W0602-T9 过渡`：`animateTo` 进行中派发 `pointerdown` → Promise 以当前视图 resolve、之后不再写；`reducedMotion()=true` → 立即到目标
  - `W0602-T10 令牌解析`：`parseMs('380ms')=380`、`parseMs('.2s')=200`、`parseEase('cubic-bezier(0.2,0.8,0.2,1)')(0.5)` 与数值解一致（误差 < 0.001）
  - `W0602-T11 预览关闭`：预览打开时滚轮 → `nest.closePeek` 先被调用
  - `W0602-T12 文本框滚轮`：目标在 `[data-ctl="area"]` 里 → 不缩放、不 `preventDefault`
  - `W0602-T13 端到端`：§10 验收 1、3、4、6（Playwright）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R23、R25）；另：不在帧任务里调用 `getComputedStyle` / `getBoundingClientRect`；不对节点逐个写位置来实现平移；不为了"视图同步"在每次 `pointermove` 时写 store；不写裸颜色、裸时长（时长从令牌读）。
- 完成标志：`G.14` 全部条件；§10 六条验收通过。
