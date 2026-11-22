# W.03.04 run store

| 项 | 内容 |
|---|---|
| 编号 | W.03.04 |
| 类型 | 实施 |
| 上级 | W.03 状态层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设18 §3.2（`run` 一节）；demo `设计规范_v0.3/src/28_run.js`（运行模拟、节点状态与进度）；demo v0.5 `39_monitor.js`（运行列表、步骤按层分组）；`C.06.02` §9（前端去向） |
| 最后修改 | 2026-11-23 |

## 1. 职责
一个会话工作区的运行数据：本会话的运行列表、**当前运行**（画布正在显示状态的那一次）的状态、费用、预算、升级、日志，以及节点执行的实时投影；启动、暂停、继续、取消、分叉、回放这些动作；当前运行的运行流的开关。

"当前运行"：画布上节点状态显示的那一次运行（`U.13.06-R2`）。缺省为当前图最近的一次运行；用户在监控页点开另一次运行时切换。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 把实时投影画到节点上、按帧合并、连线流动 | `W.06.15`（`RunBridge` 订阅 `live.subscribe`） |
| 审批的数据和处理 | `W.03.05`（全局待审批只存一份，`W.01-R14`）；本 store 只记节点执行等待的是哪个 `approval_id` |
| 急停状态、全局急停 | `W.03.05` |
| 监控页、节点详情的显示 | `W.07.05`、`W.07.03` |
| 运行历史页的回放播放控制 | `W.09.05`（它用本文的快照模式另建一份 store） |
| 节点执行的输入、输出、上下文包、提示词 | 不存；节点详情打开时按需拉取（§4、`C.06.02` §9） |

## 3. 继承的上级约束
`W.03` §4.1、§6.2、§6.5、§7；`W.01-R14`、`R17`（K73）；`G.06.02-R4`；`W-R2`、`R5`；`C.06` §5；`C.06.01-R1`；`C.06.02`（全部）；`C.06.05-R5`（一次节点执行的唯一键）；`C.07`（R2、R3、R6）；`B.04.03`；`B.05.02`；`B.05.04` §5（运行结束 5 秒后关流；切换运行时关闭旧流）；`U.09.07`；`U.10.02-R3`；`U.13.06-R2`；`U.14.04`；`U.17-R10`、`R11`。

