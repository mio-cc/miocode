# W.06.15 运行状态渲染

| 项 | 内容 |
|---|---|
| 编号 | W.06.15 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 §5（`runBridge`：按帧合并、只改 class / 文本 / scaleX）；demo `设计规范_v0.3/src/28_run.js`（`paint`、`paintEdge`、连线是否激活 `active`）；`C.06.02` §9；`P.09` K108 |
| 最后修改 | 2026-11-23 |

## 1. 职责
运行桥 `RunBridge`（`P.06` §10）：订阅 run store 的实时投影，把运行流的高频变化按帧合并，在 `run` 阶段写进当前层的节点（状态、进度、状态脚、耗时、"上次"）和连线（完成、未激活、流动），并按 400ms 节奏刷新容器节点的缩略图；等待审批的计时每秒更新一次。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 接收运行事件、投影、续传、选哪次运行 | `W.03.04`（本文只读 `LiveRun` 和 `RunState`） |
| 节点、连线上状态的具体外观 | `W.06.03`（`setRun`）、`W.06.04`（`setRun`、`setFlow`） |
| 缩略图里画什么 | `W.06.12`（本文只决定什么时候调 `repaintThumb`） |
| 小地图、父图位置卡、预览浮层的运行着色节奏 | `W.06.12`、`W.06.13`（它们各自订阅 `tick`） |
| 审批、重跑、查看详情按钮的动作 | `W.06.01`（`node.action` 转发） |
| 运行完成、审批到来的读屏播报（`U.16-R5`）、顶部条运行状态 | `W.07.01`、`W.07.10` |
| 低频事件（成本、预算、升级、简报） | `W.03.04` → React 面板（`C.06.02` §9 第 2、3 行） |

## 3. 继承的上级约束
`W.06` §4.4（`NodeRunLook`、`NodeLayer.setRun` / `repaintThumb`、`EdgeLayer.setRun` / `setFlow`、`LodApi.onReveal` / `onChange` / `visible`）、§6.2（`run` 阶段）、§6.3、§6.4、§9、`W.06-R2`、`R3`、`R9`；`W.01-R2`；`W.03.04` §4、§6.3、§6.4；`C.06.02` §3、§8、§9；`C.06.05-R5`；`C.07`；`G.06.02-R4`；`B.05.03` §2；`U.07.03`（全部，含 `R1`、`R2`）；`U.07.04` §2；`U.10.02` §2、`R2`、`R3`；`U.10.04` §1–§2；`U.17` §1、`R5`、`R8`、`R10`、`R11`；`P.09` K108。

## 4. 接口
```ts
// web/src/canvas/core/runBridge.ts
export function createRunBridge(ctx: EngineCtx): {
  resync(): void;               // 当前层全部节点、连线按投影重写一遍：绑定文档、换层（W.06 §6.4 第 2 步，K104）、LiveDelta 'reset'
  dispose(): void;
};
export const FLOW_MAX = 30;             // 同时流动的连线上限（U.07.03-R1）
export const FLOW_HOLD_MS = 1200;       // 最后一次 edge.flow 之后流动光点保持多久
export const THUMB_EVERY_MS = 400;      // 容器节点缩略图的刷新间隔（U.10.04 §2、U.17-R11）
export const WAIT_TICK_MS = 1000;       // 等待计时文字的刷新间隔

// 纯函数（便于测试）
export function lookOf(e: ExecState | undefined, foot: ReturnType<LiveRun['footOf']>, run: { last: boolean; now: number },
  t: EngineDeps['t']): NodeRunLook | null;                                        // §6.2
export function edgeLook(src: ExecState | undefined, dst: ExecState | undefined, fromPort: string): 'idle' | 'done' | 'inactive';   // §6.3
export function isLast(cur: CurrentRun | null): boolean;                         // §6.2 "上次"（K108）
```

### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`nodes`、`edges`、`lod`、`frame`、`model()`、`scope()`、`doc().stores.run`、`deps.t`、`deps.now`）；`W.03.04` 的 `RunStoreApi`、`LiveRun`、`LiveDelta`、`ExecState`、`CurrentRun`、`RunState.tick`；`W.03.01` 的 `nodesIn`、`edgesIn`；`@/lib/protocol` 的 `NodeState`、`RunStatus`。

