# W.03.05 session store

| 项 | 内容 |
|---|---|
| 编号 | W.03.05 |
| 类型 | 实施 |
| 上级 | W.03 状态层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15（会话）；demo v0.5（v0.5.11）`32_sessions.js`（会话列表、`save` / `load` 整套现场、新建会话、`Alt+[ ]`）、`35_inbox.js`（待处理）；`U.09.04`；`P.09` K40、K73、K74、K81 |
| 最后修改 | 2026-11-23 |

## 1. 职责
应用级的会话数据和会话工作区：会话列表、各会话的活动摘要（运行中、待审批）、全局待审批、急停状态、已打开会话的对话；`SessionWorkspace` 的创建、复用、释放（最多 5 个）和事件流的开关；三条流的事件路由；React 用的 Provider 与 hook；以及应用级的目录 store（`W.03` §4.5，K81）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 会话列表、对话页、浮动回复、审批卡片、通知中心长什么样 | `W.07.02`、`W.07.04`、`W.07.08`、`W.07.09`、`W.07.10` |
| 路由解析、改 URL | `W.02.01`（它调用工作区的 `activate`、`setLocation`） |
| 图的写入、Op 队列 | `W.05`（工作区经 `StateDeps.ops` 为当前图创建它） |
| 运行数据 | `W.03.04`（工作区持有一份 run store） |
| 断线检测、SSE 重连细节 | `W.04.02`、`W.04.05` |
| 转场动画 | `W.06.13`（`U.09.04-R5`） |

## 3. 继承的上级约束
`W.03`（全部）；`W.01-R13`–`R17`（K73）；`W-R5`、`R6`、`R10`；INV-10；`C.06.04`（R1–R3）；`C.10`（R1–R3、R6）；`B.04.04`、`B.04.05`、`B.04.09`；`B.05.02`、`B.05.04`；`U.09.04`（全部）；`U.09.05`（R2、R4）；`U.09.06-R2`、`R7`；`U.14.04`；`U.17` §1（切换会话 ≤ 300ms）。

## 4. 接口

