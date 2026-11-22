# W.03.06 model store

| 项 | 内容 |
|---|---|
| 编号 | W.03.06 |
| 类型 | 实施 |
| 上级 | W.03 状态层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设12（模型操作者界面）；demo `设计规范_v0.3/src/29_model.js`（提议、幽灵节点、提议栏、AI 光标、"模型正在编辑"）；`C.08`；`E.17.03`；`U.12` |
| 最后修改 | 2026-11-23 |

## 1. 职责
当前图上"模型这个操作者"的状态：本图本分支待处理的提议、每个提议的幽灵预览（按层分好）、"逐条查看"看到第几处、模型正在做什么和 AI 光标的目标、会话档位和当前层的有效档位；以及采纳、拒绝、设置档位这些动作。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 幽灵节点、幽灵连线、AI 光标的绘制 | `W.06.14` |
| 提议栏、提议卡片、档位胶囊、授权面板 | `W.07.09`、`W.07.04`、`W.07.01` |
| 采纳后图的变化 | 不在本 store：采纳的 Op 作为 `op.applied` 经图协同流到 `W.05`，再写 graph store |
| "AI 角标"（节点被模型改过） | `W.03.01` 的 `modelTouched`（数据在 `Node.origin`） |
| 模型直接修改（档位 2 以上）后的提示 | `W.07.10`（看 graph store 的 `change.actor`） |
| 审批 | `W.03.05`（图结构的审核走提议，运行时动作才走审批，`C.08-R5`） |
| 解除急停 | 不提供（INV-10） |

## 3. 继承的上级约束
`W.03` §4.1、§6.2、§7；`W-R4`、`R5`、`R14`；`C.05.01` §4（202 → 提议）；`C.08`（R2、R4–R8，§4.1 状态，§4.3 预览）；`C.09` §5、§6；`C.06.03`（`proposal.*`、`mandate.changed`、`model.activity`）；`E.17.03`；`B.04.02`、`B.04.05`；`U.12`（§3、§5、§6，R2）；`U.14.04` §3（急停后 0 档）；`P.09` K79。

