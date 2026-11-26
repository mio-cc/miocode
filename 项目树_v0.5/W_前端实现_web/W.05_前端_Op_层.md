# W.05 前端 Op 层

| 项 | 内容 |
|---|---|
| 编号 | W.05 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 设18 §4（Op 与 dispatch，旧版 Op 名与本地撤销栈已作废，只作参考）；引08 §4.2（前端处理 409）、§7（拖动合并）；`C.05`；`E.05`；`P.09` K82、K87–K90、K256、K260、K306 |
| 最后修改 | 2026-11-27 |

## 1. 职责
`web/src/ops/`：前端修改图的唯一入口 `dispatch`。对每次用户修改做提示性预检，乐观地应用到 graph store，按顺序提交 `POST /graphs/{id}/ops`，用服务端确认的 Op 校正本地图；失败时回滚、409 时本地合并或请用户选择；处理图协同流的 `op.applied` / `op.coalesced`、版本缺口和重拉；连续拖动每 250ms 提交一次；撤销、重做、撤回；上报"正在编辑"。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 最终校验、授权判定、逆操作计算、撤销栈 | 后端（`E.05`、`C.05-R1`、`E.05.02`）；前端不算逆操作，不存撤销栈 |
| 图数据的存放、规范化、选择器 | `W.03.01`（本层只通过 `GraphWriter` 写） |
| 提议的采纳与拒绝、幽灵节点 | `W.03.06`、`W.06.14` |
| 运行、审批、设置等非图操作 | 各 store 的 action（`W.01` §3.4） |
| 拖动中的实时位置、拖线预览 | `W.06.07`、`W.06.08`（拖动中只在画布引擎里，本层每 250ms 收一次） |
| 冲突对话框、提示的样式 | `W.07.10`（本层提供 `conflict` 状态和文案键） |
| 撤销后定位到改动处（进入那一层、平移） | `W.06.13`（本层返回改动的层和节点，`U.13.03-R6`） |
| 全图校验结果 | 服务端 `validate` 事件 → `W.03.01` |

## 3. 继承的上级约束
`W-R3`、`R4`、`R5`、`R6`、`R13`、`R14`；`W.01-R5`、`R6`、`R13`、`R14`；`W.03` §4.3、§6.2、§6.3、§6.5、§7；`W.03.01` §4.2、§6.2；`W.03.05` §4.3、§6.5–§6.7、§8；`G.06.02-R5`、`R6`；`G.13-R2`、`R7`；`C.02-R1`；`C.03.03`；`C.04.02`、`C.04.03`；`C.05-R1`–`R3`；`C.05.01` §3、§4；`C.05.02`；`C.05.03-R4`；`C.05.04` §2、§4、§5；`C.06.03-R1`、`R4`；`C.08-R1`–`R3`；`C.09` §4.1；`B.03.04`；`B.04.02`；`B.05.04` §5（presence）；`E.02.03`（哈希向量）；`U.13.02-R1`；`U.13.03`；`U.14.03` §2、`R2`；`U.14.05-R1`；INV-08、INV-09、INV-10、INV-24。

## 4. 接口

### 4.1 给面板和画布引擎
```ts
// web/src/ops/types.ts
import type { Assign, Op, OpKind, PortRef, TypeRef, Ulid, ApiError } from '@/lib/protocol';
import type { ReadonlyStore, Scope } from '@/state/types';

export type OpDraft = Pick<Op, 'kind' | 'payload'> & { target?: Op['target'] };   // id、groupId、coalesceKey 由本层填
export type DispatchOpts = { groupId?: Ulid };                                       // 缺省：每次 dispatch 一个新 group（C.05-R3）
export type DispatchResult =
  | { status: 'applied'; version: number }
  | { status: 'merged'; version: number }                  // 409 后本地合并再提交成功
  | { status: 'proposal'; proposalId: Ulid }               // 202：被规则转为提议（C.08-R5）
  | { status: 'dropped'; reason: 'theirs' | 'gone' | 'dependency' }   // 冲突时选了对方的 / 对象已被删 / 依赖的修改被撤回
  | { status: 'rejected'; error: ApiError }                // 403、422、400、423…，已回滚
  | { status: 'blocked'; reason: PrecheckReason };         // 预检没通过，没有入队（§6.2）

export type PrecheckReason = 'readonly' | 'frozen' | 'param_locked' | 'unknown_type' | 'no_port' | 'direction'
  | 'cross_scope' | 'incompatible' | 'cycle' | 'duplicate_edge' | 'group_invalid' | 'label_length' | 'too_many_tags';
export type Precheck =
  | { ok: true; uncertain?: boolean; replaces?: Ulid; assign?: Assign }   // replaces：连到非多连端口时会被替换的旧连线
  | { ok: false; reason: PrecheckReason; textKey: string; vars?: Record<string, string> };   // 文案键交给 W.10

export type Gesture = {
  readonly groupId: Ulid;
  update(op: OpDraft): void;            // 拖动中：只记最新的一条，最多每 250ms 提交一次
  end(op?: OpDraft): Promise<DispatchResult>;   // 松手：立即提交最后一次
  cancel(): void;                       // Esc：回到按下时的状态（U.13.02 §1）
};
export type ConflictItem = {
  target: { node?: Ulid; edge?: Ulid; note?: Ulid; field: 'param' | 'label' | 'tags' | 'lock' | 'ui' | 'edge' | 'other'; key?: string };
  mine: unknown; theirs: unknown;
  theirsBy: 'user' | 'model' | 'runtime' | 'external';    // 文案"别人（或 AI）已改为 X"（U.14.03 §2）
};
export type ConflictState = null | { entryId: string; items: readonly ConflictItem[] };
export type HistoryOutcome =
  | { status: 'done'; touched: readonly { scope: Scope; nodes: readonly Ulid[] }[] }   // 交给 W.06.13 定位（U.13.03-R6、R7）
  | { status: 'nothing' }                                                              // 没有可撤销 / 可重做的
  | { status: 'failed'; error: ApiError };                                             // 例：节点已被删除（C.05.03-R4）

export type OpsApi = {
  dispatch(input: OpDraft | readonly OpDraft[], o?: DispatchOpts): Promise<DispatchResult>;
  check(input: OpDraft, scope: Scope): Precheck;                       // 同步，不发请求
  canConnect(from: PortRef, to: PortRef, scope: Scope): Precheck;      // 拖线变色（W.06.08）
  portTypes(scope: Scope): ReadonlyMap<string, TypeRef>;               // inferScope 的结果（键 `${nodeId}.${port}`，同一层同一组引用返回同一个 Map）；画布按推断后的类型显示端口颜色和悬停类型（W.06.03、W.06.04，K99）
  fits(src: TypeRef, dst: TypeRef): boolean;                           // assignable(src, dst).ok；快速添加、插入连线时判断还不在图里的节点的端口（W.06.08 firstFit，K99）
  gesture(kind: 'drag' | 'step' | 'slide', revert: OpDraft): Gesture;  // revert：按下时的原值（取消时提交）
  undo(): Promise<HistoryOutcome>;
  redo(): Promise<HistoryOutcome>;
  revertOp(opId: Ulid): Promise<HistoryOutcome>;                       // AI 角标、通知、操作历史里的"撤销这一条"（U.13.03-R3）
  revertTo(version: number): Promise<HistoryOutcome>;                  // 操作历史里的"回到这里"
  setEditing(scope: Scope, nodeIds: readonly Ulid[]): void;            // 属性页、内联控件聚焦 / 失焦时调用
  readonly conflict: ReadonlyStore<{ value: ConflictState }>;
  resolveConflict(pick: 'mine' | 'theirs'): void;
  pending(): number;                                                   // 还没被服务端确认的 Op 条数
};
```