## 5. 数据结构
```ts
// 模块内部
dirtyNodes: Set<Ulid>;              // 本帧要重写的节点
dirtyEdges: Set<Ulid>;              // 本帧要重写的连线（端点节点状态变了）
flows: Map<Ulid, number>;           // 正在流动的连线 → 最后一次 edge.flow 的时间（插入顺序 = 活跃顺序）
deferred: Set<Ulid>;                // 被视口裁剪、等 onReveal 再写的节点
waiting: Set<Ulid>;                 // 当前层处于 waiting 的节点（驱动每秒计时）
containers: Map<Ulid, ScopeStatus>; // 当前层容器节点上次的汇总状态（决定是否刷新缩略图）
timers: { flow: number | null; wait: number | null };   // setTimeout / setInterval 句柄；空闲时都为 null
```
- `NodeRunLook` 由本文按 `ExecState` 算出；`W.06.03` 在元素上缓存上一次写入的值，值相同不写 DOM（`W.06.03` §5.1）。

## 6. 行为

### 6.1 订阅与合并（`G.06.02-R4`、`U.17` §1）
1. 绑定文档时：`run = doc.stores.run`；为 null（没有运行信息的画布）→ 本模块什么都不做。订阅 `run.live.subscribe(batch)`（`W.03.04` §4：每个事件同步回调一次）和 run store 的 `tick`、`current`（选择器 + 引用相等）。
2. `batch` 里每个增量只记脏数据，不写 DOM：
   | `LiveDelta` | 记录 |
   |---|---|
   | `node` | 节点在当前层 → `dirtyNodes.add`，它相连的连线（`edges.ofNode`）→ `dirtyEdges` |
   | `flow` | 连线在当前层 → `flows` 里删掉再插入（移到最新），值 = `now()` |
   | `pools` | 有 `queued` 状态的节点重新算"前面 N 个"→ 加入 `dirtyNodes` |
   | `reset` | `resync()` |
   然后 `frame.request('run', flush)`：一帧内任意多个事件只合并成一次写入（`B.05.03` §2：前端不节流、按帧合并）。
3. `flush`（`run` 阶段）：对 `dirtyNodes` 里每个节点：`lod.visible(id)` 为假 → 放进 `deferred`；否则 `nodes.setRun(id, lookOf(…))`。对 `dirtyEdges`：`edges.setRun(id, edgeLook(…))`。对 `flows`：§6.4。清空脏集合。
4. `lod.onReveal(ids)`：`deferred` 里的这些节点补写一次（`W.06.05` §6.3 第 4 步）。
5. `resync()`：`dirtyNodes` = 当前层全部节点，`dirtyEdges` = 当前层全部连线，`flows` 清空（并对之前流动的连线 `setFlow(false)`），`containers` 清空，`request('run')`。绑定文档、换层（`W.06` §6.4 第 2 步之后）、`reset` 增量、当前运行换了（`currentId` 变化）时调用。

### 6.2 节点外观（`lookOf`）
| 字段 | 来源 |
|---|---|
| `state` | `ExecState.state`（`stateOf` 是最新一次执行，`U.10.02-R3`）；没有执行记录 → 返回 null（`idle`，`W.06.03` 隐藏状态脚） |
| `pct` | `running` 时的 `ExecState.pct`（0–1） |
| `text` | 状态脚文字：`queued` → "排队中"，有 `pool.waiting` 时"排队中 · 前面 N 个"；`running` → `note`（`node.progress`），扇出 / 自动展开汇总时"3 / 4 份"（`footOf().done / total`）；`waiting` → "等待审批 · m:ss"（`now − startedAt`，§6.5）；`failed` → `error.message` 第一行；其余为空 |
| `meta` | `done` → 耗时（`endedAt − startedAt`，≥ 1 秒写"12.3s"，否则"0.4s"）；`cached` → "缓存" |
| `round` | `footOf().round`（循环节点："第 2 / 5 轮"、环形进度，`U.10.04` §1） |
| `approvalId` | `waiting` 时的 `ExecState.approvalId`（状态脚的批准 / 驳回按钮用） |
| `retry` | `failed` 且 `error.retryable` |
| `last` | `isLast(current)`（下一段） |
- **"上次"（`U.10.02-R2`，`P.09` K108）**：`isLast` = 当前运行已到终态（`done` / `failed` / `cancelled`）且运行流不是在这次打开期间看着结束的（`current.stream ≠ 'ended'`，即载入时就已结束、或切走会话后再回来）。看着运行结束时节点保持正常饱和度，刷新页面或切回会话后显示为"上次"。没有任何运行（`current = null`）时所有节点 `null`。
- 文案键 `canvas.run.*`，数字格式由 `deps.t` 的变量处理（`W.10`）。