## 4. 接口
```ts
// web/src/state/modelStore.ts
import type { Actor, Effective, Proposal, ProposalPreview, Ulid } from '@/lib/protocol';
import type { Scope, ReadonlyStore } from './types';

export type GhostMark = ProposalPreview['marks'][number] & { proposalId: Ulid; scope: Scope };
export type GhostMarks = {
  byScope: ReadonlyMap<Scope, readonly GhostMark[]>;       // 每层要画的幽灵元素
  ghostGraph: GraphModel;                                  // 预览图规范化后（W.03.01 fromDoc），幽灵节点的位置、类型从这里取
};
export type ModelActivity = {
  actor: Actor;
  state: 'idle' | 'thinking' | 'editing' | 'waiting' | 'stopped';
  target?: { node?: Ulid; scope?: Scope };                 // AI 光标移向这里（K79）
  at: number;
};
export type ModelState = {
  graphId: Ulid; branch: string;
  proposals: ReadonlyMap<Ulid, Proposal>;                  // status 为 open / partially_applied
  previews: ReadonlyMap<Ulid, { forVersion: number; marks: GhostMarks }>;
  stale: readonly Ulid[];                                  // 变成 stale 的提议：提议栏显示"已过期"，用户关掉前一直在
  deciding: ReadonlySet<Ulid>;                             // 正在提交采纳 / 拒绝的提议（按钮置灰）
  review: null | { proposalId: Ulid; index: number };      // "逐条查看"（U.12 §3）
  activity: ModelActivity | null;
  level: { session: Effective | null; scope: Effective | null; scopeKey: Scope };
};
export type ModelActions = {
  refresh(): Promise<void>;                                            // GET /graphs/{id}/proposals?status=open,partially_applied
  accept(pid: Ulid, opIds: readonly Ulid[]): Promise<void>;            // POST /proposals/{pid}/decide {accept}
  reject(pid: Ulid, opIds: readonly Ulid[]): Promise<void>;            // POST /proposals/{pid}/decide {reject}
  acceptAll(pid?: Ulid): Promise<void>;                                // 不给 pid = 提议栏的"全部采纳"：依次处理全部提议
  rejectAll(pid?: Ulid): Promise<void>;
  dismissStale(pid: Ulid): void;
  startReview(pid?: Ulid): void;  reviewStep(delta: 1 | -1): void;  endReview(): void;
  setSessionLevel(level: 0 | 1 | 2 | 3 | 4): Promise<void>;           // POST /sessions/{sid}/level（档位胶囊，B.04.05）
  refreshLevel(scope?: Scope): Promise<void>;                          // GET /authz/effective?graph_id=&scope=&actor=model:*
};
export type ModelStoreApi = ReadonlyStore<ModelState> & { actions: ModelActions };
export type ModelIngest = {                                            // 只给事件路由和工作区
  graphEvent(ev: GraphEvent): void;                                    // proposal.*、mandate.changed、model.activity
  toolHint(ev: RunEvent): void;                                        // 当前运行的 orch.tool_call
  serverVersion(v: number): void;                                      // graph store 的 serverVersion 前进时调用
  estop(on: boolean): void;                                            // session store 的急停变化
  reconnected(): void;                                                 // 图协同流重连：activity 置 null（§6.5）
};
export function createModelStore(o: {
  sessionId: Ulid; graphId: Ulid; branch: string; scope: Scope;
  client: RestClient; now?: () => number;
}): { store: ModelStoreApi; ingest: ModelIngest; dispose(): void };

// 选择器（纯函数，按 previews 对象缓存）
export function marksIn(s: ModelState, scope: Scope): readonly GhostMark[];
export function proposalMarkCount(s: ModelState): number;                               // "模型提议 N 处修改"：全部提议的标记数
export function elsewhere(s: ModelState, scope: Scope): readonly { scope: Scope; count: number }[];   // "另有 2 处在「闭环迭代」里"（U.12-R2）
export function scopesWithProposals(s: ModelState): ReadonlySet<Scope>;             // 结构树的模型色小点
export function reviewTarget(s: ModelState): GhostMark | null;                       // 逐条查看当前聚焦的那处（引擎定位用）
export function levelBadge(s: ModelState): { level: number; isScopeOverride: boolean } | null;   // 档位胶囊 + "本层"字样（U.12 §6）
```

### 4.1 依赖
`W.03.01` 的 `fromDoc`、`GraphModel`；`W.03` §4.3 的 `RestClient`；`@/lib/protocol` 的 `Proposal`、`ProposalPreview`、`GraphEvent`、`RunEvent`、`Actor`、`Effective`（K80）。

## 5. 数据结构
`GhostMark`、`GhostMarks`、`ModelActivity` 为本节点私有（`GhostMark` 是生成类型 `ProposalPreview` 的标记加上所在层）。提议对象原样存生成类型。

## 6. 行为

### 6.1 提议的进出
| 来源 | 处理 |
|---|---|
| 创建 store | `refresh()`：拉本图本分支 `open` 和 `partially_applied` 的提议，逐个拉预览 |
| `proposal.created` | `GET /proposals/{pid}` 加入 `proposals`，再拉预览 |
| `proposal.updated` | 更新 `status`、`base_version`；`status='stale'` → 从 `proposals` 移到 `stale`；否则重拉预览 |
| `proposal.decided` | `status` 为 `applied` / `rejected` → 从 `proposals`、`previews` 删除，结束对它的逐条查看；为 `partially_applied` → 保留并重拉预览 |
| 图前进（`serverVersion(v)`） | 预览的 `forVersion < v` 时，300ms 防抖后重拉（幽灵节点要叠在最新的图上，`C.08` §4.3） |
| 提交 `POST /graphs/{id}/ops` 得到 202 `{proposal_id}`（Op 被规则转为提议，`C.08-R5`） | 不需要 `W.05` 通知：服务端同时在图协同流发 `proposal.created`，按第二行处理 |

### 6.2 预览按层分
拉到 `ProposalPreview` 后：`ghostGraph = fromDoc(preview.ghost_graph)`；每个标记按目标找所在层——`target.node`（含 `tmp:N`）用 `ghostGraph.nodes.get(id).scope`，`target.edge` 用连线的 `scope`，参数修改用节点的 `scope`。找不到的标记丢弃并 `console.warn`。