### 4.2 给状态层（`W.03.05` §4.3 的 `OpsFactory`）
```ts
// web/src/ops/index.ts
export function createOpsFactory(o?: { now?: () => number }): OpsFactory;   // main.tsx 创建一次，交给 createAppStores（W.04 §6.1）
// 工厂返回的对象同时实现 OpsHandle（给工作区）和 OpsApi（给面板、画布引擎）：
//   ingestRemote(ev)      图协同流 op.applied / op.coalesced（W.03 §6.2）
//   onStreamOpen(info)    图协同流每次连上：按 graphVersion 补齐缺口
//   reload()              图协同流 resync：整图重拉
//   flush()               等到队列里没有"已排队 / 提交中"的条目（冲突中的条目不等）
//   dispose()             工作区换图或释放时（§6.11）

// web/src/ops/useOps.ts
export function useOps(): OpsApi | null;             // 按 useCanvasStores().graph 找到本图的 OpsApi；只读画布为 null
export function opsFor(graph: GraphStoreApi): OpsApi | null;   // Canvas.tsx 构造画布引擎时用（W.01-R6：引擎只拿到这个对象）
```

### 4.3 纯函数模块
```ts
// web/src/ops/apply.ts —— 在 GraphModel 上应用一条 Op（结构共享，不修改输入）
export function applyOp(m: GraphModel, op: Op): { next: GraphModel; touched: Touched };   // 前置条件不满足时抛 ApplyError
export type Touched = { nodes: Set<Ulid>; edges: Set<Ulid>; notes: Set<Ulid>; scopes: Set<Scope> };
export function isOptimistic(kind: OpKind): boolean;   // §5.2

// web/src/ops/validate.ts
export function precheck(m: GraphModel, op: OpDraft, ctx: CheckCtx): Precheck;
export type CheckCtx = { scope: Scope; readonly: boolean; defs: CatalogState['defs'] };

// web/src/ops/typecheck.ts —— C.04.02 Assignable 与 C.04.03 推断的前端移植（K90）
export function assignable(src: TypeRef, dst: TypeRef, types: ReadonlyMap<string, TypeDef>): Assign;
export function inferScope(m: GraphModel, scope: Scope, defs: NonNullable<CatalogState['defs']>): ReadonlyMap<string, TypeRef>;   // 键 `${nodeId}.${port}`

// web/src/ops/merge.ts
export function writeSet(op: Op): ReadonlySet<string>;          // C.05.04 §2.1，键如 'node:N'、'param:N:key'、'port:N:in'
export function classify(mine: Op, missed: readonly Op[], m: GraphModel): 'keep' | 'same' | 'gone' | 'clash';

// web/src/ops/hash.ts —— 与 E.02.03 共用测试向量
export function canonicalJson(v: unknown): string;
export function graphHash(doc: WireGraph): Promise<string>;    // 'sha256:<hex>'，doc 是 toWire(toDoc(model))
```

### 4.4 依赖
`W.03.01` 的 `GraphWriter`、`GraphStoreApi`、`GraphModel`、`fromDoc`、`toDoc`、选择器；`W.03.03` 的 `canvasReadonly`、`notify`；`W.03` §4.5 目录 store（`defs.full`、`defs.types`、`nodeDef()`）；`W.04.01` 的 `RestClient`、`newUlid`、`apiPath`、`isApiError`、`isNetError`；`W.03.03` 的 `ui.net`（订阅它等回到 `online`，`W.04.05` 写入）；`W.10` 的 `t()`；生成常量 `OpKind`、`ErrCode`、`Ev`（`W.04.04-R7`）。