### 4.1 session store
```ts
// web/src/state/sessionStore.ts
import type { Approval, ApprovalGroup, Message, Selection, Session, Ulid } from '@/lib/protocol';

export type SessionActivity = { runningRunIds: readonly Ulid[]; pendingApprovals: number };
export type EstopState = { global: boolean; runIds: readonly Ulid[] };
export type ChatStatus = { state: 'idle' | 'thinking' | 'tool' | 'editing' | 'waiting' | 'stopped'; note?: string };
export type Conversation = {
  status: 'loading' | 'ready' | 'error';
  messages: readonly Message[];          // 按 created_at 升序
  hasOlder: boolean; olderCursor?: string;
  lastSeq: number;                       // 会话流续传位置
  chat: ChatStatus;
};
export type SessionState = {
  list: { items: readonly Session[]; nextCursor?: string; q: string; status: 'idle' | 'loading' | 'ready' | 'error' };
  currentId: Ulid | null;
  activity: { bySession: ReadonlyMap<Ulid, SessionActivity>; at: number; status: 'ok' | 'error' };
  approvals: { groups: readonly ApprovalGroup[]; byId: ReadonlyMap<Ulid, Approval> };   // 全部会话的待审批（K73）
  estop: EstopState;
  conversations: ReadonlyMap<Ulid, Conversation>;   // 只有内存里有工作区的会话才有
  graphMeta: ReadonlyMap<Ulid, GraphMeta>;          // GET /graphs?limit=200：会话列表第二行、结构区图切换（W.07.02，K114）
  inbox: { runs: readonly RunMeta[]; connections: readonly { id: string; target: 'mcp' | 'provider'; error: string; at: string }[]; at: number; status: 'idle' | 'loading' | 'ready' | 'error' };   // 通知中心"动态"（W.07.10，K114）
};
export type SessionActions = {
  // 列表（C.06.04-R1：增删不走会话流，本地操作后刷新）
  loadList(o?: { q?: string; more?: boolean }): Promise<void>;
  create(title?: string): Promise<Session>;
  rename(sid: Ulid, title: string): Promise<void>;
  setPinned(sid: Ulid, pinned: boolean): Promise<void>;
  remove(sid: Ulid): Promise<void>;
  attachGraph(sid: Ulid, graphId: Ulid): Promise<void>;
  detachGraph(sid: Ulid, graphId: Ulid): Promise<void>;
  setOrchestratorModel(sid: Ulid, model: string): Promise<void>;
  setEffort(sid: Ulid, model: string, effort: Effort): Promise<void>;          // orchestrator_effort（C.10-R6）
  saveLastLocation(sid: Ulid, loc: { graphId: Ulid; scope: Scope }): void;     // 1 秒尾随节流后 PATCH（C.10-R3）
  // 对话
  send(sid: Ulid, content: string, o?: { selection?: Selection; refs?: readonly MessageRef[] }): Promise<void>;   // refs：C.10-R7（K113）
  stop(sid: Ulid, messageId: Ulid): Promise<void>;
  retry(sid: Ulid, messageId: Ulid): Promise<void>;
  loadOlder(sid: Ulid): Promise<void>;
  reloadConversation(sid: Ulid): Promise<void>;     // 对话首页拉取失败后的"重试"（W.07.04）
  upload(sid: Ulid, file: File, onProgress?: (p: number) => void): Promise<{ ref: string; name: string; size: number }>;   // POST /sessions/{sid}/uploads
  listFiles(sid: Ulid, q: string): Promise<readonly { path: string; name: string; size: number; source: 'session' | 'allowed' }[]>;
  contextUsage(sid: Ulid, draft: { chars: number; selection: number; refs: readonly MessageRef[] }): Promise<ContextUsage>;
  compact(sid: Ulid): Promise<void>;
  clearMessages(sid: Ulid): Promise<void>;          // 成功后清空本地 Conversation.messages
  loadGraphMeta(): Promise<void>;                    // 300ms 防抖；session.updated / graph_attached 后也调
  loadInbox(): Promise<void>;                        // GET /runs?status=done,failed,cancelled&since=24h&limit=50、GET /mcp-servers、GET /providers（只取出错的）
  getApproval(aid: Ulid): Promise<Approval>;         // 已不在待审批里的（对话里的旧卡片）；最近 50 个缓存
  // 审批与急停
  resolveApproval(aid: Ulid, r: { outcome: string; scope?: 'once' | 'always'; note?: string; value?: unknown; trustSources?: readonly string[] }): Promise<void>;
  resolveBatch(ids: readonly Ulid[], r: { outcome: string; scope?: 'once' | 'always' }): Promise<void>;
  triggerEstop(): Promise<void>;                     // POST /estop；不需要确认（U.14.04 §3）
  releaseEstop(): Promise<void>;                     // DELETE /estop；只在急停横幅的确认框里调用（§7）
  refreshActivity(): void;                           // 立即刷新（300ms 防抖）
  onActivity(fn: (d: ActivityDiff) => void): () => void;   // 通知中心、提示用
};
export type Effort = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export type ActivityDiff = {
  runStarted: readonly { runId: Ulid; sessionId: Ulid }[];
  runEnded: readonly { runId: Ulid; sessionId: Ulid }[];
  approvalAdded: readonly Ulid[]; approvalRemoved: readonly Ulid[];
  estopChanged?: EstopState;
};
export type SessionStoreApi = ReadonlyStore<SessionState> & { actions: SessionActions };
export type SessionIngest = {                        // 只给工作区和事件路由
  sessionEvent(sid: Ulid, ev: SessionEvent): void;
  approvalEvent(ev: RunEvent): void;                 // approval.requested / resolved
  estopEvent(ev: RunEvent): void;                    // estop.triggered / released
  openConversation(sid: Ulid): Promise<void>;        // 首页消息 + 建 Conversation
  closeConversation(sid: Ulid): void;                // 工作区释放时
  setCurrent(sid: Ulid | null): void;
};
export function createSessionStore(deps: StateDeps): { store: SessionStoreApi; ingest: SessionIngest; dispose(): void };
```

