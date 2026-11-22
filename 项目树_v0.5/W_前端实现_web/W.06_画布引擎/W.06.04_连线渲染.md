# W.06.04 连线渲染

| 项 | 内容 |
|---|---|
| 编号 | W.06.04 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设09（连线形状、颜色、状态）；设17 R4、R8；demo `设计规范_v0.3/src/24_render.js`（`renderEdge`：glow / edge / flow / hit 四条路径）、`04_edge.css`；demo v0.5 `15_art.css`（线宽、透明度） |
| 最后修改 | 2026-11-23 |

## 1. 职责
把当前层的连线画进画布唯一的 SVG：每条连线的路径、颜色、选中与悬停样式、点击热区；节点移动时只重算相连连线；给运行状态（完成、未激活、流动）、幽灵提议、拖线预览提供写入接口。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 贝塞尔控制点、端口坐标 | `W.06.10`（`geom.edgePath`、`geom.bezier`） |
| 悬停时的"+""×"按钮、拖线、断线、改接 | `W.06.08` |
| 哪条连线在流动、完成、未激活；最多保留几条流动 | `W.06.15`（调本文 `setRun`、`setFlow`） |
| 幽灵连线的数据 | `W.06.14`（调本文 `setMark`，幽灵连线的元素也由本文画在 `edgeGhost` 组里） |
| 视口裁剪时隐藏哪些连线 | `W.06.05`（它对本文的元素设 `display`） |
| 元素复用 | `W.06.06` |

## 3. 继承的上级约束
`W.06` §4.4（`EdgeLayer`）、§5、§6.2（`struct`、`patch`、`geom` 阶段）、`W.06-R3`、`R4`、`R10`；`C.02.03`；`C.04.01-R4`；`U.03.03-R2`、`R3`；`U.10.03` §2；`U.10.05`；`U.10.06` §1（第 3 级 1px）；`U.07.03`（流动光点）、`U.07.03-R1`、`R2`；`U.07.04` §2；`U.12` §3；`U.17-R4`、`R8`；`U.16` §3（连线的可访问名称）。

## 4. 接口
```ts
// web/src/canvas/core/render/edge.ts
export function createEdgeLayer(ctx: EngineCtx): EdgeLayer & { dispose(): void };   // EdgeLayer 见 W.06 §4.4
export function edgeCategory(m: GraphModel, e: EdgeRec, g: Geom): Category;          // 源端口的显示类别（U.03.03-R2）
export function edgeLabel(m: GraphModel, e: EdgeRec, t: EngineDeps['t']): string;    // "{源} 的 {端口} 连到 {目标} 的 {端口}"（U.16 §3）
```
### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`geom`、`pool`、`lod`、`scene.edgeBase / edgeFlow / edgeGhost / edgePreview`）；`W.03.01` 的 `edgesIn`、`EdgeRec`；`W.06.10` 的 `NodeShape.outPorts`（取类别）。

## 5. 数据结构
### 5.1 一条连线的 DOM
```
g.hx-edge[data-edge-id][role=img][aria-label]       放在 scene.edgeBase；幽灵连线放在 scene.edgeGhost
   class: is-selected · is-hover · is-done · is-inactive · is-ghost · is-ghost-remove · is-flow
   style: --_ec: var(--hx-type-<源端口类别>)
├─ path.hx-edge__glow      选中时可见：6px 宽、透明度 0.18（U.10.03 §2）
├─ path.hx-edge__line      线宽 1.75；悬停、选中 2.5；颜色 --_ec，透明度 0.75，is-done 时 1
└─ path.hx-edge__hit       14px 宽、透明，点击热区（U.10.03 §2）
```
- 流动层（`U.07.03`）：`setFlow(id, true)` 时在 `scene.edgeFlow` 里加一条 `path.hx-edge__flow[data-edge-id]`（`stroke-dasharray: 1 11`、圆头、`--hx-accent`、CSS 动画 `stroke-dashoffset`），`false` 时移除。流动层只给活跃连线（`U.17-R8`）。
- 三条（流动时四条）路径的 `d` 相同，一次计算写四处。
- 拖线预览：`scene.edgePreview` 一条路径，`look` 为 `free`（源类型色实线）、`snap`（加粗）、`bad`（`--hx-danger` 虚线，`U.10.03` §3）。