## 5. 数据结构

### 5.1 队列（本节点私有）
```ts
type Entry = {
  id: string;                       // 本地序号
  ops: Op[];                        // 已填 id（newUlid）、groupId、coalesceKey
  optimistic: boolean;              // 全部 Op 都可乐观应用时为 true（§5.2）
  state: 'queued' | 'inflight' | 'acked' | 'conflict';
  idemKey: Ulid;                    // 同一次提交的重试共用；请求体变了（合并后重提）才换新键（B.03.04）
  echoed: Set<Ulid>;                // 已经从图协同流收到的 Op id
  attempts: number;
  ackedVersion?: number;            // 200 响应里的 version
  resolve(r: DispatchResult): void;
};
type QueueState = {
  confirmed: GraphModel;            // 服务端已确认的图（只含收到 op.applied 的 Op）
  confirmedVersion: number;
  ackVersion: number;               // POST 响应里见过的最大版本
  entries: Entry[];                 // 按 dispatch 顺序
  recent: Map<Ulid, Op>;            // 最近 500 条已确认的 Op（处理 op.coalesced 用）
  buffer: GraphEvent[];             // 补齐缺口期间暂存的实时事件
};
```
显示的图（graph store 的 `model`）= `confirmed` 上依次重放所有 `optimistic` 条目的 Op（§6.4）。

### 5.2 哪些 Op 乐观应用
| 类别 | Op | 处理 |
|---|---|---|
| 乐观 | `add_node`、`remove_nodes`、`connect`、`disconnect`、`set_param`、`promote_param`、`demote_param`、`set_label`、`set_tags`、`set_lock`、`move_nodes`、`set_node_ui`、`add_note`、`update_note`、`remove_notes`、`set_graph_title`、`set_graph_meta` | 立即改本地图，提交后由回声校正 |
| 等服务端 | `group`、`ungroup`、`set_subgraph_ref`、`set_mandate`、`apply_patch`、`import_apply`、`revert_op`、`revert_to`、`create_branch`、`delete_branch`、`merge_branch` | 不改本地图，`sync.state='saving'`，收到 `op.applied` 后才变（改接记录、新端口 ID 由服务端生成，`E.05.01` §5） |
| 浏览器不发 | `restore_nodes`（只作为逆操作出现）、`migrate`（actor 必须是 runtime） | `dispatch` 直接拒绝（开发模式抛错） |
- 前端新建容器节点（循环、子图引用）时总是自己带上 `children`：一对入口 / 出口子图端口，ID 用 `newUlid()`。这样乐观结果和服务端一致，不依赖服务端补端口（`C.05.02` §2 `add_node`）。
- 前端产生的节点、连线、便签、Op 的 ID 都直接用 `newUlid()`，提交后不换 ID（`C.05.01` §3 允许客户端先生成；`W.04.04-R9`）。

## 6. 行为

### 6.1 `dispatch` 流程
1. 规范化输入：数组为一批（一次用户修改，共用一个 `groupId`，`C.05-R3`）；每条 Op 填 `id = newUlid()`。
2. 预检（§6.2）：任何一条 `ok:false` → 不入队，返回 `blocked`；调用方按 `check()` 给出的 `textKey` 显示行内提示。预检只是提示，`ok:true` 不代表服务端会接受（`W-R4`）。
3. 入队：`Entry{state:'queued'}`；乐观条目立即在显示的图上应用（§6.4），`writer.commit(next, {source:'local', groupId, …touched})`；`writer.setSync({pending, state:'saving'})`。
4. 触发提交循环（§6.5）。返回的 Promise 在条目结束时完成。

### 6.2 预检（提示性，`W-R4`）
| 编号 | 检查 | 适用 | 结果 |
|---|---|---|---|
| P1 | `ui.net !== 'online'` 或画布只读（`canvasReadonly`，`U.14.05`；回放、预览画布没有 `OpsApi`） | 全部 | `readonly` |
| P2 | 目标节点或它的任一上层容器 `lock = 'frozen'`（`C.03.03-R4`） | 除 `set_lock` 外的节点类 Op | `frozen` |
| P3 | 参数的 `ParamDef.lock` 是 `def` 或 `kernel` | `set_param`、`promote_param` | `param_locked` |
| P4 | 节点类型不在注册表里（V02） | `add_node` | `unknown_type` |
| P5 | 端口存在且方向是输出 → 输入（V05）；两端在同一层 | `connect` | `no_port`、`direction`、`cross_scope` |
| P6 | `assignable(推断后的源类型, 目标类型)`（`C.04.02` 规则表、`C.04.03` 推断） | `connect` | `incompatible`（文案用规则对应的提示，`C.04.02-R2`） |
| P7 | 加上这条连线后本层出现环（V09：本层的连线必须无环；循环的迭代在它自己的子图里） | `connect` | `cycle` |
| P8 | 完全相同的连线已存在 | `connect` | `duplicate_edge` |
| P9 | 目标是非多连输入且已有连线（V07） | `connect` | `ok`，带 `replaces`（拖线时提示"将替换原连线"） |
| P10 | ≥ 2 个节点且在同一层 | `group` | `group_invalid` |
| P11 | 显示名 1–80 字；标签 ≤ 16 个 | `set_label`、`set_tags` | `label_length`、`too_many_tags` |
- 需要的 NodeDef 或数据类型还没加载：返回 `{ok: true, uncertain: true}`（不拦用户），同时调用 `catalog.nodeDef(ref)` 加载。
- 急停**不**拦用户的修改：急停只拒绝模型的 Op 和启动运行（`C.05.04` §5、`E.05.05` §5 第 1 步，`P.09` K82）。
- `user` 实例锁不拦用户（只拦模型，`C.03.03`）。
- 推断结果按"层 + 这一层里节点和连线对象的引用"缓存（结构共享下，没变的子图得到同一组引用，等价于按子图哈希失效，`C.04.03-R2`、`G.06.02-R6`）。