## 4. 接口
```ts
// web/src/state/runLive.ts —— 实时投影：普通对象，不是 zustand 状态
import type { Loc, NodeState, Ulid } from '@/lib/protocol';
import type { Scope } from './types';

export type ExecState = {
  key: string;                          // C.06.05-R5 的规范化字符串
  nodeId: Ulid; loc: Loc;
  state: NodeState; attempt: number; seq: number;      // seq：最后一次更新它的事件
  pct?: number; note?: string; sub?: string;           // node.progress
  pool?: { name: string; waiting: number };            // node.throttled
  approvalId?: Ulid;                                   // waiting 时
  activeOuts?: readonly string[];                      // done 时：分支、人工被激活的出口（node.state 的 active_outs；W.06.15 判断未激活的连线，K108）
  error?: { class: string; code: string; message: string; retryable: boolean };
  startedAt?: string; endedAt?: string;
};
export type LiveDelta =
  | { kind: 'node'; nodeId: Ulid; key: string }
  | { kind: 'flow'; edgeId: Ulid }
  | { kind: 'pools' }
  | { kind: 'reset' };                                 // 换了当前运行、重新拉了快照
export type ScopeStatus = 'idle' | 'running' | 'waiting' | 'failed' | 'done';
export type LiveRun = {
  stateOf(nodeId: Ulid): ExecState | undefined;        // 最新一次执行（按 seq），U.10.02-R3
  execsOf(nodeId: Ulid): readonly ExecState[];         // 全部执行，按 seq
  footOf(nodeId: Ulid): { done: number; total: number; round?: { cur: number; max: number } } | undefined;   // 状态脚
  scopeStatus(scope: Scope): ScopeStatus;              // 结构树状态点；按 loc.scopes 往外汇总
  pools(): readonly { name: string; used: number; cap: number; queued: number }[];
  subscribe(fn: (batch: readonly LiveDelta[]) => void): () => void;   // 同步回调，每个事件一批；合并由 RunBridge 做
  all(): Iterable<ExecState>;                          // 投影里的全部执行（监控页合并步骤用，W.07.05，K114）
};

// web/src/state/runStore.ts
export type CurrentRun = {
  meta: RunMeta;                        // GET /runs/{id} 的概览（K80）
  status: RunStatus;
  cancelRequested: boolean;             // run.cancel_requested 后、终态前："正在取消"
  stream: 'off' | 'connecting' | 'live' | 'ended';
  lastSeq: number;
  cost: { tokens: number; costMicros: number };        // 累计 llm.call 的 usage 与 cost_micros
  budget: { ratio?: 0.5 | 0.8 | 1; exceeded: boolean };
  escalations: readonly EscalationItem[];              // escalation.* 汇总后未解决的
  briefs: ReadonlyMap<string, BriefItem>;              // brief.updated，按 goal_id 取最新
  swaps: readonly { fromVersion: number; toVersion: number; scopePath: string; source: 'user' | 'model' }[];
  expansions: readonly { patchId: Ulid; versionBefore: number; versionAfter: number }[];
  logs: readonly LogLine[];                            // node.log，最多 2000 行，超出丢最旧的
  pendingPatches: readonly { patchId: Ulid; summary: string; scopePath: string; opIds: readonly Ulid[] }[];   // RunView.pending_patches：可以热更新、等用户确认（E.16.02 §5 第 3 步，K117）
};
export type LogLine = { seq: number; ts: string; level: string; msg: string; path: string; nodeId: Ulid };
export type RunState = {
  sessionId: Ulid;
  mode: 'live' | 'snapshot';
  list: { range: 'session' | 'all'; items: readonly RunMeta[]; nextCursor?: string; status: 'idle' | 'loading' | 'ready' | 'error' };
  currentId: Ulid | null;
  current: CurrentRun | null;
  tick: number;                         // 实时投影有变化时加 1，最多每 400ms 一次（U.17-R11）
};
export type RunActions = {
  loadList(q: { range: 'session' | 'all'; status?: string; q?: string; more?: boolean }): Promise<void>;
  focus(runId: Ulid | null): Promise<void>;
  start(o?: { inputs?: unknown; budget?: unknown }): Promise<Ulid>;   // POST /runs，成功后 focus(新 ID)
  pause(): Promise<void>;  resume(): Promise<void>;  cancel(): Promise<void>;
  estopRun(): Promise<void>;                                          // POST /runs/{id}/estop（本次运行急停）
  fork(at: { nodeId: Ulid; scopes: Loc['scopes']; seq?: number }): Promise<Ulid>;
  replay(): Promise<Ulid>;
  hotpatch(patchId: Ulid, act: 'confirm' | 'discard'): Promise<void>;
  nodeDetail(execKey: string): Promise<NodeDetail>;                   // GET /runs/{id}/nodes/{exec_key}；最近 20 个缓存
  timeline(runId: Ulid): Promise<readonly Bar[]>;                      // GET /runs/{id}/timeline（监控页瀑布，W.07.05）
  blob(ref: string, o?: { maxBytes?: number }): Promise<{ text: string; truncated: boolean }>;   // GET /blobs/{ref}，Range，缺省最多 256KB（节点执行详情，W.07.03）
};
export type RunStoreApi = ReadonlyStore<RunState> & { actions: RunActions; live: LiveRun };

export type RunControl = {              // 只给工作区和事件路由
  ingest(ev: RunEvent): void;
  attach(): void;                       // 工作区成为当前：当前运行没结束就连运行流
  detach(): void;                       // 切走：关运行流，记住 lastSeq
  setGraph(graphId: Ulid, branch: string): void;   // 工作区换图：当前运行不属于新图时清空
  refreshView(): void;                  // 图前进后重拉当前运行的概览（pendingPatches，K117）
  dispose(): void;
};
export function createRunStore(o: {
  sessionId: Ulid; graphId: Ulid | null; branch: string;
  client: RestClient; streams: StreamClient;
  mode: 'live' | 'snapshot';
  snapshot?: { runId: Ulid; atSeq?: number };      // snapshot 模式：GET /runs/{id}/view?at_seq=，不连流
  onTerminal?: (runId: Ulid) => void;              // 当前运行进入终态：session store 立即刷新活动摘要
  onRouted?: (ev: RunEvent) => void;               // 不归本 store 的事件（approval.*、estop.*、orch.tool_call）交回路由
}): { store: RunStoreApi; control: RunControl };
```