### 4.2 选择器
```ts
export function sessionMeta(s: SessionState, sid: Ulid): Session | undefined;
export function isRunning(s: SessionState, sid: Ulid): boolean;              // 会话列表"● 运行中"（U.09.04-R1）
export function pendingCount(s: SessionState, sid?: Ulid): number;           // 角标；不给 sid = 全部（标签页标题"（待审批）"，W.02.01 §6.3）
export function effortFor(sess: Session, model: string, fallback: Effort): Effort;   // U.09.06-R6、R7
export function lastAssistant(c: Conversation | undefined): Message | undefined;     // 浮动回复只显示最近一条（U.09.06-R4）
```

### 4.3 会话工作区
```ts
// web/src/state/workspace.ts
export const MAX_WORKSPACES = 5;                     // W.01-R16
export type WorkspaceState = {
  status: 'loading' | 'ready' | 'error';
  error: ApiError | null;
  graphId: Ulid | null;                              // null：会话还没有图（空白画布，U.14.02）
  scope: Scope;
};
export type SessionWorkspace = {
  readonly sessionId: Ulid;
  readonly state: ReadonlyStore<WorkspaceState>;
  readonly run: RunStoreApi;                         // 会话级
  canvas(): CanvasStores | null;                     // 当前图的 graph / view / run / model + selectionKey = sessionId
  setLocation(loc: { graphId: Ulid | null; scope: Scope }): Promise<void>;   // 路由调用（W.02.01 §6.3）
  onDispose(fn: () => void): () => void;             // 画布引擎登记释放 DOM 池的回调（W.01-R16）
};
export type WorkspaceManager = {
  activate(sid: Ulid, loc?: { graphId: Ulid | null; scope: Scope }): Promise<SessionWorkspace>;
  current(): SessionWorkspace | null;
  get(sid: Ulid): SessionWorkspace | undefined;
  release(sid: Ulid): void;
  subscribe(fn: (ws: SessionWorkspace | null) => void): () => void;
};
// W.05 注入（W.03 §4.3 StateDeps.ops）：state/ 不 import ops/（W.01-R5）
export type OpsHandle = { ingestRemote(ev: GraphEvent): void; onStreamOpen(info: { graphVersion?: number; reconnected: boolean }): void; reload(): Promise<void>; flush(): Promise<void>; dispose(): void };   // W.05 §4.2
export type OpsFactory = (ctx: { graphId: Ulid; branch: string; writer: GraphWriter; store: GraphStoreApi; client: RestClient; ui: UiStoreApi; catalog: CatalogStoreApi }) => OpsHandle;
export function createWorkspaceManager(deps: StateDeps, app: { ui: UiStoreApi; session: SessionStoreApi; sessionIngest: SessionIngest; catalog: CatalogStoreApi }): WorkspaceManager;
```

### 4.4 事件路由、Provider、hook、目录 store
- `web/src/state/eventRouter.ts`：`routeGraph(ws, ev)`、`routeRun(ws, ev)`、`routeSession(ws, ev)`，按 `W.03` §6.2 的表分发。
- `web/src/state/WorkspaceProvider.tsx`、`web/src/state/hooks.ts`：`W.03` §4.2 列出的全部组件、hook（`useZoomPercent` 的实现在 `W.03.02`）。
- `web/src/state/catalogStore.ts`、`web/src/state/appStores.ts`：`W.03` §4.5 的目录 store 和 `createAppStores`。
- `web/src/state/hubStore.ts`：`W.03` §4.6 的 `hubStore`（中心窗口与页面的数据，`P.09` K143）；`settingOf`、`ensureLibSig` 写在 `catalogStore.ts`（K142、K145）。