### 6.3 本地应用（`applyOp`）
- 只实现 §5.2"乐观"一栏的 Op，效果与 `C.05.02` 一致：`remove_nodes` 一并删除子图和相连的连线；`connect` 到非多连端口时删掉旧连线；`demote_param` 删掉连到该端口的连线；`set_param` 的 `to` 等于默认值时从 `params` 删掉该键；`set_node_ui` 整体替换 `ui`。
- 应用服务端回声（`op.applied` 里的完整 Op）时，"等服务端"一栏的 Op 也要能应用：`group` / `ungroup` 用 payload 里服务端填写的 `rewire`、入口出口 ID；`apply_patch` / `import_apply` / `revert_to` 逐条应用子 Op；`set_subgraph_ref` 用 `children`；分支 Op 不改图。
- 前置条件不满足（节点不存在、ID 已占用）→ 抛 `ApplyError`，调用方决定怎么办（§6.4、§6.7）。
- 不修改输入的 `GraphModel`；没变的节点、连线对象沿用旧引用（`W.03.01` §5）。

### 6.4 显示的图怎么算
每当 `confirmed` 变化、或条目增删时：从 `confirmed` 出发，依次 `applyOp` 每个乐观条目（`state` 不是 `conflict` 的照常应用；`conflict` 的也应用——用户看到的是自己的修改，冲突框里写着对方的值）。
- 某个条目在重放时抛 `ApplyError`：
  - `queued`：它依赖的东西已经没了（例如连到一个刚被模型删掉的节点）→ 移出队列，结果 `dropped{reason:'dependency'}`，提示"有 N 处修改依赖的对象已被删除，已撤回"。
  - `inflight` / `acked`：跳过它（不显示），等服务端结果。
- 结果用一次 `writer.commit` 写回；`change.source` 为 `local`（新修改、自己的回声）、`remote`（别人的 Op，带 `actor`、`groupId`）或 `rollback`（撤回本地修改）。

### 6.5 提交循环
同一张图同时只有一个条目在提交（保证顺序，也让下一批的 `base_version` 包含上一批）。
1. 取第一个 `queued` 条目；`ui.net` 不是 `online` 时等它回到 `online`（`U.14.05-R1`）；有 `conflict` 条目时暂停，等用户选择。
2. `POST /graphs/{id}/ops {branch, base_version: max(confirmedVersion, ackVersion), group_id, ops}`，`idempotencyKey = entry.idemKey`。
3. 按响应：

| 响应 | 处理 |
|---|---|
| 200 `OpResult` | `state='acked'`；`ackVersion = max(ackVersion, version)`；`writer.confirm(version)`。条目在它的每条 Op 都收到回声后移出（§6.7）；5 秒内没收齐且图协同流是打开的 → `GET /graphs/{id}/ops?since_version=confirmedVersion` 补齐 |
| 202 `{proposalId}` | 移出队列、重算显示（乐观修改消失）；提示"这处修改已转为提议"；结果 `proposal`。提议本身由 `proposal.created` 进 model store（`W.03.06` §6.1） |
| 409 `graph_conflict` | §6.6 |
| 403 `node_locked` | 回滚（移出、重算，`source:'rollback'`）；提示"「{label}」已锁定"并带"解锁"按钮（派发 `set_lock{to:'none'}`，`U.14.03` §2） |
| 403 `forbidden`、422 `invalid_graph`、400 `bad_request`、404 `not_found` | 回滚；提示服务端的 `message`（422 取第一条诊断的 `msg`，`U.14.03-R2`：直接回滚并告知，不需要确认）；结果 `rejected` |
| 423 `estopped` | 回滚；不提示（急停横幅已说明，`U.14.03` §2） |
| 409 `idempotency_mismatch` | 回滚；提示"程序出了问题，已记录" + 复制详情（前端缺陷） |
| 429 | 等 `retryAfterMs`（缺省 1 秒）后用同一个键重发 |
| 5xx | 1、2、4 秒后用同一个键重发，3 次仍失败 → 回滚，提示 500 文案 |
| `NetError` | 回到 `queued`，`sync.state='offline'`；等 `ui.net` 回到 `online` 后用同一个键重发（服务端若其实已执行，按幂等键返回第一次的结果，`B.03.04` §5） |
| 401 | 停止循环（`ui.net='closed'`，整页说明接管） |
4. 每次条目状态变化后 `writer.setSync({pending: 未确认的 Op 条数, state})`：有 `conflict` → `conflict`；`net` 不在线且有条目 → `offline`；有条目 → `saving`；否则 `idle`。
5. 同一个手势（§6.8）排队中的条目只保留最新一条：新的 `update` 直接替换排队条目的 payload。

