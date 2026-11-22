# W.06.12 小地图

| 项 | 内容 |
|---|---|
| 编号 | W.06.12 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设07（小地图、缩略图）；demo `设计规范_v0.3/src/24_render.js`（`drawGraph` 的 `thumb` / `mini` 两种模式）；demo v0.5 `29_nest.js`（`drawParent`：父图位置卡里描出当前容器节点）；`P.09` K98、K107 |
| 最后修改 | 2026-11-23 |

## 1. 职责
两件事：① `minimap/paint.ts`：所有简化图的绘制器 `ThumbPainter`——节点上的子图缩略图、小地图、父图位置卡、预览浮层都用它在 `<canvas>` 上画"方块 + 线"（`U.10.06-R4`、`U.17-R11`）；② `minimap/minimap.ts`：小地图的内容——当前层的简化图、视口框、点击和拖动小地图移动主画布。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 小地图的外框、抓手拖动、吸附、记住位置、缩放百分比、类型图例开关和图例内容 | `W.07.06`（React；`U.09.01` ③b、R6，`U.03.03-R5`；`U.09.01-R6` 的"可拖动"指外框，`P.09` K98） |
| 窄画布下隐藏小地图 | `W.07.06`（`U.09.01-R4`；隐藏后挂载点尺寸为 0，本文停止绘制） |
| 节点缩略图什么时候重画 | `W.06.03`（建节点、子图结构变化、主题）、`W.06.15`（运行中每 400ms） |
| 父图位置卡、预览浮层画什么层、什么时候画 | `W.06.13` |
| 视图怎么变 | `W.06.02`（本文调 `vp.apply` / `vp.animateTo`） |

## 3. 继承的上级约束
`W.06` §4.2（`cmd.mountSlot`）、§4.4（`ThumbPainter`）、§6.2、§6.3（theme 行）、`W.06-R2`–`R4`；`W.01-R10`（`mountSlot` 例外）；`W.02.03` §6.2 第 5 步；`U.03.04-R6`；`U.09.01` ③b、`R4`、`R6`；`U.10.04` §1–§3；`U.10.06-R4`；`U.13.06` §2–§3；`U.17-R11`；`U.07.04`；`P.09` K98。

## 4. 接口
```ts
// web/src/canvas/core/minimap/paint.ts
export type ThumbMode = 'thumb' | 'mini' | 'card' | 'peek';
export function createThumbPainter(ctx: EngineCtx): ThumbPainter & { refreshPalette(): void; dispose(): void };   // ThumbPainter 见 W.06 §4.4
export type ThumbPalette = { bg: string; line: string; node: string; nodeDim: string; mark: string;
  running: string; done: string; waiting: string; failed: string; frame: string };          // 从 CSS 变量读出的颜色字符串
export function readPalette(root: HTMLElement): ThumbPalette;                               // 只在构造和主题变化时调用
export function fitInto(b: Rect | null, cw: number, ch: number, pad: number): { s: number; ox: number; oy: number };   // 纯函数
export const THUMB_PAD = 6;                              // 简化图四周留白，CSS 像素
export const DPR_MAX = 2;                                // 绘制分辨率上限

// web/src/canvas/core/minimap/minimap.ts
export function createMinimap(ctx: EngineCtx): { mount(host: HTMLElement): () => void; dispose(): void };   // cmd.mountSlot('minimap', host) 转到这里
export const MINI_REDRAW_MS = 400;                       // 运行中、拖动结束后内容层最短重画间隔（U.17-R11）
```
`ThumbPainter.paint(cv, src, o)`：在 `cv` 上画 `src.model` 里 `src.scope` 这一层；`o.mode` 决定样式（§6.2）；`o.mark` 给出要描边的节点（父图位置卡里的当前容器节点）；`o.view` 给出时按它画（预览浮层可平移缩放），否则自动适应；返回世界坐标 → 画布坐标的变换 `{s, ox, oy}`（`画布 x = 世界 x × s + ox`）。

### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`geom`、`model()`、`scope()`、`view()`、`viewport()`、`vp`、`frame`、`drag`、`scene.root`、`doc().stores.run`、`doc().stores.view`、`deps.theme`、`deps.t`）；`W.06.10` 的 `geom.box`、`geom.forModel`；`W.03.01` 的 `nodesIn`、`edgesIn`、`notesIn`；`W.03.04` 的 `LiveRun.stateOf`、`RunState.tick`；`W.03.02` 的 `View`。

## 5. 数据结构
- `palette: ThumbPalette`：从根元素 `getComputedStyle` 读 `--hx-bg-1`、`--hx-line-3`、`--hx-text-3`、`--hx-mark-c*`、`--hx-accent`、`--hx-ok`、`--hx-wait`、`--hx-danger`、`--hx-text-1`（视口框、描边）；颜色从令牌来，不写裸值（INV-20、`U.03.04-R6`）。缓存到下一次主题变化——每次重画都从这份缓存取，主题一变就重新读并全部重画。
- 小地图：`host`、两层 `<canvas>`：`cv.content`（简化图）和 `cv.frame`（视口框，叠在上面）；`map: {s, ox, oy}`（最近一次内容层的变换）；`dirty: boolean`；`lastPaint: number`；`size: {w, h}`（`ResizeObserver` 观察 `host`）。

## 6. 行为

### 6.1 绘制器（`paint`）
1. 画布像素尺寸：`cv.width = 显示宽 × min(devicePixelRatio, DPR_MAX)`（显示宽高由调用方给出，绘制器不读布局）；先 `clearRect`，铺 `palette.bg`。
2. 变换：有 `o.view` → `s = view.k × 比例`，`ox`、`oy` 取 `view`；否则 `fitInto(该层所有节点和便签的包围盒, 宽, 高, THUMB_PAD)`，宽高比保持，居中。空层 → 只铺底色，返回 `{s:1, ox:0, oy:0}`。
3. 连线：每条连线一段直线，从源节点右边中点到目标节点左边中点，`palette.line`、线宽 1（CSS 像素）。不画贝塞尔（缩略图里看不出差别，省时间）。
4. 节点：每个节点一个圆角矩形（半径 `2 × s`，最小 1），尺寸取 `geom.box`（`model` 不是当前文档时用 `geom.forModel(model).box`）；底色：
   | 条件 | 颜色 |
   |---|---|
   | 有 `src.live` 且最新执行状态为 running / queued | `palette.running` |
   | done / cached | `palette.done` |
   | waiting | `palette.waiting` |
   | failed | `palette.failed` |
   | 其余（含没有运行） | `palette.node`（`text-3` 低透明度，`U.10.04` §2） |
5. 便签：`mode` 为 `mini`、`peek` 时画成淡色矩形（`palette.nodeDim`），有标记色时用对应 `--hx-mark-cN`；`thumb`、`card` 不画便签。
6. `o.mark`：在那个节点外 3px 画 1.5px `palette.frame` 描边（父图位置卡里标出当前容器节点，`U.13.06` §3）。
7. 各模式的差别：
   | 模式 | 尺寸 | 额外 |
   |---|---|---|
   | `thumb` | 节点宽 − 12 × 64（`W.06.03` §6.5） | 右下角"N 个节点"由 `W.06.03` 用 DOM 文字显示，不画在 canvas 上 |
   | `mini` | 小地图挂载点大小（196 × 120） | 视口框画在另一层（§6.3） |
   | `card` | 父图位置卡挂载点大小（宽 236） | `o.mark` 描边 |
   | `peek` | 预览浮层主体大小 | 可带 `o.view` |
8. 不受 LOD 影响（`U.10.06-R4`）；第 3 级时节点缩略图的 canvas 由 `W.06.03` / `W.06.05` 的 CSS 隐藏内容，本文不判断级别。
9. 绘制抛错：清成底色，`console.error` 一次（同一 `mode` 每分钟最多一次），返回 `{s:1, ox:0, oy:0}`。