### 4.5 依赖
`W.03.01`–`W.03.04`、`W.03.06` 的工厂；`W.03` §4.3 的 `RestClient`、`StreamClient`、`OpsFactory`；`@/lib/protocol` 的 `Session`、`Message`、`Selection`、`SessionEvent`、`GraphEvent`、`RunEvent`、`Approval`、`ApprovalGroup`（K80）、`NodeDefSummary`、`NodeDef`、`Model`、`Settings`。

## 5. 数据结构
`SessionActivity`、`Conversation`、`ChatStatus`、`WorkspaceState` 为本节点私有；其余见 §4。会话、消息、审批对象原样存生成类型，不改字段。

## 6. 行为

### 6.1 会话列表
- `loadList`：`GET /sessions?q=&cursor=`（置顶在前，`B.04.09`）；`more` 时追加。
- `create`：`POST /sessions` → 插到列表最前（置顶之后）→ 调用方（左侧栏、`Alt+N`）再导航到 `/c/<新 ID>`；新会话默认 1 档由后端挂授权书（`B.06.01` §5、`U.09.04-R8`）。
- `rename`、`setPinned`、`setOrchestratorModel`：先改本地（乐观），`PATCH /sessions/{sid}`；失败回退并 Promise 拒绝。
- `setEffort(sid, model, e)`：本地合并 `orchestrator_effort[model] = e` 后 `PATCH {orchestrator_effort: 整张表}`；失败回退（`C.10-R6`、K74）。
- `remove`：`DELETE /sessions/{sid}` 成功后从列表删除，释放它的工作区、`ui.dropSelection(sid)`；如果删的是当前会话，调用方导航到列表下一项（没有则 `/`）。图不删（`C.10-R1`）。
- `saveLastLocation`：每个会话 1 秒尾随节流，`PATCH {last_location: {graph_id, scope}}`；失败不提示，下一次再发（`W.02.01` §8）。
- `session.updated`、`session.graph_attached`、`session.graph_detached`：更新列表里那一项（`updated_at` 变了就重新排序）。

### 6.2 对话
| 事件 / 动作 | 处理 |
|---|---|
| `openConversation(sid)` | `GET /sessions/{sid}/messages`（第一页，倒序分页）→ 翻成升序存入 |
| `message.created` | 按 `id` 插入或替换（同一条可能先由 `send` 的响应插入） |
| `message.delta` | 追加到对应消息的 `content`；同一会话的 delta 在一个动画帧内合并成一次 `set` |
| `message.block_added` | 追加到 `blocks` |
| `message.completed` | `status='done'`；有 `content_ref` 时用 `GET /blobs/{ref}`（`B.04.03`）取回完整内容替换 `content` |
| `message.failed` | `status='failed'`、`error` |
| `chat.status` | `chat`（对话框上方"思考中…"） |
| `send` | `POST /sessions/{sid}/messages {content, selection?, refs?}` → 202 返回的用户消息插入、助手消息按 `assistant_message_id` 建 `status='streaming'` 的占位（会话流里的 `message.created` 到达时替换） |
| `stop` / `retry` | `POST …/stop`、`…/retry`；结果以事件为准 |
| `loadOlder` | `GET …/messages?before=` 前插；`hasOlder` 按 `next_cursor` 判断 |
| 会话流 `resync` 或重连 | `status='streaming'` 的消息逐条重新拉（`C.06.04-R2`）；`resync` 时整页重拉 |
- `selection` 由调用方（`W.07.07`）用 `W.03.03` 的 `attachable` 组好；没有选中也带 `scope`（`C.10-R4`）。