### 6.6 409 版本冲突（`B.04.02` §5、`U.14.03` §2、`G.13-R7`）
409 由本层处理成合并结果或合并提示，不再弹通用错误（`W.04.01` 只抛错，不提示）。
1. 把 `details.missedOps`（`OpRecord`，带 `version`，`W.04.04` §3.5）中 `version > confirmedVersion` 的依次应用到 `confirmed`，`confirmedVersion = details.head`；这些 Op 通常也会从图协同流到达，届时按版本号忽略。
2. 对失败条目的每条 Op 用 `classify(op, missed, confirmed)`：
   - `keep`：写集合与错过的 Op 不相交（`C.05.04` §2.1）。
   - `same`：碰到同一对象，但结果相同（同一参数改成同一个值、同一节点删两次）。
   - `gone`：引用的节点、连线、便签已被删除。
   - `clash`：其余（同一参数、显示名、标签被改成不同的值；同一非多连端口被接了别的线）。
3. 没有 `clash`：去掉 `same` 和 `gone` 的 Op；还剩 Op → 用新的幂等键、`base_version = head` 重新提交，成功后提示"已和最新版本合并"（`U.14.03` §2），结果 `merged`；有 `gone` 时提示后面加"其中 N 处的对象已被删除，已放弃"。全部去掉了 → 结果 `dropped{reason:'gone'}`（或 `same` 时 `merged`）。
4. 有 `clash`：条目 `state='conflict'`，暂停提交循环，`conflict` 设为 `{entryId, items}`——每项写明对象、我的值、对方的值和对方是谁（`theirsBy` 取错过的那条 Op 的 `actor.kind`）。`W.07.10` 弹"别人（或 AI）已改为 X · [保留我的] [用对方的]"。
   - `resolveConflict('mine')`：去掉 `same` / `gone`，用新键、`base_version = head` 重新提交（人的修改优先，`C.05.04` §5）。
   - `resolveConflict('theirs')`：去掉 `clash`、`same`、`gone`；还剩 `keep` 的 Op 就重新提交，否则移出，结果 `dropped{reason:'theirs'}`。
   - 选择之前，冲突条目之后排队的修改不提交（它们可能依赖这次修改）。
5. 撤销、重做、撤回返回的 409 不是合并问题：提示服务端给的原因（"该节点已被删除"），不弹合并框（`C.05.03-R4`、`U.13.03-R5`）。

### 6.7 远端 Op（图协同流）
| 事件 / 调用 | 处理 |
|---|---|
| `op.applied{version, op}` | `version ≤ confirmedVersion`：忽略（重复）。`version > confirmedVersion + 1`：放进 `buffer`，补齐缺口（下一行）。否则：`applyOp(confirmed, op)`（服务端的 Op 是权威的），`confirmedVersion = version`，记进 `recent`；`op.id` 属于某个条目 → 记 `echoed`，收齐后移出并以 `applied` 完成；重算显示 |
| 缺口 | `GET /graphs/{id}/ops?branch=&since_version=confirmedVersion`（分页直到 `buffer` 里最小的版本之前），逐条按上一行处理，再处理 `buffer`。缺口超过 1000 个版本 → 改为 `reload()` |
| `op.coalesced{version, opId, to}` | `to` 是合并后那条 Op 的完整新 `payload`（`C.06.03-R4`）：在 `recent` 里找到 `opId` 的 Op，换上新 payload 重新应用到 `confirmed`（`move_nodes`、`set_param` 都是"设为"语义，重复应用结果相同）。`opId` 是本页某个手势的第一条 Op → 该手势里已 `acked` 的最早一个条目视为已回声。`recent` 里找不到 → `reload()` |
| `onStreamOpen({graphVersion})` | `graphVersion > confirmedVersion` → 按"缺口"补齐；`graphVersion < confirmedVersion`（服务端被回退，不应发生）→ `reload()` |
| `reload()` | `GET /graphs/{id}?branch=` → `confirmed = fromDoc(graph)`、`confirmedVersion = graph.version`、`recent` 清空、`writer.load(doc, meta)`；`acked` 条目中响应版本 ≤ `graph.version` 的已包含在新文档里 → 移出并以 `applied` 完成；其余条目照常重放；重算显示 |
- 别人的 Op 应用后，正在显示的乐观条目照常重放在上面；若因此失败，按 §6.4 处理。
- 模型的 Op 到达时 `change.actor` 是模型，画布据此闪模型色、`W.07.10` 合并成"AI 修改了 N 处"（`W.03.01` §6.3）；远端提交写 graph store 时 `change.opIds` 填这批 Op 的 ID、`groupId` 填 Op 的 `group_id`（"全部撤销"逐条 `revertOp`，`P.09` K114）。

### 6.8 手势：连续拖动、步进、滑块（`C.05.04` §4、`U.13.02-R1`）
1. `gesture(kind, revert)`：生成 `coalesceKey = '<kind>:' + newUlid()` 和一个 `groupId`。
2. `update(op)`：记下最新的一条（`move_nodes` 或 `set_param`）。距上次提交 ≥ 250ms 时立即 `dispatch`（带 `coalesceKey`、`groupId`）；否则安排在满 250ms 时提交当时最新的那一条。**最多每 250ms 提交一次**；队列里已有本手势的排队条目时直接替换它的 payload（§6.5 第 5 步）。
3. 每次提交才写 graph store（`W.03` §6.5）；拖动中节点的实时位置只在画布引擎里，引擎按 `change.groupId` 认出是自己这次拖动，不把节点拉回。
4. `end(op)`：取消定时器，立即提交最后一条；返回它的结果。
5. `cancel()`：还没提交过 → 什么也不发；提交过 → 用同一个 `coalesceKey` 提交 `revert`（服务端合并成"回到原位"，`C.05.04` §4）。
6. 同一手势里的所有 Op 共用 `groupId`：即使两次提交间隔超过 2 秒没被服务端合并，撤销时也一起撤销（`U.13.03-R4`）。