### 6.2 何时重画（汇总）
| 简化图 | 触发 | 负责 |
|---|---|---|
| 节点缩略图 | 节点建好；子图结构变化；运行中每 400ms；主题变化 | `W.06.03`、`W.06.15` |
| 小地图 | §6.4 | 本文 |
| 父图位置卡、预览浮层 | 换层、结构变化、运行中每 400ms、主题变化 | `W.06.13` |
- 主题变化（`deps.theme.subscribe` 报告 `palette` 或 `theme`）：`refreshPalette()`，然后通知上面每一种都全部重画（`W.02.03` §6.2 第 5 步、`U.03.04-R6`）；`motion` 变化与本文无关。

### 6.3 小地图挂载（`mountSlot('minimap', host)`，`P.09` K98）
1. `host` 是 `W.07.06` 交给引擎的空容器；本文在里面建两个 `<canvas class="hx-mini__cv">`（内容层、视口框层，绝对定位叠放），`ResizeObserver` 观察 `host`（回调不在帧任务里）。返回的函数：断开观察、移除两个 canvas 和本文在它们上面加的监听。同一时刻最多挂载一个小地图，再次挂载先解除旧的。
2. 尺寸为 0（被 `W.07.06` 隐藏、窄画布）→ 不画，`dirty=true`，恢复尺寸后立即画一次。
3. `host` 以外的元素一律不碰（`W.01-R10`）。

### 6.4 小地图内容层
- 画当前层：`paint(cv.content, {model, scope, live}, {mode:'mini'})`，保存返回的 `map`。
- 内容层重画时机（都放在下一帧的 `overlay` 阶段执行，同一帧最多一次）：
  | 事件 | 处理 |
  |---|---|
  | 绑定文档、换层、主题变化、尺寸变化 | 立即标脏 |
  | graph `change`（结构或位置变化） | 标脏；正在拖动（`drag.activeGroup() ≠ null`）或整理布局动画中不画，结束后画一次 |
  | run `tick` 变化（运行中，最多每 400ms，`W.03.04` §6.4） | 有正在运行的节点时标脏 |
  | 视图变化 | 不重画内容层（内容层用自己的适应变换，与视图无关） |
- 两次内容层重画间隔 ≥ `MINI_REDRAW_MS`（运行中、拖动结束），结构变化（增删节点、换层）不受此限（`U.17-R11`）。

### 6.5 视口框层
- 订阅 view store 的 `view`（每帧最多一次 `setView`，`W.06.02` §6.1）和视口尺寸变化：在 `overlay` 阶段把主画布可见范围（`ctx.viewport()` 换成世界坐标）经 `map` 变换后画成 1.5px `palette.frame` 矩形，框外区域蒙一层半透明底色；只清这一层，不动内容层（每帧 ≤ 0.2ms）。
- 可见范围超出内容包围盒时框会被裁到画布边缘，不扩大内容层的比例。

### 6.6 点击与拖动小地图
- 监听挂在本文自己建的视口框层 canvas 上（它不在画布根元素里，不受 `W.06.07`"根元素只有一组指针监听"约束；内部同样只记最后一次 `pointermove`，在帧里处理，`U.17-R3`）。
- `pointerdown`：把点到的位置（反变换成世界坐标）作为主画布可见区域中心，`vp.apply` 直接跳过去（不播动画，和拖动的手感一致）；`setPointerCapture`；之后 `pointermove` 每帧把可见中心跟到指针处；`pointerup` / `lostpointercapture` 结束。
- 滚轮：在小地图上滚动 = 以可见中心缩放主画布（`vp.zoomAt(可见中心, f)`，`f` 的算法同 `W.06.02` §6.4）。
- 只读画布照常可用（导航不是编辑）。键盘不可聚焦（小地图是指针辅助；键盘用户用 `1`、`2`、方向键平移）；canvas 带 `aria-hidden="true"`。

## 7. 不变量
- 所有简化图的颜色都来自令牌（经 `palette`）；没有写死的颜色字符串。
- 小地图内容层在运行中两次重画间隔 ≥ 400ms；平移、缩放时只重画视口框层。
- 本文只在 `mountSlot` 给的 `host` 里建、删自己的 canvas，不读写 `host` 的其他子元素和祖先。
- `paint` 不读布局（不调 `getBoundingClientRect`、`offsetWidth`）；尺寸只来自调用方和 `ResizeObserver`。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `getContext('2d')` 返回 null | 这个简化图不画，`console.error` 一次 |
| 读到的颜色为空字符串（令牌缺失） | 用 `palette.node` 代替，开发模式 `console.warn` 一次 |
| 挂载点尺寸为 0 | §6.3 第 2 步 |
| 绘制抛错 | §6.1 第 9 步 |