### 6.3 连线外观（`edgeLook`，`U.10.03` §2）
| 条件（按顺序取第一条） | 结果 |
|---|---|
| 源节点最新执行为 `done` 且带 `activeOuts`（分支、人工的激活出口，`C.06.02` §3），而这条连线的源端口不在其中 | `inactive`：虚线 0.35 |
| 目标节点最新执行为 `skipped`，或源节点为 `skipped` | `inactive` |
| 源节点最新执行为 `done` / `cached` | `done`：不透明度 1 |
| 其余 | `idle` |
- 颜色不变（`U.03.03-R2`、`W.06.04` §7）；`activeOuts` 由 `W.03.04` 从 `node.state{to:done}` 的 `active_outs` 记下（K108 补充到 `ExecState`）。
- `isLast` 为真时同样显示（运行后也要看出哪条分支没走，`U.10.03` §2）。

### 6.4 流动光点（`U.07.03`、`R1`、`R2`、`U.17-R8`）
- `flows` 每次 `flush`：去掉 `now − 时间 > FLOW_HOLD_MS` 的（`setFlow(id, false)`）；超过 `FLOW_MAX` 时从最旧的开始去掉（"只保留最近活跃的 30 条"）；剩下的里新加入的 `setFlow(id, true)`。
- 还有流动的连线时，用一个 `setTimeout`（到最早一条过期的时刻）安排下一次 `request('run')`；没有流动时不留任何定时器（`W.06.01` §9：空闲不申请帧）。
- LOD 第 3 级（`lod.onChange(3)`）：全部 `setFlow(false)` 并在第 3 级期间不再加（`W.06.04` §6.4 也会拦）；回到第 1、2 级后由下一次 `edge.flow` 重新加。
- 减少动效：照常调用 `setFlow`，`W.06.04` 把它换成实线加粗（`U.07.04` §2）。
- 运行进入终态：清空 `flows`。

### 6.5 等待计时（`U.10.02` §2、`U.07.03`）
- 当前层有 `waiting` 的节点时，开一个 `setInterval(WAIT_TICK_MS)`，每次把这些节点放进 `dirtyNodes` 并 `request('run')`（只改状态脚的文字，不是动画）；没有等待的节点时清掉定时器。
- 页面不可见时浏览器会降低定时器频率，回到可见后的下一帧补上正确时间（时间按 `now − startedAt` 算，不累加）。

### 6.6 容器节点缩略图（`U.10.04` §2、`U.17-R11`）
- run store `tick` 变化（最多每 400ms，`W.03.04` §6.4）时：对当前层每个容器节点取 `live.scopeStatus(id)`；状态为 `running` / `waiting`，或与 `containers` 里记的不同 → `nodes.repaintThumb(id)`（被裁剪的跳过，`onReveal` 时补）；记下新状态。
- 运行结束后再刷新一次（终态颜色），之后不再刷新。

### 6.7 换层、换运行、换文档
- 换层（`W.06` §6.4 第 2 步后由 `W.06.01` 调 `resync`）：新一层的节点元素可能来自 DOM 池缓存（`W.06.06`），里面是旧的状态，`resync` 全部按投影重写（值没变的不写 DOM）。
- 监控页点开别的运行（`currentId` 变化）、`reset`：`resync`。当前运行属于另一张图时，投影里没有本图节点的执行，节点全部回到 `null`（`W.03.04` §6.1 第 3 行）。
- 回放页（`kind: 'replay'`、run store 为快照模式）同样工作：快照装好后 `reset` → `resync`。

## 7. 不变量
- 运行期间本模块不调用任何 React `setState`、不写任何 store；DOM 写入只在 `run` 阶段，每帧最多一次（`W.06-R3`、`U.17-R10`）。
- 同时有流动层的连线 ≤ 30 条；LOD 第 3 级时为 0。
- 节点状态只改类、文字和 `scaleX`（经 `W.06.03`，`U.17-R5`）；本模块不建、不删元素。
- 没有运行事件、没有流动、没有等待节点时：没有定时器、不申请 `rAF`。
- 节点显示的总是 `stateOf` 的最新一次执行；同一组事件按顺序处理两遍画面相同（`W.03.04` §7）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 增量里的节点不在当前层 / 已删除 | 忽略（不在当前层的由缩略图、结构树按 `tick` 反映） |
| `flow` 增量的连线不在当前层 | 忽略 |
| `ExecState` 缺 `startedAt`（快照里没有） | 不显示计时和耗时 |
| `flush` 抛错 | `W.06-R9`：下一帧对当前层做一次 `resync` |
| run store 为 null | 不订阅、不工作 |

## 9. 性能与资源
- 30 个节点同时运行、每秒数百条事件：`flush` 每帧 ≤ 1.5ms（`W.06.03` §9 的 `setRun` 合计）+ 连线 ≤ 0.5ms；60fps（`U.17` §1、`W.06` §9）。
- `live.subscribe` 回调（只记脏数据）每条 ≤ 0.005ms。
- 缩略图刷新：每 400ms 最多 10 个容器节点，合计 ≤ 3ms。
- 内存：脏集合和 `flows` 最多当前层节点 / 连线数。