### 6.9 撤销、重做、撤回（`E.05.02`、`U.13.03`）
1. 先 `flush()`：等前面的修改都提交完（撤销栈在服务端，前面的修改没到服务端就撤销会撤错，`E.05.02` §5）；有 `conflict` 条目时不发请求，提示"请先处理冲突"并返回 `failed`。
2. 发请求（不乐观，排在队列里，与普通提交同样串行）：
   - `undo`：`POST /graphs/{id}/undo {branch}`；`redo`：`POST /graphs/{id}/redo {branch}`。只撤销当前用户自己的组（服务端按操作者分栈，`U.13.03-R2`）。
   - `revertOp(opId)`：`POST /graphs/{id}/ops/{op_id}/revert`（撤销模型的某条修改，授权按用户判定，`C.05.03-R2`）。
   - `revertTo(version)`：`POST /graphs/{id}/revert {branch, version}`。
3. 响应 `OpResult.applied` 为空 → `nothing`（服务端"没有可撤销的组"返回 200 + 空，`E.05.02` §7）。
4. 否则等这些 Op 的回声（最多 2 秒，超时就补齐缺口），按每条 Op 服务端填写的 `target` 汇总出 `touched`（层 + 节点），返回 `done`；调用方（`W.02.04` 的 `Ctrl+Z` 处理函数、`W.07` 的按钮）交给 `W.06.13` 定位（`U.13.03-R6`、`R7`）。
5. 409 或其他错误 → `failed`，提示服务端的 `message`（`U.13.03-R5`）。

### 6.10 正在编辑（presence，`B.05.04` §5）
- `setEditing(scope, nodeIds)`：尾随节流 500ms 后 `POST /graphs/{id}/presence {scope, editing}`（每秒最多 2 次）；`nodeIds` 非空期间每 20 秒重发一次（服务端 60 秒没收到就当离开）；变为空时发一次空列表。
- 失败不提示、不重试（E 级信息）；`ui.net` 不在线时不发。
- 用途：模型的图操作工具会回避用户正在编辑的节点（`C.05.04` §5）。

### 6.11 离线、换图与释放
- 断开期间：`dispatch` 被 P1 拦住（画布只读）；断开前已入队的条目保留，恢复后按顺序提交（`U.14.05-R1`）。
- `dispose()`（工作区换图或释放，`W.03.05` §6.6–§6.7）：队列为空 → 直接销毁。否则把剩下的条目交给模块级的后台队列（按 `图 ID + 分支` 存在内存）继续按顺序提交（没有 graph store 可写，200 即视为完成，不再等回声）；遇到冲突则停住等待。再次为同一张图创建 Op 队列时，先接回后台队列里还没完成的条目，重放到显示的图上，冲突照常弹框。
- 任一队列（含后台队列）还有未确认的条目时，注册 `beforeunload`，浏览器提示"还有修改没有保存"；全部完成后注销。
- 页面关闭后，未提交的修改丢失（不在 localStorage 存图数据，`G.06.02-R7`）；`beforeunload` 是唯一的提醒。

## 7. 不变量
- graph store 的图数据只由本层经 `GraphWriter` 写入；面板、画布引擎、协议层都只能调 `dispatch`（INV-08、`W-R3`、`G.06.02-R5`）。
- 显示的图 = `confirmed` + 乐观条目按顺序重放，任何时候都可以从这两样重新算出。
- 同一张图同时最多一个提交在途；`base_version` 单调不减。
- 每个条目的所有重试共用同一个幂等键；请求体变了（合并后重提）才换新键。
- 一次 `dispatch` 的多条 Op 共用 `groupId`；一次手势的所有提交共用 `groupId` 和 `coalesceKey`。
- 拖动中最多每 250ms 一个 `move_nodes` 提交（`C.05.04` §4、`E.05.04` §2）。
- 浏览器发出的 Op 不带 `actor`、`approver`、`reason`、`taint`（服务端填写，`C.05.01` §3、`W-R5`）。
- 本层没有任何代码路径调用解除急停（`W-R6`）。
- 前端不保存撤销栈，不计算逆操作（`C.05-R1`）。

## 8. 错误处理
| 错误 | 触发 | 用户看到（文案按 `G.13-R2`，由 `W.10` 提供） |
|---|---|---|
| 预检不通过 | 拖线类型不兼容、改冻结节点 | 行内提示、拖线变红；不入队 |
| `graph_conflict` 409 | 别人（或 AI）同时改了同一处 | 能合并：提示"已和最新版本合并"；不能：冲突框"保留我的 / 用对方的" |
| `node_locked` 403 | 节点被锁 | 回滚 + "「{label}」已锁定" + "解锁" |
| `forbidden` 403、`invalid_graph` 422、`bad_request` 400、`not_found` 404 | 服务端拒绝 | 回滚 + 服务端的说明（不需要确认，`U.14.03-R2`） |
| `estopped` 423 | 急停中（模型 Op；用户 Op 不应出现） | 回滚，不另外提示 |
| 5xx 重试 3 次仍失败 | 服务端缺陷 | 回滚 + "程序出了问题，已记录" + 复制详情（`G.13-R4`） |
| 网络断开 | 服务关闭、休眠 | 修改留在队列，横幅由 `W.04.05` / `W.07.10` 显示 |
| 依赖的对象被删 | 排队时别人删了节点 | 撤回 + "有 N 处修改依赖的对象已被删除，已撤回" |
| 撤销失败 409 | 节点已被删除 | "撤销失败：{服务端原因}"（`U.13.03-R5`） |
| 回声 5 秒没到 | 图协同流断了 | 自动补齐缺口，不提示 |