### 6.3 采纳与拒绝
1. `deciding` 加入 `pid`。
2. `accept`：`POST /proposals/{pid}/decide {accept: opIds, reject: []}`；`reject` 同理。依赖联动由服务端做（`C.08-R6`）：采纳一条，它依赖的一起采纳；本 store 不自己推算。
3. 成功：`deciding` 删掉 `pid`；**不**在本地改图或删幽灵——等 `proposal.decided` / `proposal.updated` 和 `op.applied` 到达再变化，这样幽灵节点和真实节点在同一帧交接（`C.08-R2` 的 `id_map` 由服务端换好 ID）。
4. 409 `proposal_stale`：移到 `stale`。其他错误：`deciding` 删掉 `pid`，Promise 拒绝。
5. `acceptAll()` / `rejectAll()` 不给 `pid`：按提议创建时间顺序逐个 `POST /proposals/{pid}/accept-all`（或 `reject-all`），前一个完成再发下一个；任何一个失败就停下并拒绝。
- 采纳等于用户亲自做：授权按用户判定，`approver=user`（`C.08-R7`）——前端不带任何身份字段（`W-R5`）。

### 6.4 逐条查看
`startReview(pid)`（不给 `pid` 取第一个提议）→ `index=0`；`reviewStep(±1)` 在**全部提议的全部标记**里前后移动（跨提议、跨层）；`reviewTarget` 给出当前标记。目标在其他层时，`W.07.09` 调用 `W.02.01` 的 `enterLayer` 进入那一层（`U.12-R2`）；引擎按 `reviewTarget` 聚焦。提议被处理掉后 `index` 夹到范围内，没有标记了就 `endReview`。

### 6.5 模型活动与 AI 光标
- `model.activity`（图协同流，E 级）：按 `actor` 覆盖 `activity`；`state='idle'` 时置 null。这是对话 Agent 的 AI 光标和"AI 正在编辑…"的来源（K79、`B.06.02.02`）。
- `orch.tool_call`（只在当前运行的运行流里有）：`activity = {actor: ev.actor, state:'editing', target:{node: ev.data.target_node}}`。
- 30 秒没有任何更新的 `activity` 自动置 null（E 级事件不补发，流断了会留下一个停住的光标）；图协同流重连时也置 null。
- 用户正在编辑的节点模型会回避（`C.05.04` §5）：提示"AI 等你改完这个节点"由 `W.07` 根据 `activity.target` 与本页的 presence 判断，本 store 只提供数据。

### 6.6 档位
- 创建、换层（工作区调 `refreshLevel(scope)`）、收到 `mandate.changed` 时：并行取会话档位（`GET /authz/effective?graph_id=&actor=model:*`，不带 `scope`）和当前层档位（带 `scope`）。
- `levelBadge`：显示当前层的档位；与会话档位不同时 `isScopeOverride=true`，胶囊旁显示"本层"（`U.12` §6）。
- `setSessionLevel(n)`：`POST /sessions/{sid}/level {level}` → 用返回的 `Effective` 更新 `level.session`，再 `refreshLevel()`；不做乐观修改（档位是安全设置，以服务端结果为准）。
- `estop(true)`：`level` 两项都显示为 0（`U.14.04` §3），并把 `activity` 置 null；`estop(false)`：`refreshLevel()`——解除后档位保持 0，需要用户手动调高（服务端结果自然如此）。

## 7. 不变量
- 只保存本 store 的图、分支的提议；`proposals` 里只有 `open` 和 `partially_applied`。
- 本地永远不因为点了"采纳"就改图：图的变化只来自 `op.applied`（INV-08、`W-R3`）。
- 档位只以服务端返回为准；本 store 没有任何提高档位的本地逻辑（`W-R4`）。
- 本 store 不调用任何急停接口。
- 每个幽灵标记都有 `proposalId` 和 `scope`；同一 `previews` 对象下选择器返回同一引用。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 预览拉取失败 | 该提议没有幽灵显示，提议栏仍计数；下次图前进或 5 秒后重试一次 |
| 采纳 / 拒绝失败 | §6.3 第 4 步 |
| `setSessionLevel` 失败（403、423 急停中） | Promise 拒绝，`level` 不变；档位面板显示原因 |
| `GET /proposals/{pid}` 404（已被处理） | 忽略这条 `proposal.created` |