### 5.2 模块内部
- `byNode: Map<Ulid, Set<Ulid>>`：当前层节点 → 相连连线（`ofNode`、`updateFor` 用）；`sync` 时维护。
- 每个元素缓存上一次写的 `d`、`--_ec`、类名；值没变不写。

## 6. 行为

### 6.1 同步（`sync`）
| `SceneChange` | 处理 |
|---|---|
| `full` / `structure` | 对当前层 `edgesIn(model, scope)`：没有元素的 → `pool.edge(id)` 建三条路径；层里没有了的 → `pool.release('edge', id)`；重建 `byNode`；全部 `geom` 阶段重算 |
| `edges` 里的 ID | 新增 / 删除 / 端点变化（改接）同上，只处理这些 |
| `nodes` 里的 ID | 这些节点相连的连线放进本帧的 `geom` 待算集合（节点被删时相连连线也已在 `edges` 里） |
- 颜色：`edgeCategory` = 源端口的显示类别（`C.04.01-R4`，`$T` 端口用推断类型，`P.09` K99）；只在建元素、源端口类型变化时写 `--_ec`。
- 端点节点不在当前层或不存在（不应出现）→ 不画这条线，`console.warn` 一次。

### 6.2 几何（`geom` 阶段）
- 待算集合里每条连线：`geom.edgePath(id)` → 写 `d`（三条或四条路径）。`geom.pos` 先读 `ctx.live`，所以拖动中的位置自动生效。
- `updateFor(nodeIds)`：把这些节点的相连连线放进待算集合并 `request('geom')`；拖动时 `W.06.07` 每帧调用一次（`U.17-R4`：只算相连的）。
- 节点高度变化（状态脚出现）不影响端口位置（端口在状态脚之上），不重算。

### 6.3 选中、悬停
- `paintSelection(ids)`：与上一次的集合求差，只改有变化的元素的 `is-selected`；选中的连线移到 `edgeBase` 的最后（画在最上面），取消选中时不移回（顺序不影响含义）。
- `setHover(id)`：`is-hover`（线宽 2.5，`U.10.03` §2）；同时只有一条。悬停是由谁触发、中点按钮怎么显示，归 `W.06.08`。

### 6.4 运行状态（`W.06.15` 调用）
| 调用 | 效果 |
|---|---|
| `setRun(id, 'done')` | `is-done`：透明度 1（上游完成，`U.10.03` §2） |
| `setRun(id, 'inactive')` | `is-inactive`：虚线、透明度 0.35（分支没走这条，运行中和运行后） |
| `setRun(id, 'idle')` | 去掉两者 |
| `setFlow(id, on)` | 加 / 删流动层路径（§5.1）；LOD 第 3 级时忽略 `on=true` 并删除已有的（`U.07.03-R2`）；减少动效时不加流动层，改为 `is-flow`：实线加粗 2.5（`U.07.04` §2） |
- "最多 30 条流动"的取舍由 `W.06.15` 决定（`U.07.03-R1`），本文不计数。

### 6.5 LOD
- 第 3 级（`.lod-3`）：线在屏幕上 1px 宽，热区在屏幕上仍约 14px，便于点中。做法：`W.06.05` 在缩放停下时给根元素写 `--_inv = 1 / k`（几何值），CSS 里线宽写 `calc(1px * var(--_inv))`、热区写 `calc(14px * var(--_inv))`；缩放过程中不更新（`U.10.06-R2`）。线宽 1.75 / 2.5、光晕 6、热区 14 是 `U.10.03` §2 规定的几何量，写在 `edge.css` 里并注释出处（`G.06.03-R1` 的令牌范围不含描边宽度）。
- 第 1、2 级外观相同。

### 6.6 幽灵与提议
- `setMark(id, 'ghost', on)`：模型色虚线（`U.12` §3）；幽灵连线不在图里，`W.06.14` 用本文的 `drawGhost(tmpId, a, b)`（见下）在 `edgeGhost` 组里画。
- `setMark(id, 'ghost-remove', on)`：被提议删除的连线，红色虚线（`U.12` §3）。
```ts
// 给 W.06.14 的补充接口（同文件导出，不放进 EdgeLayer）
export function drawGhost(ctx: EngineCtx, key: string, from: Pt, to: Pt, cat: Category): void;   // key 为提议里的临时 ID
export function clearGhosts(ctx: EngineCtx): void;
```