## 9. 性能与资源
- `dispatch` 到 `writer.commit`（乐观应用 + 重放）≤ 2ms（500 节点、10 个未确认条目）。
- `precheck` / `canConnect` ≤ 0.5ms（推断命中缓存时）；拖线时每帧调用不掉帧（`U.17`）。
- 推断首次计算 500 节点 ≤ 10ms（`C.04.03` §5 验收 3）。
- `recent` 最多 500 条；后台队列最多 200 个条目，超过时最旧的结果为 `rejected` 并提示。
- presence 每张图每秒最多 2 个请求。

## 10. 验收标准
1. 拖动节点 3 秒：服务端只收到 ≤ 13 次 `move_nodes`，操作历史里 1 条，`Ctrl+Z` 一次回到原位（`C.05.04` §6 验收 3、`U.13.02-R1`）。
2. 两个标签页同时改同一参数：后提交的一方弹冲突框；"保留我的"后两边一致；改不同参数时自动合并、提示"已和最新版本合并"（`U.14.03` §2）。
3. 断开服务后 1 秒内改一个参数，6 秒后恢复：修改被提交，服务端与前端的 `graphHash` 一致（`U.14.05-R1`，`W0405-T8`）。
4. 前端对 `schema/examples/ops/` 每个乐观类合法示例的本地应用结果，与服务端应用后 `GET /graphs/{id}` 的规范化哈希相同（`W05-T16`）；`hash_vectors.json` 全部通过（`E0203-T3`）。
5. `assign_vectors.json` 全部与 Go 结果一致（`C.04.02-R1`）。
6. 模型改了节点后点 AI 角标"撤销"：发出的是 `revert_op`，画布定位到那个节点（`U.13.03-R3`、`R6`）。
7. 在 `panels/` 里直接调用 `GraphWriter` 或绕过 `dispatch` 改图：ESLint 报错（`W.03.01` §10 验收 5）。