## 10. 验收标准
1. 30 个节点同时运行 5 秒（`harnessd --fake-llm` 的并发模板）：60fps，React Profiler 提交 0 次，Performance 里每帧最多一次 `run` 阶段写入（`U.17` §1、`W.06` §10 验收 2）。
2. 状态外观：排队中显示"排队中 · 前面 N 个"，运行中进度条随 `node.progress` 前进，等待审批的计时每秒更新，完成后显示耗时，失败显示错误摘要和"从这里重跑"（`U.10.02` §2）。
3. 分支节点走了"是"：连到"否"出口的连线变成 0.35 虚线，被跳过的下游节点变淡；上游完成的连线不透明度变为 1。
4. 有数据通过的连线出现流动光点，1.2 秒没有新数据后消失；同时流动的连线不超过 30 条；缩到第 3 级没有流动（`U.07.03-R1`、`R2`）。
5. 运行中容器节点的缩略图每 400ms 刷新一次颜色（`U.10.04` §2）。
6. 视口外（> 150 节点开启裁剪）的节点平移进来时显示的是最新状态（`W.06.05` §10 验收 3）。
7. 运行结束后刷新页面：节点显示上次的终态，降低饱和度并带"上次"（`U.10.02-R2`）；看着运行结束时不变灰。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/runBridge.ts`、`runBridge.test.ts`；`web/tests/bench/canvas-run.bench.ts`（30 节点并发，`W.11`）；`web/tests/e2e/canvas-run.spec.ts`。
- 不许碰的文件：`web/src/state/runStore.ts`、`runLive.ts`（只读接口；`ExecState.activeOuts` 由 `W.03.04` 的实施任务加）、`render/`（只调用 `setRun`、`setFlow`、`repaintThumb`）、`minimap/`、`nest/`、`web/src/lib/protocol/`。
- 函数签名：见 §4。
- 测试用例（假 `LiveRun` 可手动推增量；假 `raf`、假时钟）：
  - `W0615-T1 按帧合并`：同一帧推 50 个 `node` 增量（同一节点 10 次）→ `flush` 1 次，该节点 `setRun` 1 次
  - `W0615-T2 lookOf`：`queued` + `pool.waiting=3` → "排队中 · 前面 3 个"；`running` + `pct=0.62` → `pct 0.62`；`done` 用时 12.34s → `meta "12.3s"`；`cached` → "缓存"；`failed` → 错误第一行、`retry` 按 `retryable`
  - `W0615-T3 循环与扇出`：`footOf={done:3,total:4}` → "3 / 4 份"；`round={cur:2,max:5}` → `round` 字段
  - `W0615-T4 上次`：终态 + `stream='off'` → `last=true`；终态 + `stream='ended'` → false；`current=null` → 全部 null
  - `W0615-T5 edgeLook`：分支 `activeOuts=['yes']` → `no` 出口的连线 `inactive`、`yes` 的 `done`；目标 `skipped` → `inactive`
  - `W0615-T6 流动上限`：40 条连线各来一次 `flow` → 有流动层的 30 条，是最近的 30 条
  - `W0615-T7 流动过期`：一次 `flow` 后 1.2 秒 → `setFlow(false)`；之后没有定时器
  - `W0615-T8 LOD 3`：`lod.onChange(3)` → 全部 `setFlow(false)`，之后的 `flow` 增量不加
  - `W0615-T9 等待计时`：一个 `waiting` 节点 → 每 1 秒 `setRun` 1 次、文字从 "0:01" 到 "0:03"；节点变 `done` 后定时器被清掉
  - `W0615-T10 裁剪`：被裁剪节点的增量不写；`onReveal([a])` 后写 1 次且是最新状态
  - `W0615-T11 缩略图节奏`：`tick` 3 次（400ms 间隔），容器状态 `running` → `repaintThumb` 3 次；终态后再 1 次，之后 0 次
  - `W0615-T12 换层 resync`：`resync()` → 新层每个节点 `setRun` 1 次，上一层的流动全部关掉
  - `W0615-T13 空闲`：没有事件 5 秒 → `raf` 0 次、定时器 0 个
  - `W0615-T14 基准`：§10 验收 1（`W.11` 基准脚本）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R25）；另：不在 `live.subscribe` 回调里写 DOM；不为每个事件申请一次 `rAF`（用帧调度器合并）；运行状态不进任何 React 状态；不按运行状态改连线颜色；不自己解析运行事件（只读投影）。
- 完成标志：`G.14` 全部条件；§10 七条验收通过。