## 7. 不变量
- 所有连线都在 `scene.edgeSvg` 这一个 SVG 里（`U.17-R8`）；连线不使用 `filter`（光晕用加粗半透明路径实现）。
- 当前层的每条连线恰好一个元素；`byNode` 与当前层的连线一致。
- 拖动 N 个节点时每帧重算的连线数 = 与它们相连的连线数。
- 连线颜色只由源端口类别决定（`U.03.03-R2`），不受运行状态影响（完成只改透明度）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `geom.edgePath` 返回 null（端口不存在：NodeDef 改了、动态端口被删） | 这条线画成从源节点右边缘中点到目标节点左边缘中点的虚线，加 `is-bad`；校验结果（V05）由服务端 `validate` 事件给出 |
| 端点不在当前层 | §6.1 |
| `setFlow` 给了不存在的 ID | 忽略 |

## 9. 性能与资源
- 拖动 1 个节点（相连 4 条线）：`geom` 阶段 ≤ 0.2ms；拖动 20 个节点（相连 60 条）≤ 2ms。
- 300 条连线全量同步 ≤ 15ms。
- 每条连线 3 个 `path`（流动时 4 个）；流动层同时最多 30 条（由 `W.06.15` 保证）。

## 10. 验收标准
1. 连线是两端切线水平的三次贝塞尔；回连（目标在源左侧）时偏移固定 120；颜色 = 源端口类型色（`U.10.03` §2、`U.03.03-R2`）。
2. 悬停变粗、选中加光晕；14px 热区内单击能选中（与 `W.06.07` 联合）。
3. 运行中：上游完成的线不透明度为 1；分支未走的线为虚线 0.35；有数据通过的线有流动光点；缩到第 3 级时线 1px 且没有流动动画。
4. 200 节点、300 连线拖动 20 个节点：60fps；Performance 里只有相连连线的 `d` 被改写。
5. 读屏读到连线名称"{源} 的 {端口} 连到 {目标} 的 {端口}"（`U.16` §3）。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/render/edge.ts`、`edge.css`、`edge.test.ts`；`web/tests/visual/canvas-edges.spec.ts`。
- 不许碰的文件：`web/src/canvas/core/geom/`、`render/node.ts`、`render/pool.ts`、`interact/`、`runBridge.ts`、`web/src/state/`、`design/tokens.css`。
- 函数签名：见 §4、§6.6。
- 测试用例（jsdom，假 `geom`）：
  - `W0604-T1 同步`：当前层 4 条连线 → 4 个 `g.hx-edge`，每个 3 条路径且 `d` 相同；删 1 条 → 3 个
  - `W0604-T2 颜色`：源端口类别 `ctx` → `--_ec: var(--hx-type-ctx)`；`$T` 端口推断为 `列表[方案@1]` → `list`
  - `W0604-T3 只算相连`：`updateFor([a])`，a 有 2 条线 → 本帧 `geom.edgePath` 只被调用 2 次
  - `W0604-T4 改接`：一条连线的 `to` 变了（`change.edges` 含它）→ 同一元素 `d` 更新、`byNode` 更新
  - `W0604-T5 选中`：`paintSelection({e1})` 再 `paintSelection({e2})` → 只改 2 个元素
  - `W0604-T6 运行`：`setRun(e,'done')`、`'inactive'`、`'idle'` 的类正确；`setFlow(e,true)` 在 `edgeFlow` 组里多 1 条路径，`false` 后为 0
  - `W0604-T7 LOD 3 无流动`：`lod.level()=3` 时 `setFlow(e,true)` 不加流动层
  - `W0604-T8 减少动效`：`reducedMotion()=true` 时 `setFlow(e,true)` → `is-flow`，没有流动层路径
  - `W0604-T9 端口不存在`：`edgePath` 返回 null → `is-bad` 虚线兜底
  - `W0604-T10 预览`：`preview(a, b, 'bad', 'gen')` → 预览路径可见、红色虚线类；`preview(null)` → 隐藏
  - `W0604-T11 可访问名称`：`aria-label` 为"执行者 的 结果 连到 验收者 的 上下文"格式
  - `W0604-T12 视觉`：§10 验收 1、3（Playwright 截图）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R23、R25）；另：不给连线用 `filter`；不在拖动中重画全部连线；不按运行状态改连线颜色；不为每条连线单独绑定事件监听（事件由 `W.06.07`、`W.06.08` 在根元素上委托处理）。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。