### 实施卡
- 要建 / 要改的文件：`web/src/ops/types.ts`、`web/src/ops/hash.ts`、`web/src/ops/hash.test.ts`、`web/src/ops/typecheck.ts`、`web/src/ops/typecheck.test.ts`、`web/src/ops/apply.ts`、`web/src/ops/apply.test.ts`、`web/src/ops/validate.ts`、`web/src/ops/validate.test.ts`、`web/src/ops/merge.ts`、`web/src/ops/merge.test.ts`、`web/src/ops/gesture.ts`、`web/src/ops/gesture.test.ts`、`web/src/ops/history.ts`、`web/src/ops/history.test.ts`、`web/src/ops/presence.ts`、`web/src/ops/presence.test.ts`、`web/src/ops/queue.ts`、`web/src/ops/queue.test.ts`、`web/src/ops/registry.ts`、`web/src/ops/useOps.ts`、`web/src/ops/index.ts`、`web/src/lib/i18n/zh.ts`
- 说明：属于第 ⑩c 片 `m1-web-ops` 的唯一叶子（`P.09` K306）。响应结构使用 `@/lib/protocol` 的 `OpsApplied`、`OpsProposed`、`GraphConflictDetails`、`OpRecord`（K260）；`web/src/lib/i18n/zh.ts` 仅补齐 `ops.*` 运行期提示文案（409 合并、冲突、202 提议、锁节点解锁、依赖撤回、撤销失败等）；`W05-T17` 同时满足 `E0203-T4`（`P.09` K256）；`W05-T16` 在本片单元测试覆盖 `schema/examples/op_vectors.json` 全乐观合法向量，真实后端联调哈希比对与 `W05-T23` Playwright 用例移入第 ⑫ 片 `W.12`。
- 不许碰的文件：`web/src/state/`（只用导出的类型、`GraphWriter`、`fromDoc` / `toDoc`、选择器）、`web/src/lib/protocol/`（含 `generated/`）、`web/src/canvas/`、`web/src/panels/`、`schema/`（测试只读 `schema/examples/`）、`engine/`、`internal/`
- 函数签名：见 §4。
- 测试用例（假 `RestClient`、假时钟、内存 graph store）：
  - `W05-T1 乐观与回声`：`dispatch(set_param)` → graph store 立即变化、`sync.pending=1`；200 后 `sync` 仍为 `saving`；收到同 id 的 `op.applied` → 条目移出、`pending=0`、`idle`、结果 `applied`
  - `W05-T2 回声先到`：`op.applied` 先于 POST 响应到达 → 只应用一次，结果正确
  - `W05-T3 串行与 base_version`：连续 3 次 `dispatch`：同一时刻只有 1 个请求在途；第 2 个请求的 `base_version` 等于第 1 个响应的 `version`
  - `W05-T4 回滚`：403 `node_locked` → 图恢复、`change.source='rollback'`、提示带"解锁"；422 → 提示第一条诊断
  - `W05-T5 依赖撤回`：排队中的 `connect` 依赖的节点被远端 `remove_nodes` 删除 → 该条目 `dropped{dependency}`，提示
  - `W05-T6 409 自动合并`：本地改参数 A，期间远端改参数 B → 409 带 `missed_ops` → 用新幂等键、`base_version=head` 重提 → `merged`，提示"已和最新版本合并"
  - `W05-T7 409 冲突`：本地与远端改同一参数为不同值 → `conflict` 有 1 项（`mine`、`theirs`、`theirsBy='model'`）、提交暂停；`mine` → 重提；另测 `theirs` → 移出、图显示对方的值、后面排队的修改继续提交
  - `W05-T8 409 同值与已删除`：远端改成同一个值 → 该 Op 去掉、不弹框；远端删了节点 → `gone`，提示"已放弃"
  - `W05-T9 幂等重试`：第一次 `NetError` → 等 `ui.net` 回到 `online` 后重发，两次请求的 `Idempotency-Key` 相同；5xx 三次后回滚
  - `W05-T10 202 提议`：响应 202 → 乐观修改消失、结果 `proposal`、提示"已转为提议"
  - `W05-T11 缺口补齐`：本地 v10，收到 v13 → 先 `GET …/ops?since_version=10` 应用 v11、v12，再应用 v13；重复的 v12 被忽略
  - `W05-T12 onStreamOpen`：`graphVersion=15`、本地 12 → 补齐 13–15；差 1500 → `reload()`
  - `W05-T13 coalesced`：远端 `op.coalesced{opId: 已知, to:{moves}}` → 节点到新位置、版本不变；`opId` 未知 → `reload()`
  - `W05-T14 手势节流`：假时钟 3 秒内 `update` 180 次 → `dispatch` ≤ 13 次、全部带同一 `coalesceKey` 和 `groupId`；`end` 立即提交最后一条；`cancel`（已提交过）→ 提交 `revert`；`cancel`（没提交过）→ 不发请求
  - `W05-T15 预检`：P1–P11 每条一个正例一个反例；`assign_vectors.json` 全集结果与文件一致（`C0402-T1` 前端一侧）；资源 `ref` → Agent `context` 被拒、规则 C2（`C0402-T2`）；类型未加载时 `uncertain:true`；急停中用户的 `set_param` 预检通过（K82）
  - `W05-T16 本地应用一致`（单元测试侧）：读取 `schema/examples/op_vectors.json` 中每条乐观类合法示例并在示例图上执行 `applyOp`，验证 `toDoc` 规范化结构完整、结构共享且未修改原图
  - `W05-T17 哈希向量`：`schema/examples/hash_vectors.json` 每条 `canonicalJson` 与 `graphHash` 与期望值逐字节相同（落实 `E0203-T3` / `E0203-T4`）
  - `W05-T18 撤销`：有排队修改时 `undo` 先等它们提交；`applied=[]` → `nothing`；正常 → `done` 且 `touched` 含改动所在的层；409 → `failed`、提示原因；有冲突时 `undo` 直接 `failed`
  - `W05-T19 不乐观的 Op`：`group` 不改本地图，`op.applied` 到达后图里出现子图引用节点和服务端生成的端口
  - `W05-T20 释放与接回`：有未确认条目时 `dispose` → 后台队列继续提交；同一张图再建队列 → 接回剩余条目；`beforeunload` 在有条目时注册、清空后注销
  - `W05-T21 presence`：1 秒内 `setEditing` 10 次 → 请求 ≤ 2 个；保持编辑 45 秒 → 重发 2 次；变空 → 发一次空列表
  - `W05-T22 容器节点`：`dispatch(add_node 循环)` 的 payload 自带一对子图端口；乐观结果的 `scopes` 有这个容器
  - `W05-T24 ESLint`：ESLint API 校验 `src/panels/bad.ts` import `GraphWriter` → 报错
  - `W05-T25 portTypes 与 fits`：`portTypes(scope)` 与 `inferScope` 结果相同，同一 `model` 下两次调用返回同一个 Map；`fits` 对 `assign_vectors.json` 每条与 `assignable(...).ok` 一致
- 在其他叶子跑的测试用例（不算本叶子的完成条件，`P.09` K306）：
  - `W05-T23 端到端`：第 ⑫ 片 `W.12`（`web/tests/e2e/ops.spec.ts`，§10 验收 1、2、6 及 `W05-T16` 真实服务端 `anydoor --fake-llm` 哈希联调，Playwright）
- 允许使用的依赖：`zustand`（`zustand/vanilla` 用于 `conflict` 小 store，`G.10` §3.3）；测试用 `vitest`、`jsdom`、`eslint`（`G.10` §3.4）。
- 禁止事项：`G.02.05` 全部（特别是 R1–R3、R6、R14、R28）；另：不在前端计算逆操作、不保存撤销栈；不在 Op 里填 `actor` / `approver` / `reason` / `taint`；不对"等服务端"一栏的 Op 做乐观应用；不用 `tmp:N`；拖动中提交不得快于每 250ms 一次；不在 localStorage 存未提交的修改；不调用解除急停。
- 完成标志：`G.14` 全部条件；§10 单元测试对应验收全部通过，`relay slice m1-web-ops` ①–⑦ 全部通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §4.1 `OpsApi` 新增 `portTypes`、`fits`；测试 `W05-T25` | `P.09` K99（画布要显示推断后的端口类型、给不在图里的节点挑端口） |
| 2026-11-23 | §6.7：远端 Op 写 graph store 时填 `change.opIds`、`groupId` | 第 8 棒写 `W.07.10`；`P.09` K114 |
| 2026-11-27 | 状态改为"已审"；对齐 `OpsApplied`/`OpsProposed`（K260），实施卡按 R24 重写，加入 `zh.ts` 运行期文案与 `E0203-T4` 覆盖，`W05-T23` 移入第 ⑫ 片 `W.12` | M1 第 ⑩c 片 `m1-web-ops` 复查（`P.09` K306） |