### 6.3 活动摘要、待审批、急停（K73）
- 定时刷新：页面可见且 `ui.net === 'online'` 时每 5 秒一次，并行请求
  `GET /runs?status=pending,running,paused&limit=200`、`GET /approvals?status=pending`、`GET /estop`。
  按 `session_id` 汇总成 `activity.bySession`；审批分组存 `approvals.groups`，展开成 `byId`；急停存 `estop`。
- 页面隐藏时停止；重新可见、`net` 回到 `online`、`refreshActivity()` 时立即刷新（300ms 防抖）。`start` / `cancel` 运行、处理审批、急停之后，以及当前运行进入终态（`W.03.04` 的 `onTerminal`）都调 `refreshActivity()`。
- 当前会话的运行流里的 `approval.requested`：立即 `GET /approvals/{aid}` 加进 `byId`（不等下一轮）；`approval.resolved`：立即移除。`estop.triggered` / `released`：立即改 `estop`。
- 每次刷新和前一次比较，有差别时调用 `onActivity` 的订阅者（`ActivityDiff`）。`W.07.10` 据此加通知、`W.07.02` 据此改列表上的"● 运行中"。
- 急停生效后（`estop.global` 变为 true）立即刷新一次：后端会把待审批取消，列表随之清空（`U.09.05-R2`）。
- `resolveApproval`：`POST /approvals/{aid}/resolve`；成功后从 `byId` 和分组里移除；409 `approval_closed`：同样移除，Promise 拒绝（面板提示"已被处理"）。`scope:'always'` 只对 L0–L2 有意义，是否显示由 `W.07.09` 决定（`U.14.04` §2）。

### 6.4 工作区：`activate(sid, loc)`
1. 已是当前：只执行 `setLocation(loc)`。
2. 有当前工作区且不是 `sid`：**停用**它（§6.5）。
3. 内存里有 `sid` 的工作区：移到最近使用；跳到第 5 步。
4. 没有：新建，`status='loading'`。并行：`GET /sessions/{sid}`、`openConversation(sid)`、`createRunStore(…)`。图 ID = `loc.graphId` ?? `session.active_graph_id` ?? null；有图时按 §6.7 建当前图的 store。全部完成 `status='ready'`；`GET /sessions/{sid}` 失败为 `error`（`not_found` 由路由处理，`W.02.01` §8）。工作区多于 `MAX_WORKSPACES` 时释放最久没用的那个（不会是这个新的）。
5. **启用**：`session.setCurrent(sid)`；按顺序打开会话流（`since: conversation.lastSeq`，新建时不带 `since`——先连流再拉消息，事件按 ID 合并，不会漏）、当前图的图协同流（`{kind:'graph', id, branch}`，`onOpen` 交给 Op 队列对齐版本，`C.06.03-R1`；`onResync` 交给 Op 队列 `reload()`；`onOpen.reconnected=true` 时按 `W.03` §6.2 对齐提议、档位、校验结果）、`run.control.attach()`。
6. 通知订阅者（`WorkspaceProvider` 换 Context）。工作区已在内存时，第 5 步的连接在后台进行，不等它完成就通知——切换会话 ≤ 300ms（`U.17` §1）。

### 6.5 停用（切走）
- 主画布 `view.actions.flush()`；Op 队列 `flush()`（还没确认的 Op 继续提交，结果回来照常写 graph store）。
- 关闭会话流、图协同流，`run.control.detach()`；记下会话流 `lastSeq`。
- store 里的数据全部保留；之后它的图、对话不再实时更新，直到再次启用时续传（会话流 `since`；图协同流由 Op 队列按 `X-Graph-Version` 补 `GET /graphs/{id}/ops?since_version=`；运行流 `since`）。

### 6.6 释放
停用 → 依次 `dispose` 当前图的 Op 队列、model、view、graph store 和 run store → `session.closeConversation(sid)` → 调用 `onDispose` 登记的回调（画布引擎丢掉保留的 DOM 池）→ 从内存删除。ui store 里这个会话的选中保留（`W.03.03` §5.2）；`last_location` 已在服务端；视图在 localStorage——再打开时恢复现场（`W.01-R16`）。