### 4.1 依赖
`W.03` §4.3 的 `RestClient`、`StreamClient`；`@/lib/protocol` 的 `RunEvent`、`RunStatus`、`NodeState`、`Loc`、`RunMeta`、`RunView`、`NodeStateRow`、`NodeDetail`（K80）；常量 `Ev.*`（`C.14-R6`，不手写事件名，`G.02.05-R3`）。

## 5. 数据结构
- `ExecState`、`LiveRun`、`CurrentRun`、`LogLine` 是本 store 私有的；节点状态取值、事件字段都用生成类型。
- 投影内部：`Map<execKey, ExecState>`、`Map<nodeId, execKey[]>`、`Map<Scope, 计数>`（各状态的执行数，用于 `scopeStatus`）。

## 6. 行为

### 6.1 当前运行的选择
| 时刻 | 当前运行 |
|---|---|
| 工作区创建 | `GET /runs?session_id=&graph_id=&limit=1` 的第一项（最近一次，任何状态）；没有为 null |
| `start()` 成功 | 新运行 |
| 监控页点开某次运行 | 那一次（它可以属于本会话的另一张图：画布不显示它的节点状态，监控页照常显示） |
| 工作区换图（`setGraph`） | 当前运行的 `graph_id` 不是新图时，换成新图最近的一次运行 |

### 6.2 `focus(runId)`
1. 关闭旧的运行流（`B.05.04` §5），`live` 清空并发 `reset`。
2. 并行 `GET /runs/{id}`（概览）和 `GET /runs/{id}/nodes`（`{seq, items}`）：用 `items` 填投影，`lastSeq = seq`。
3. 运行没结束且工作区是当前的（已 `attach`）：`streams.open({kind:'run', id, since: lastSeq})`，`stream='connecting'`，收到第一条事件后为 `live`。
4. 快照模式：第 2 步改为 `GET /runs/{id}/view?at_seq=`，不连流，`stream='off'`。
5. 第 2 步失败：`currentId` 保留、`current=null`，Promise 拒绝（监控页显示"重试"）。

### 6.3 事件处理（`ingest`）
- `ev.seq ≤ lastSeq` 且 `ev.seq > 0`：丢弃（续传交界处重复）。否则 `lastSeq = ev.seq`（E 级事件 `seq=0` 不改它）。
- `ev.run_id ≠ currentId`：丢弃。

| 事件 | 处理 |
|---|---|
| `run.status` | `status = to`；到 `done` / `failed` / `cancelled`：`stream='ended'`（服务端 5 秒后自己关流，前端到时关闭句柄）、`cancelRequested=false`、调 `onTerminal`、更新 `list` 里同 ID 的项 |
| `run.cancel_requested` | `cancelRequested = true` |
| `run.graph_swapped` | 追加到 `swaps` |
| `control.refreshView()`（工作区在当前图的 `serverVersion` 前进、且当前运行在进行时调用，`W.03.05` §6.7） | 1 秒防抖后重新 `GET /runs/{id}`，用 `pending_patches` 更新 `pendingPatches`（`E.16.02` §5 第 3 步没有专门的事件，K117）；`hotpatch` 成功后同样重拉 |
| `node.state` | 按 `loc` 算执行键，更新或新建 `ExecState`（`from` 不对时也以 `to` 为准，C.07-R5 的非法转换由后端处理）；`waiting` 记 `approval_id`；`done` 记 `active_outs`（有就记）；`failed` 记 `error`；离开 `queued` 时清 `pool` |
| `node.progress` | 更新 `pct`、`note`、`sub` |
| `node.throttled` | 记 `pool` |
| `loop.round` | 循环节点的 `footOf` 记 `{cur: round, max}` |
| `pool.usage` | 替换 `pools()` 的结果，发 `pools` 增量 |
| `edge.flow` | 只发 `flow` 增量，不存 |
| `node.log` | 追加 `logs`（超过 2000 行丢最旧的） |
| `llm.call` | `cost.tokens += in + out`，`cost.costMicros += cost_micros` |
| `budget.warn` / `budget.exceeded` | 更新 `budget`（只看根图的 `scope_path`；子图的预算提示由监控页按需查看） |
| `escalation.raised` / `merged` / `routed` / `resolved` | 维护 `escalations`（resolved 的移除） |
| `brief.updated` | `briefs.set(goal_id, …)`（`superseded=true` 的删除） |
| `orch.expanded` | 追加到 `expansions` |
| `resync` | 回到 §6.2 第 2 步重新拉快照（不关流） |
| `approval.*`、`estop.*`、`orch.tool_call` | 交给 `onRouted`（`W.03` §6.2） |
| 其他 | 忽略（`node.input` 等按需加载；不认识的 `kind` 记一次 `console.debug`） |