## 9. 性能与资源
- 一个 50 处修改的提议：预览分层 ≤ 3ms（含 `fromDoc`）。
- 预览重拉有 300ms 防抖；同一提议同时最多一个预览请求在路上（新的请求发出前取消旧的）。
- `model.activity` 每秒可能数次：`set` 只改 `activity` 字段；订阅它的只有顶部条胶囊和画布引擎（AI 光标），不引起其他面板渲染。

## 10. 验收标准
1. `C.08` §5 验收 1–4 在前端联调通过：整个 GraphPatch 变提议时图不变、幽灵节点出现；拒绝 `add_node tmp:1` 后连到它的幽灵连线一起消失；采纳后幽灵换成真实节点，节点带 AI 角标；用户删掉提议要连的节点后提议栏显示"已过期"。
2. 提议涉及子图里 2 处时，根图提议栏写"另有 2 处在「闭环迭代」里"，结构树那一层有模型色小点（`U.12-R2`）。
3. "逐条查看"能跨层依次聚焦每一处（左右箭头切换）。
4. 对话 Agent 改图时 AI 光标移到它正在操作的节点；回复结束光标消失；断网 30 秒后光标不残留（K79）。
5. 档位胶囊显示会话档位；进入一层单独设了授权书的子图时显示这一层的档位和"本层"；急停后显示 0（`U.12` §6、`U.14.04` §3）。

### 实施卡
- 要建 / 要改的文件：`web/src/state/modelStore.ts`、`web/src/state/modelStore.test.ts`、`web/src/state/__fixtures__/proposal_preview.json`（按 `C.08` §4.3 的格式：一个新增节点、一处参数修改、一条删除连线，其中一处在子图里）。
- 不许碰的文件：`web/src/canvas/`（幽灵渲染在 `W.06.14`）、`web/src/ops/`、`web/src/lib/protocol/`、`web/src/state/graphStore.ts`（只用它导出的 `fromDoc`）、`schema/`。
- 函数签名：见 §4。
- 测试用例（假 `RestClient`、假时钟）：
  - `W0306-T1 初始加载`：两个 open 提议 → `proposals` 2 个、两份预览；`proposalMarkCount` = 标记总数
  - `W0306-T2 分层`：`proposal_preview.json` → 根图 2 个标记、子图 1 个；`elsewhere('root')` = `[{scope: 子图, count: 1}]`；`tmp:1` 的层取自 `ghost_graph`
  - `W0306-T3 事件`：`proposal.updated{status: stale}` → 移进 `stale`；`proposal.decided{status: applied}` → 删除；`partially_applied` → 保留并重拉预览
  - `W0306-T4 采纳不改本地`：`accept` 成功后 `proposals`、`previews` 不变，直到 `proposal.decided` 到达
  - `W0306-T5 409 过期`：`accept` 返回 `proposal_stale` → 移进 `stale`，Promise 拒绝
  - `W0306-T6 全部采纳顺序`：3 个提议 → 依次 3 次 `accept-all` 请求，第 2 个失败则第 3 个不发
  - `W0306-T7 预览防抖`：300ms 内 `serverVersion` 前进 5 次 → 每个提议只重拉 1 次
  - `W0306-T8 逐条查看`：跨两个提议、两层前后移动；处理掉当前提议后 `index` 夹紧
  - `W0306-T9 活动`：`model.activity{editing, target}` → `activity.target` 正确；`idle` → null；30 秒无更新 → null；`orch.tool_call` → `editing`
  - `W0306-T10 档位`：会话 1 档、当前层 3 档 → `levelBadge = {level: 3, isScopeOverride: true}`；`estop(true)` → 0；`setSessionLevel` 失败不改 `level`
  - `W0306-T11 缓存`：同一 `previews` 下 `marksIn` 两次返回同一数组
- 允许使用的依赖：`zustand`；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部（特别是 R6、R14）；另：不在本地应用被采纳的 Op；不乐观修改档位；不提供任何解除急停的入口；不保存别的图或别的分支的提议。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `ModelIngest` 加 `reconnected()`，落实 §6.5"图协同流重连时也置 null" | 写 `W.04.02` 时对齐（`W.03` §6.2） |