### 6.7 当前图和层：`setLocation({graphId, scope})`
| 变化 | 处理 |
|---|---|
| 图从 A 变为 B（或从无到有） | 旧图：`view.flush()`、Op 队列 `flush` 后 `dispose`、关图协同流、销毁 graph / model / view。新图：`createGraphStore` → `GET /graphs/{id}?branch=main` → `writer.load` → `catalog.ensureDefs(registryHash)`；`createModelStore`（拉提议和档位）；`createViewStore({persist:true, scope})`；`deps.ops({ … })` 建 Op 队列；`run.control.setGraph(B)`；工作区是当前时打开新图的图协同流。会话的 `active_graph_id` 不是 B 时 `PATCH`（`U.09.04-R4`） |
| 只有层变化 | `view.actions.enterScope(scope)`；`model` 重新取这一层的有效档位；`session.saveLastLocation` |
| 图有变化后（graph `change` 涉及删除）与切回会话时 | `ui.pruneSelection(sid, …)`；当前层的容器节点已不存在时通知路由（`W.02.01` §8"那一层已经不存在了"） |
- 工作区把几个 store 连起来：graph store 的 `serverVersion` 前进时调 `model.ingest.serverVersion(v)` 和 `run.control.refreshView()`（运行中改图待确认，K117）；session store 的 `estop.global` 变化时调 `model.ingest.estop(on)`；run store 的 `onTerminal` 接 `refreshActivity()`、`onRouted` 接事件路由。
- `graphId=null`（会话还没有图）：`canvas()` 返回 null，画布显示空白画布空状态（`U.14.02`）；从模板创建或对话里建图后，`session.graph_attached` / `session.updated` 带来新的 `active_graph_id`，路由据此 `replaceLocation`（`W.02.01`）。

### 6.8 Provider
`WorkspaceProvider` 订阅 `workspaces.subscribe`，当前工作区变化时换 Context 的值（一次 React 提交）；Context 的值是 `ws.canvas()` 的结果（同一个对象引用在工作区不变期间保持不变，`G.06.01-R5`）。`useAppActions()` 返回把各 store `actions` 合在一起的稳定对象。

## 7. 不变量
- 内存里的工作区 ≤ 5 个；只有当前工作区有打开的事件流，合计 ≤ 3 条（会话流、图协同流、运行流各 ≤ 1）。
- 待审批、急停只在本 store 存一份；run store、model store 不另存。
- `releaseEstop` 只被急停横幅确认框（`W.07.10`）调用：ESLint `no-restricted-syntax` 禁止在 `panels/notice/` 以外出现 `releaseEstop` 标识符；重连、撤销、批量操作、快捷键、活动刷新都不调用它（INV-10、`W-R6`）。
- 浏览器发出的请求都不带身份字段（`W-R5`）；不在任何 store 或 localStorage 保存密钥（`W-R10`）。
- 会话的增删只改列表，不依赖会话流（`C.06.04-R1`）。
- 同一条消息在 `messages` 里只出现一次（按 `id`）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 列表、对话首页拉取失败 | 对应 `status='error'`；Promise 拒绝；面板显示"重试" |
| 乐观修改失败（改名、置顶、模型、强度） | 回退到原值；Promise 以 `ApiError` 拒绝 |
| 活动刷新失败 | `activity.status='error'`，保留上一次的值；下一轮重试（`W.03` §8） |
| `send` 失败（如 409 已有回复在生成、423 急停） | 不插入消息；Promise 拒绝，对话框保留文字（`W.07.07`） |
| 审批已被处理（409 `approval_closed`） | §6.3 最后一条 |
| `activate` 时会话不存在 | 工作区 `status='error'`、`error.code='not_found'`，不计入 5 个的上限并立即删除 |
| 释放时 Op 队列还有未确认的 Op | 先 `flush()` 等待最多 3 秒，超时也释放（未提交的修改按 `U.14.05-R1` 留在 `W.05` 的本地队列，下次打开同一张图时重新提交） |