### 6.4 低频刷新 `tick`
投影每次变化后：距离上次加 `tick` 已过 400ms → 立即加；否则安排在满 400ms 时加一次。结构树、预览浮层、监控页步骤列表订阅 `tick` 后从 `live` 读（`U.17-R11`；监控页的 0.7 秒刷新在 `W.07.05` 里再节流，`U.09.07-R3`）。画布节点不走 `tick`：`RunBridge` 直接 `live.subscribe`。

### 6.5 `scopeStatus` 的汇总规则
一个层的状态 = 这一层及其以下所有层里"每个节点最新一次执行"的状态按优先级取最高：`failed` > `waiting` > `running`（含 `queued`）> `done`（含 `cached`、`skipped`、`cancelled` 都算结束）> `idle`。每次 `node.state` 按 `loc.scopes` 给从内到外每一层的计数加减，读取是 O(1)。

### 6.6 动作
| action | 请求 | 成功后 | 典型错误（`C.11`） |
|---|---|---|---|
| `start` | `POST /runs {graph_id, branch, session_id, inputs?, budget?}` | `focus(新 ID)`；session 立即刷新活动摘要 | 423 `estopped`、422 `invalid_graph`（带 `diags`）、503 `provider_unavailable`：Promise 拒绝，状态不变 |
| `pause` / `resume` / `cancel` | `POST /runs/{id}/pause|resume|cancel` | 用返回的 `RunMeta` 更新；状态以事件为准 | 409 `run_state`：重新 `GET /runs/{id}` 对齐后拒绝 |
| `estopRun` | `POST /runs/{id}/estop` | 无（事件会到） | — |
| `fork` / `replay` | `POST /runs/{id}/fork` / `replay` | `focus(新 ID)` | 423 |
| `hotpatch` | `POST /runs/{id}/hotpatch/{patch_id}/confirm|discard` | 无 | 409 |
| `nodeDetail` | `GET /runs/{id}/nodes/{exec_key}` | 进 20 个的最近使用缓存；当前运行换了就清空缓存 | 404 |
- 浏览器发出的这些请求操作者都是 `user`（`W-R5`）；本 store 不构造任何身份字段。
- `start` 带幂等键（`W.04.01` 生成），连点两次只启动一次。

### 6.7 attach / detach
- `attach`：当前运行没结束（`stream ≠ 'ended'`）时按 §6.2 第 3 步以 `since: lastSeq` 连流。
- `detach`：关闭运行流，`stream='off'`，`lastSeq` 保留。后台期间投影不更新；切回时续传补齐 P、S 级事件，E 级（进度片段、连线流动）不补（`C.06` §5）。

## 7. 不变量
- 同时最多打开 1 条运行流，且只在工作区是当前的时候（`W.01-R17`）。
- 实时投影不在 zustand 状态里；高频事件不触发 React 提交，只有 `tick` 会，且最多每 400ms 一次。
- `lastSeq` 单调不减；同一 `seq` 的事件只处理一次。
- 一次节点执行只有一条 `ExecState`（按 `C.06.05-R5` 的键）；循环第 1 轮和第 2 轮是两条（`C.07-R6`）。
- 投影的结果只由事件和快照决定：同一组事件按顺序处理两遍得到相同结果（`C.07-R8` 的前端对应）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 快照拉取失败 | §6.2 第 5 步 |
| 运行流断开 | `W.04.02` 自动重连并续传；重连期间 `stream='connecting'` |
| 运行不存在（404） | `currentId = null`，列表里删掉这一项 |
| action 失败 | §6.6 表；Promise 以 `ApiError` 拒绝，面板显示原因（`U.14.03`） |
| `node.state` 的 `loc` 缺失（违反 `C.06.01`） | 丢弃，`console.error` 一次 |

## 9. 性能与资源
- `ingest` 单条事件 ≤ 0.02ms（30 个节点同时运行、每秒数百条事件，`U.17` §1）。
- 投影内存：每次节点执行约 300 字节；1 万次执行 ≤ 3MB。日志 ≤ 2000 行。
- `scopeStatus` O(1)；`footOf` O(该节点的执行数)。

