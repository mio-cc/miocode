# W.06.05 LOD 与视口裁剪

| 项 | 内容 |
|---|---|
| 编号 | W.06.05 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设17 R7、R9、§5；demo `设计规范_v0.3/src/24_render.js`（`cull`、LOD 判断）、`03_node.css`（`.lod-2`、`.lod-3`）；demo v0.5 `40_tidy.js`（阈值 0.55 / 0.3）、`15_art.css`（骨架条）；`P.09` K94 |
| 最后修改 | 2026-11-23 |

## 1. 职责
按缩放决定细节级别（LOD）并在缩放停下时切换；节点多时只渲染视口附近的节点和连线（视口裁剪）；向其他模块报告某个节点当前是否可见、哪些节点刚变为可见。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 缩放过程、"停下"的判定 | `W.06.02`（`onSettle`） |
| 每一级具体隐藏哪些元素的样式细节以外的结构 | `W.06.03`、`W.06.04`（它们的 DOM 结构配合本文的类） |
| 空间索引 | `W.06.10`（`geom.query`） |
| 小地图、缩略图、预览浮层、父图位置卡的简化图 | `W.06.12`、`W.06.13`（不受 LOD 影响，`U.10.06-R4`） |
| 流动动画最多几条 | `W.06.15` |

## 3. 继承的上级约束
`W.06` §4.4（`LodApi`）、§6.2（`cull` 阶段）、`W.06-R3`、`R4`；`U.10.06`（`P.09` K94 修订后）；`U.23-R9`；`U.10.04` §3；`U.07.03-R2`；`U.17-R7`、`R9`；`U.16` §3（被裁剪的节点仍可用键盘到达）。

## 4. 接口
```ts
// web/src/canvas/core/render/lod.ts
export const LOD_FULL = 0.55;          // k ≥ 0.55：第 1 级（K94）
export const LOD_TITLE = 0.3;          // k < 0.3：第 3 级；之间为第 2 级
export function lodOf(k: number): Lod;
export function createLod(ctx: EngineCtx): Omit<LodApi, 'visible' | 'culling' | 'onReveal' | 'pin'> & { dispose(): void };

// web/src/canvas/core/render/cull.ts
export const CULL_MIN_NODES = 150;     // 超过才裁剪（U.10.06-R3、U.17-R7）
export const CULL_MARGIN = 200;        // 视口外留的缓冲，屏幕像素
export function visibleRect(v: View, vp: { w: number; h: number }, margin: number): Rect;   // 世界坐标
export function edgeBox(a: Pt, b: Pt): Rect;                                                  // 含控制点偏移（≤ 180）的包围盒
export function createCull(ctx: EngineCtx): Pick<LodApi, 'visible' | 'culling' | 'onReveal' | 'pin'> & { recull(): void; dispose(): void };
```
`engine.ts` 把两者合成 `ctx.lod`。

### 4.1 依赖
`W.06.02` 的 `vp.onSettle`、`vp.zooming()`、`ctx.view()`、`ctx.viewport()`；`W.06.10` 的 `geom.box`、`geom.query`、`geom.pos`；`W.06.03` / `W.06.04` 的元素（通过 `ctx.nodes.el(id)`、`ctx.pool`）；`W.03.01` 的 `nodesIn`、`edgesIn`。

## 5. 数据结构
- `level: Lod`；`culled: Set<Ulid>`（当前被裁剪的节点）；`hiddenEdges: Set<Ulid>`；`pinned: Map<Ulid, number>`（计数，可多方同时钉住）；`frameCount`（平移中每 4 帧裁剪一次）。
- 三级的显示规则（`U.10.06` §1，K94 修订）：

| 级别 | 缩放 | 节点 | 连线 |
|---|---|---|---|
| 1 | ≥ 0.55 | 完整：端口名、类型行、内联控件、状态文字、子图缩略图 | 正常 |
| 2 | 0.3–0.55 | 端口名、类型行、控件标签变成骨架条（保留位置的淡灰圆角条，`U.23-R9`）；控件变淡（透明度 0.55）且不可操作；保留端口圆点、标题（放大到 15）、状态点、状态条、缩略图 | 正常 |
| 3 | < 0.3 | 只剩卡片底色、类别色、标题（字号按缩放反向放大，屏幕上至少 12px）和状态点；缩略图只留底色 | 屏幕上 1px；关闭流动动画（`U.07.03-R2`） |

## 6. 行为

### 6.1 级别切换
1. 绑定文档、换层、`fit` 完成时：直接按当前 `k` 设级别（不等待）。
2. 缩放过程中不切换（`U.10.06-R2`）；`vp.onSettle(k)`（停下 120ms）时：`lodOf(k)` 与当前不同 → 根元素换类：`lod-1` 去掉、`.lod-2` / `.lod-3`（第 1 级不加类）。
3. 同时（不论级别是否变化）写根元素的 `--_inv = (1 / k)`（保留 4 位小数），第 3 级的标题放大、连线 1px 都用它计算（`W.06.04` §6.5）；只在停下时写，缩放过程中不写。
4. 级别变化后通知 `onChange` 的订阅者（`W.06.15` 据此关闭 / 恢复流动动画；`W.06.08` 据此在第 3 级不允许从端口开始拖线）。
- 隐藏一律用 `visibility` 或颜色透明，不用 `display`，元素尺寸不变（`U.10.06-R1`），所以端口坐标在三级之间不变。
- 样式写在 `lod.css`：`.hx-canvas.lod-2 .hx-port__name { … }` 这类规则；不在 JS 里逐个元素改样式。

### 6.2 视口裁剪何时开启
- 当前层节点数 > 150 时开启，≤ 150 时关闭并恢复全部元素（`U.10.06-R3`）；节点数在 145–155 之间来回变化时，以 150 为界、不加迟滞（增删节点是低频操作）。
- 关闭状态下 `visible(id)` 恒为 true，`culling()` 为 false。