## 9. 性能与资源
- 切换到内存里的会话 ≤ 300ms；切换到已释放的会话：首屏数据（会话、图、首页消息）并行请求，本机 ≤ 1 秒。
- 活动刷新每 5 秒 3 个请求，页面隐藏时为 0。
- `message.delta` 每个会话每帧最多一次 `set`。
- 每个已打开会话最多在内存保留 500 条消息；更早的在向上滚动时再拉。

## 10. 验收标准
1. `U.09.04` §5 四条验收全部通过。
2. 依次打开 6 个会话：第 1 个被释放；再打开第 1 个：回到上次的层和视图，选中恢复（被删的节点除外）。
3. 任何时候开发者工具里的 SSE 连接 ≤ 3；切换会话后旧会话的三条流都已关闭。
4. 会话 A 运行中切到 B：A 的"● 运行中" ≤ 5 秒出现；A 的运行请求审批时 A 显示角标、通知中心出现这一条；在通知中心批准后角标消失（`U.09.05-R2`、`R4`）。
5. 回复流式输出中切走再切回：最终消息内容完整（`C.06.04` §4 验收 2）。
6. 同一会话里把模型 X 的强度设为"高"，换成模型 Y 再换回 X：仍是"高"；刷新页面后仍是"高"（`U.09.06-R7`、K74）。
7. 急停后：顶部条急停横幅出现、待审批清空；全局搜索代码，除急停横幅确认框外没有调用 `releaseEstop` 的地方。