## 10. 验收标准
1. 闭环迭代模板跑 3 轮：画布上执行池显示第 3 轮的状态，状态脚"第 3 / 5 轮"；结构树里"闭环迭代"在运行中显示呼吸点，某个执行失败后显示红点（`U.10.02-R3`、`U.13.06` §3）。
2. 30 个节点同时运行时 React 提交每秒 ≤ 3 次（全部来自 `tick`），画布节点状态仍每帧更新（`U.17-R10`、`R11`）。
3. 会话 A 运行中切到 B 再切回：A 的运行流以 `since` 续传，节点状态与服务端 `GET /runs/{id}/nodes` 一致。
4. 在监控页依次点开 3 次运行：任何时候只有 1 条运行流。
5. 急停中点运行：启动被拒，界面显示"急停中"的原因，当前运行不变。
6. 运行进入终态后 5 秒内会话列表的"● 运行中"消失（`onTerminal` 触发活动刷新）。

### 实施卡
- 要建 / 要改的文件：`web/src/state/runLive.ts`、`web/src/state/runLive.test.ts`、`web/src/state/runStore.ts`、`web/src/state/runStore.test.ts`、`web/src/state/__fixtures__/run_loop3.events.json`（闭环迭代 3 轮的事件序列，按 `schema/examples/events/run/` 的格式手写）。
- 不许碰的文件：`web/src/canvas/`（`RunBridge` 在 `W.06.15`）、`web/src/lib/protocol/`、`web/src/state/sessionStore.ts`、`schema/`。
- 函数签名：见 §4。
- 测试用例（假 `RestClient`、假 `StreamClient`、假时钟）：
  - `W0304-T1 最新执行`：同一节点第 1、2 轮的 `node.state` → `stateOf` 返回第 2 轮；`execsOf` 两条；`footOf` 的 `round.cur=2`
  - `W0304-T2 汇总`：子图里一个 `failed`、一个 `running` → 子图和根图都是 `failed`；失败的手动重试变 `queued` 后变 `running`
  - `W0304-T3 重放一致`：`run_loop3.events.json` 处理两遍（新建两次 store）→ 两个投影的全部 `ExecState` 相等
  - `W0304-T4 重复与乱序`：交界处同一 `seq` 来两次 → 只处理一次；`run_id` 不同的事件被丢弃
  - `W0304-T5 tick 节流`：1 秒内 1000 条 `node.progress` → `tick` 变化 ≤ 3 次；`live.subscribe` 回调 1000 次
  - `W0304-T6 只有一条流`：连续 `focus(a)`、`focus(b)`、`focus(c)` → 前两个句柄都被 `close`，最后只有 c 打开
  - `W0304-T7 快照与续传`：`focus` 先拉 `/nodes`（seq=40）再以 `since=40` 开流；`detach` 后 `attach` 以最后的 `lastSeq` 开流
  - `W0304-T8 resync`：收到 `resync` → 重新拉 `/nodes`，投影先 `reset` 再填充
  - `W0304-T9 终态`：`run.status{to: done}` → `stream='ended'`、`onTerminal` 调用一次、列表项状态更新
  - `W0304-T10 启动失败`：423、422、503 → Promise 拒绝，`currentId` 不变
  - `W0304-T11 交回路由`：`approval.requested`、`estop.triggered`、`orch.tool_call` 交给 `onRouted`，本 store 状态不变
  - `W0304-T12 日志上限`：2100 条 `node.log` → 保留后 2000 条
  - `W0304-T13 快照模式`：`mode:'snapshot'` 拉 `/view?at_seq=`，`attach` 不开流
  - `W0304-T14 性能`：10 万条事件 `ingest` 总耗时 ≤ 2 秒（vitest bench）
- 允许使用的依赖：`zustand`；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部（特别是 R3、R25）；另：不把实时投影放进 zustand 状态；不在本 store 存审批和急停；同时不开两条运行流；不缓存节点详情超过 20 条。
- 完成标志：`G.14` 全部条件；§10 六条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `ExecState` 增加 `activeOuts`（`node.state{to:done}` 的 `active_outs`）；`RunBridge` 的订阅写为 `live.subscribe` | `P.09` K108（第 7 棒，`W.06.15` 判断未激活的连线） |
| 2026-11-23 | `LiveRun.all`、`CurrentRun.pendingPatches`、`timeline`、`blob` | 第 8 棒写 `W.07.03`、`W.07.05`；`P.09` K114、K117 |