## 9. 性能与资源
- `paint`：200 节点 300 连线 ≤ 2ms；节点缩略图（≤ 30 个节点的子图）≤ 0.3ms。
- 30 个节点同时运行：小地图 + 10 个容器节点的缩略图每 400ms 重画一轮，合计 ≤ 5ms，分摊不掉帧。
- 视口框层每帧 ≤ 0.2ms。
- 每个 canvas 的绘制尺寸 ≤ 显示尺寸 × 2。

## 10. 验收标准
1. 小地图显示当前层的方块和连线，视口框随平移缩放实时移动；拖动视口框，主画布跟着移动；进入子图后小地图换成子图的内容。
2. 运行中小地图里节点按状态着色，刷新间隔 ≥ 400ms（Performance 录制统计内容层重画次数）。
3. 切换配色和明暗：小地图、节点缩略图、父图位置卡、预览浮层的颜色同步变化（`U.03.04` §3 验收 2）。
4. 拖动小地图外框（`W.07.06`）后小地图内容不重画；窄画布隐藏小地图期间没有绘制调用。
5. 平移 1 秒：小地图内容层重画 0 次，React 提交 0 次。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/minimap/paint.ts`、`minimap.ts`、`minimap.css`（两层 canvas 的叠放；尺寸跟随挂载点），以及 `paint.test.ts`、`minimap.test.ts`；`web/tests/visual/canvas-minimap.spec.ts`。
- 不许碰的文件：`web/src/panels/dock/`（小地图外框在 `W.07.06`）、`render/`、`nest/`、`runBridge.ts`、`geom/`、`web/src/state/`、`design/tokens.css`。
- 函数签名：见 §4。
- 测试用例（jsdom + 假 `CanvasRenderingContext2D` 记录调用；假时钟）：
  - `W0612-T1 fitInto`：包围盒 1000×500 放进 196×120（留白 6）→ `s = 0.184`，居中
  - `W0612-T2 颜色来自令牌`：`readPalette` 只读 `--hx-*` 变量；源码 `minimap/` 下没有 `#` 开头的颜色或 `rgb(`（lint）
  - `W0612-T3 运行着色`：`live.stateOf(a).state='running'` → a 用 `palette.running` 填充；没有 `live` → 全部 `palette.node`
  - `W0612-T4 mark 描边`：`o.mark=x` → 在 x 外描一个矩形
  - `W0612-T5 view`：给 `o.view={x:10,y:20,k:0.5}` → 返回的 `s`、`ox`、`oy` 按它计算，不自动适应
  - `W0612-T6 挂载与解除`：`mount(host)` 后 `host` 下 2 个 canvas；解除后 0 个、`ResizeObserver` 已断开；再次挂载先解除旧的
  - `W0612-T7 节流`：运行中 `tick` 每 100ms 变一次 → 1 秒内内容层重画 ≤ 3 次；加一个节点 → 下一帧立即重画
  - `W0612-T8 拖动不画`：`drag.activeGroup()` 非空期间 `change` 到达 → 不画；拖动结束后画 1 次
  - `W0612-T9 平移只画框`：连续 60 次 `setView` → 内容层 0 次、框层 ≤ 60 次
  - `W0612-T10 点击导航`：点小地图 (98, 60) → `vp.apply` 收到的视图使该点对应的世界坐标位于可见区域中心
  - `W0612-T11 尺寸为 0`：挂载点 0×0 → 不调用绘制；恢复尺寸后画 1 次
  - `W0612-T12 主题`：`theme` 报告 `palette` 变化 → `readPalette` 调用 1 次，小地图重画 1 次，并通知节点缩略图重画
  - `W0612-T13 视觉`：§10 验收 1、3（Playwright 截图，4 套配色 × 浅 / 深）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R23、R25）；另：不写死颜色；不在平移缩放时重画内容层；不碰挂载点以外的 React 元素；不在帧任务里读布局。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。