### 实施卡
- 要建 / 要改的文件：`web/src/state/sessionStore.ts`、`web/src/state/sessionStore.test.ts`、`web/src/state/activityPoller.ts`、`web/src/state/activityPoller.test.ts`、`web/src/state/workspace.ts`、`web/src/state/workspace.test.ts`、`web/src/state/eventRouter.ts`、`web/src/state/eventRouter.test.ts`、`web/src/state/WorkspaceProvider.tsx`、`web/src/state/WorkspaceProvider.test.tsx`、`web/src/state/hooks.ts`、`web/src/state/deps.ts`、`web/src/state/catalogStore.ts`、`web/src/state/catalogStore.test.ts`、`web/src/state/hubStore.ts`、`web/src/state/hubStore.test.ts`（`W.03` §4.6，K143；测试至少覆盖：60 秒内不重复加载、`createConnection` 后状态与请求日志里没有 `secrets` 的明文、`setPackageEnabled` 后调 `ensureDefs`、`lastCreatedConnection.seq` 递增、`patchSettings` 成功后 `catalog.setSettings`）、`web/src/state/appStores.ts`、`web/tests/e2e/session-switch.spec.ts`；`web/eslint.config.js` 只加两条：`releaseEstop` 的使用限制（§7）；启用自定义规则 `hx/no-bare-store`（`useXxxStore()` 必须带选择器，`G.06.02` §2；规则本身由 `W.12` 在 `tools/lint/eslint/` 实现，`P.09` K179）。
- 不许碰的文件：`web/src/ops/`（Op 队列由 `W.05` 实现并经 `OpsFactory` 注入）、`web/src/lib/protocol/`、`web/src/routes/`、`web/src/canvas/`、`web/src/panels/`、其他 store 的实现文件（只用它们的工厂和导出类型）、`schema/`。
- 函数签名：见 §4。
- 测试用例（假 `RestClient`、假 `StreamClient`、假 `OpsFactory`、假时钟）：
  - `W0305-T1 列表`：`loadList` 分页追加；`create` 插在置顶之后；`remove` 后释放工作区并 `dropSelection`
  - `W0305-T2 乐观回退`：`rename` 返回 500 → 标题恢复、Promise 拒绝
  - `W0305-T3 强度`：`setEffort(s, X, 'high')` 发出的 `PATCH` 带整张 `orchestrator_effort`；`effortFor` 对没有记录的模型返回默认
  - `W0305-T4 last_location 节流`：1 秒内 5 次层变化只发 1 次，内容是最后一次（同 `W0201-T6`）
  - `W0305-T5 对话合并`：`send` 的 202 响应与随后的 `message.created` 是同一 ID → 只有一条；同一帧 20 个 `message.delta` → 1 次 `set`
  - `W0305-T6 流式中断`：`status='streaming'` 的消息在重连后被重新拉取
  - `W0305-T7 活动刷新`：可见时每 5 秒 3 个请求；隐藏时 0；重新可见立即 1 次；`onActivity` 收到 `runEnded`
  - `W0305-T8 审批即时`：运行流 `approval.requested` → `byId` 立即有这一条；`resolveApproval` 返回 409 → 仍被移除、Promise 拒绝
  - `W0305-T9 五个上限`：依次 `activate` 6 个会话 → 第 1 个被释放：它的 stores 都 `dispose`、`onDispose` 回调被调用、对话被删除；ui 选中仍在
  - `W0305-T10 只有当前连流`：切换会话后旧工作区的 3 个句柄都 `close`；新工作区打开 ≤ 3 个
  - `W0305-T11 续传位置`：停用时记下会话流 `lastSeq=57` → 再启用以 `since=57` 打开
  - `W0305-T12 切换不等网络`：内存里的工作区 `activate` 在流打开之前就通知订阅者（假 `StreamClient` 延迟 2 秒，`activate` 返回 ≤ 50ms）
  - `W0305-T13 换图`：`setLocation` 从图 A 到图 B → A 的 graph / model / view `dispose`、A 的图协同流关闭、发出 `PATCH active_graph_id`、run store 收到 `setGraph(B)`
  - `W0305-T14 路由表`：`W.03` §6.2 每一行一条事件，断言到达了正确的 store 方法；不认识的 `kind` 只记 `console.debug`
  - `W0305-T15 释放急停的限制`：lint 反例文件在 `panels/chat/` 里调用 `releaseEstop` → 报错
  - `W0305-T16 目录 store`：`ensureDefs` 同一哈希只请求一次；哈希变了重新请求
  - `W0305-T17 端到端`：§10 验收 2、3、4（Playwright，`--fake-llm`）
- 允许使用的依赖：`react`、`zustand`（`G.10` §3.3）；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R14、R20、R28）；另：后台工作区不连任何事件流；除急停横幅确认框外不调用 `releaseEstop`；不在 localStorage 存会话、消息、审批；不在 `state/` 里 import `ops/`。
- 完成标志：`G.14` 全部条件；§10 七条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `OpsHandle` 加 `reload()`、`onStreamOpen` 带 `reconnected`；`OpsFactory` 传入 `catalog`（端口兼容预检要用节点类型和数据类型）；§6.4 第 5 步补图协同流 `resync` 与重连后的对齐 | 写 `W.05` 时对齐（`P.09` K88、K90） |
| 2026-11-23 | §4.1 新增 `graphMeta`、`inbox` 状态和 `reloadConversation`、`upload`、`listFiles`、`contextUsage`、`compact`、`clearMessages`、`loadGraphMeta`、`loadInbox`、`getApproval`；`send` 改为带 `selection`、`refs` 的选项对象 | 第 8 棒写 `W.07`；`P.09` K113、K114 |
| 2026-11-23 | 实施卡加 `hubStore.ts` 及其测试要点；目录 store 加 `settingOf`、`ensureLibSig` | 第 9 棒写 `W.09`；`P.09` K142、K143、K145 |
| 2026-11-23 | 实施卡：`useXxxStore()` 带选择器改为启用 `hx/no-bare-store`（规则实现归 `W.12`） | W 全枝复查；`P.09` K179 |