### 6.3 裁剪
1. 可见范围 = 视口按当前视图换成世界坐标后四周各扩 `CULL_MARGIN / k`（`visibleRect`）。
2. 节点：`geom.query(range)` 得到可见集合（节点多于 500 时它用网格索引，`W.06.10`）；加上 `pinned` 里的节点（拖动中的、键盘焦点所在的、选中的）。可见 → 去掉 `is-culled`；不可见 → 加 `is-culled`（CSS：`content-visibility: hidden`）。只改状态变化了的节点。
3. 连线：两端节点都不可见、且 `edgeBox(源端口, 目标端口)` 与可见范围不相交 → 元素 `display: none`（这是连线层的唯一例外：被裁剪的连线不占布局也不需要尺寸）；否则显示。
4. 刚从不可见变为可见的节点 ID 交给 `onReveal` 的订阅者（`W.06.15` 补写最新运行状态，`W.06.03` 补写被推迟的内容）。
- 执行时机：视图停止变化 80ms 后执行一次；连续平移期间每 4 帧执行一次；当前层结构变化、视口尺寸变化后的下一帧执行一次。都在 `cull` 阶段。

### 6.4 被裁剪的节点
- 仍在 DOM 里，`data-node-id` 和 `aria-label` 保留；`content-visibility: hidden` 的内容不渲染。
- `W.06.03` 对被裁剪节点的 `patch` 只记录"需要更新"，`onReveal` 时再写（运行状态同理，由 `W.06.15` 处理）。
- 键盘把焦点移到一个被裁剪的节点（`W.06.09`）：先 `pin`，再 `vp.reveal(geom.box(id))`，然后聚焦。

## 7. 不变量
- 级别只在缩放停下（或绑定、换层、适应画布）时变化。
- 节点数 ≤ 150 时没有任何节点带 `is-culled`、没有连线被隐藏。
- 被钉住的节点永远可见；拖动中的节点和它的相连连线永远可见。
- 三个级别下节点的外框尺寸相同（`geom.box` 不随级别变化）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 视口尺寸为 0 | 不裁剪，保持上一次的结果 |
| `geom.query` 抛错 | 本次退回全部可见，`console.error` 一次 |
| 浏览器不支持 `content-visibility` | 退化为 `visibility: hidden`（CSS `@supports`） |

## 9. 性能与资源
- 1000 节点裁剪一次 ≤ 2ms（有网格索引）；200 节点 ≤ 0.5ms。
- 级别切换（换一个类 + 写 `--_inv`）引起的样式重算 ≤ 8ms（200 节点），只在停下时发生一次。
- 1000 节点平移 ≥ 30fps（`W.06` §9）。

## 10. 验收标准
1. 缩放到 0.6、0.4、0.2：分别是完整、骨架条、只剩标题；没有空白方块（`U.23-R9`）；缩放过程中级别不跳变，停下 120ms 后切换。
2. 第 3 级标题在屏幕上不小于 12px，连线 1px 且没有流动动画。
3. 300 节点的图：视口外的节点带 `is-culled`、相应连线被隐藏；平移过去后节点出现且显示最新运行状态。
4. 150 节点以下不裁剪。
5. 拖动一个节点到视口边缘外再拖回来：节点一直可见。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/render/lod.ts`、`lod.css`、`cull.ts`、`lod.test.ts`、`cull.test.ts`；`web/tests/visual/canvas-lod.spec.ts`。
- 不许碰的文件：`render/node.ts`、`render/edge.ts`（只用它们的元素和类名约定）、`geom/`、`view/`、`web/src/state/`、`design/tokens.css`。
- 函数签名：见 §4。
- 测试用例：
  - `W0605-T1 阈值`：`lodOf(0.55)=1`、`lodOf(0.5499)=2`、`lodOf(0.3)=2`、`lodOf(0.2999)=3`
  - `W0605-T2 只在停下切换`：缩放中 `k` 从 1 到 0.2 每帧变化 → 根元素类不变；`onSettle(0.2)` 后为 `lod-3`、`--_inv=5.0000`
  - `W0605-T3 绑定立即设置`：绑定时 `k=0.4` → 立即 `lod-2`，不等 `onSettle`
  - `W0605-T4 onChange`：1 → 3 → 3 → 2 只通知两次
  - `W0605-T5 不用 display`：`lod.css` 里 `.lod-2`、`.lod-3` 规则只用 `visibility` / `color` / `opacity`（样式表静态检查）
  - `W0605-T6 开关`：149 个节点不裁剪；151 个开启；删到 150 关闭并去掉全部 `is-culled`
  - `W0605-T7 裁剪结果`：视口 1000×600、`k=1`、原点 (0,0)：位于 (2000, 0) 的节点被裁剪，位于 (1100, 0) 的（在 200 缓冲内）不被裁剪
  - `W0605-T8 连线`：两端都被裁剪但曲线穿过视口的连线仍显示；两端都在外且不相交的被隐藏
  - `W0605-T9 onReveal`：平移后 3 个节点变为可见 → `onReveal` 收到这 3 个
  - `W0605-T10 钉住`：`pin([a])` 后 a 在视口外也不被裁剪；释放后下一次裁剪生效
  - `W0605-T11 频率`：连续平移 40 帧 → 裁剪执行 10 次；停下 80ms 后再 1 次
  - `W0605-T12 视觉`：§10 验收 1、2（Playwright 截图，浅色 / 深色）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R23、R25）；另：缩放过程中不切换级别、不写 `--_inv`；不用 `display: none` 隐藏节点或节点内的元素；不在裁剪时删除或重建节点元素。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。
