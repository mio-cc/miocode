# W.03 状态层

| 项 | 内容 |
|---|---|
| 编号 | W.03 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | W.03.01 graph store、W.03.02 view store、W.03.03 ui store、W.03.04 run store、W.03.05 session store、W.03.06 model store |
| 状态 | 草稿 |
| 素材 | 设18 §1.3、§3、§5（按 Next.js 写的旧版，只作参考，`P.09` K9）；demo `设计规范_v0.3/src/22_state.js`；demo v0.5（v0.5.11）`32_sessions.js`、`28_run.js`、`29_model.js`、`39_monitor.js` |
| 最后修改 | 2026-11-23 |

## 1. 职责
`web/src/state/`：前端所有"服务器数据"和"界面状态"的唯一存放处——六个 zustand store、会话工作区（`SessionWorkspace`）、三条事件流到各 store 的路由，以及组件和画布引擎读这些数据的方式。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 修改图的流水线：预检、乐观应用、提交、回滚、逆操作、拖动合并 | `W.05`（本层只提供图数据和只给 `W.05` 用的写入接口） |
| 发请求、连 SSE、断线续传、snake_case ↔ camelCase | `W.04`（本层只调用 §4.3 的最小接口） |
| 画布渲染、按帧合并运行事件 | `W.06`、`W.06.15`（本层只提供订阅） |
| 每个面板怎么显示 | `W.07`、`W.09` |
| 授权判定、Op 的最终校验 | 后端（`W-R4`） |
| 撤销栈 | 后端（按"图 + 分支 + 操作者"存，`E.05.02`、`U.09.04` §2）；前端不保存撤销栈 |
| 组件内部临时状态（正在输入的文字、悬停） | 组件自己的 `useState`（`G.06.02-R1`） |
| 对话框里没发出去的文字（`hx:draft:<会话 ID>`） | `W.07.07` |

## 3. 继承的上级约束
`W-R2`、`R3`、`R5`、`R6`、`R7`、`R10`、`R11`、`R13`、`R14`；`W.01-R5`、`R6`、`R12`–`R17`；`G.06.02-R1`–`R8`（含 K76 对 R2 的说明）；`G.04.02`；`G.06-R1`；INV-08、INV-10、INV-11、INV-22、INV-24；`C.06` §5（P / S / E 级）；`C.01-R18`（未知枚举值不崩溃）、`R19`（开放对象原样保留）；`U.09.04`；`U.17`；`P.09` K40、K73、K75、K76。

## 4. 接口

### 4.1 六个 store 一览
| store | 文档 | 创建几份 | 放什么 | 谁写 | 谁读 |
|---|---|---|---|---|---|
| graph | `W.03.01` | 每份正在打开的图文档一份（工作区的当前图；回放页、子图库预览各自另建只读的） | 图（规范化后的 `GraphModel`）、服务器确认的版本、校验结果、谁在编辑、分支、操作历史 | 图数据只由 `W.05` 写；其余由事件路由写 | 面板（选择器）、画布引擎（`subscribe`） |
| view | `W.03.02` | **每个画布实例一份**（主画布、预览浮层、回放画布） | 当前层和平移缩放 | 画布引擎（`W.06.02`） | 只有画布引擎；React 只能读缩放停下后才更新的缩放百分比 |
| ui | `W.03.03` | 整个应用一份 | 侧栏与专注模式（收编 `W.02.02` 的 `ShellLayout`）、各会话的选中、工具、列表视图、监控筛选、中心窗口、连接状态、提示 | 外壳、面板、画布引擎、`W.04.05` | 外壳、面板、画布引擎 |
| run | `W.03.04` | 每个工作区一份（回放页另建快照模式的） | 本会话的运行列表、当前运行的状态和费用、节点执行的实时投影 | 自己的 action（REST）、事件路由 | 面板（低频刷新计数）、`RunBridge`（`subscribeLive`） |
| session | `W.03.05` | 整个应用一份 | 会话列表、各会话的活动摘要（运行中、待审批）、**全局**待审批、急停状态、已打开会话的对话 | 自己的 action、事件路由、活动刷新 | 左侧栏、顶部条、对话、通知中心、审批卡片 |
| model | `W.03.06` | 每个工作区的当前图一份 | 提议、幽灵预览、逐条查看位置、模型活动（AI 光标）、有效档位 | 自己的 action、事件路由 | 提议栏、幽灵节点渲染（`W.06.14`）、档位胶囊 |

另有应用级的**目录 store**（节点类型注册表、可用模型、设置），见 §4.5（`P.09` K81）。

### 4.2 公共类型、Provider 与 hook
```ts
// web/src/state/types.ts
import type { StoreApi } from 'zustand/vanilla';
import type { Ulid } from '@/lib/protocol';
export type Scope = 'root' | Ulid;                                   // 当前层：根图或容器节点 ID（K68）
export type ReadonlyStore<T> = Pick<StoreApi<T>, 'getState' | 'subscribe'>;
export type SelectionKey = Ulid | `replay:${Ulid}`;                  // 选中按画布归属分开：会话 ID；回放页用 replay:<运行 ID>

// 一个画布实例需要的全部 store。主画布由会话工作区提供，回放页、子图库预览自己组装
export type CanvasStores = {
  graph: GraphStoreApi;            // W.03.01（只读视图：没有写入接口）
  view: ViewStoreApi;              // W.03.02，本画布实例独有
  run: RunStoreApi | null;         // W.03.04；没有运行信息的画布为 null
  model: ModelStoreApi | null;     // W.03.06；只读画布为 null（不显示幽灵节点）
  selectionKey: SelectionKey | null;   // null = 不能选中（预览浮层，U.13.06-R1）
  readonly: boolean;
};
// 应用级 store：启动时创建一次（W.02 §6 第 2 步）
export type AppStores = {
  ui: UiStoreApi;                  // W.03.03
  session: SessionStoreApi;        // W.03.05
  catalog: CatalogStoreApi;        // §4.5
  workspaces: WorkspaceManager;    // W.03.05
};
export function createAppStores(deps: StateDeps, opts: { width: number; storage?: Storage }): AppStores;
```
```tsx
// web/src/state/WorkspaceProvider.tsx
export function AppStoresProvider(p: { stores: AppStores; children: ReactNode }): JSX.Element;
export function WorkspaceProvider(p: { children: ReactNode }): JSX.Element;        // 提供当前工作区的 CanvasStores
export function CanvasStoresProvider(p: { stores: CanvasStores; children: ReactNode }): JSX.Element;  // 回放页等自己组装时用

// web/src/state/hooks.ts —— 组件只能通过这些 hook 订阅（G.06.02-R3：必须带选择器）
export function useUiStore<T>(sel: (s: UiState) => T, eq?: (a: T, b: T) => boolean): T;
export function useSessionStore<T>(sel: (s: SessionState) => T, eq?: (a: T, b: T) => boolean): T;
export function useCatalogStore<T>(sel: (s: CatalogState) => T, eq?: (a: T, b: T) => boolean): T;
export function useGraphStore<T>(sel: (s: GraphState) => T, eq?: (a: T, b: T) => boolean): T;
export function useRunStore<T>(sel: (s: RunState) => T, eq?: (a: T, b: T) => boolean): T;
export function useModelStore<T>(sel: (s: ModelState) => T, eq?: (a: T, b: T) => boolean): T;
export function useZoomPercent(): number;                 // view store 唯一给 React 的出口（W.03.02）
export function useAppActions(): AppActions;              // 各 store 的 action 集合（引用稳定，不触发重渲染）
export function useCanvasStores(): CanvasStores;          // 给 Canvas.tsx 把 store 实例交给画布引擎
export function useAppStores(): AppStores;                // 只给 Canvas.tsx 这类要把 store 实例交给非 React 代码的地方（ui、catalog 交给画布引擎，W.06.01）；返回的对象引用稳定，不触发重渲染
```
- 返回对象或数组的选择器必须传 `eq`（用 `zustand/shallow` 的 `shallow`），或者在选择器里返回 store 里已有的引用（`G.06.02-R3`）。
- 没有 `useViewStore`：平移缩放不进 React（`G.06.02-R1`、`R4`）。
- 画布引擎拿到的是 `ReadonlyStore<…>` 和各 store 的 action 对象，不 import hook（`W.01-R6`）。

### 4.3 依赖（`W.04` 必须提供的最小形状）
本层只依赖下面的接口。`W.04.01`、`W.04.02` 定稿时按这个形状提供；要改形状，同时改本节。
```ts
// web/src/state/deps.ts
import type { ApiErrorCode, Ulid, RunEvent, GraphEvent, SessionEvent } from '@/lib/protocol';
export type Query = Record<string, string | number | boolean | readonly string[] | undefined>;   // 键写 camelCase，W.04.03 转成 snake_case；数组用逗号连接
export type RestClient = {                 // W.04.01；响应已按 W.04.03 转成 camelCase
  get<T>(path: string, query?: Query): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: { idempotencyKey?: string }): Promise<T>;   // 每个 POST 都带幂等键，不传就自动生成
  patch<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
  getText(path: string, query?: Query): Promise<string>;   // 原文（GET /blobs/{ref}），不做字段映射
  download(path: string, query?: Query): Promise<Blob>;    // 导出文件
};
export type ApiError = Error & { status: number; code: ApiErrorCode; details?: unknown; requestId?: string; retryAfterMs?: number };   // W.04.01：服务端返回了错误响应
export type NetError = Error & { kind: 'network' | 'timeout' | 'aborted' };   // W.04.01：没有拿到响应（连接状态由 W.04.05 处理）
export type StreamSpec =
  | { kind: 'session'; id: Ulid; since?: number }
  | { kind: 'graph'; id: Ulid; branch: string }
  | { kind: 'run'; id: Ulid; since?: number };
export type StreamState = 'connecting' | 'open' | 'ended';   // ended：不会再重连（运行已结束、资源不存在、凭证失效、被同种新流顶替）
export type StreamHandle = { close(): void; lastSeq(): number };
export type StreamClient = {               // W.04.02；同种流同时只有 1 条，再开一条时自动关掉旧的
  open<E extends RunEvent | GraphEvent | SessionEvent>(spec: StreamSpec, h: {
    onEvent(ev: E): void;
    onResync(): void;                      // 收到 resync（B.05.02 第 3 步）：W.04.02 已改为只收实时并重新连上，调用方拉快照
    onOpen?(info: { graphVersion?: number; reconnected: boolean }): void;   // 每次连上都调用；图协同流带响应头 X-Graph-Version（C.06.03-R1）
    onState?(s: StreamState): void;
    onError?(err: ApiError): void;         // 不会重连的错误（404、403）
  }): StreamHandle;
};
export type StateDeps = {
  client: RestClient;
  streams: StreamClient;
  ops: OpsFactory;                         // W.05 注入，见 W.03.05 §4.3（state 不 import ops，W.01-R5）
  now?: () => number;                      // 测试用
};
```

### 4.4 会话工作区
`SessionWorkspace` = 一个会话在前端的整套现场：会话级的 run store，当前图的 graph / model / view store，对话（session store 里按会话存一份），以及 `W.05` 为当前图建的 Op 队列。最多保留 5 个；只有当前工作区连事件流。接口、创建 / 复用 / 释放、事件流开关时机全部在 `W.03.05` §4.3、§6.4–§6.6 定义。

### 4.5 目录 store（应用级，`P.09` K81）
节点类型注册表、可用模型、设置是全局只读数据，六个叶子都不管。实现文件和测试写在 `W.03.05` 的实施卡里。
```ts
// web/src/state/catalogStore.ts
export type CatalogState = {
  defs: null | { registryHash: string; summaries: readonly NodeDefSummary[]; full: ReadonlyMap<string, NodeDef>; types: ReadonlyMap<string, TypeDef> };   // types：GET /types，W.05 端口兼容预检用（K90）
  models: readonly Model[];                // GET /models（B.04.07），对话框的模型按钮、属性页用
  settings: Settings | null;               // 启动时 GET /settings（W.02 §6 第 3 步）
  status: { defs: LoadStatus; models: LoadStatus };
};
export type CatalogActions = {
  ensureDefs(registryHash: string): Promise<void>;     // 哈希不同才重新拉 GET /nodedefs 和 GET /types（B.04.06 带 ETag）
  nodeDef(ref: string): Promise<NodeDef>;              // 按需拉完整定义并缓存
  loadModels(): Promise<void>;
  setSettings(s: Settings): void;                      // bootstrap 和 PATCH /settings 成功后调用
};
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
```
- 图加载后，工作区用图的 `registry_hash` 调 `ensureDefs`；扩展包启用、停用后（`W.09.04`）再调一次。
- `settings` 里的主题字段只由 `W.02.03` 读；本 store 不自己发 `PATCH /settings`。

## 5. 数据结构
- 协议类型一律从 `@/lib/protocol` 导入：它导出生成类型（`lib/protocol/generated`）按 `W.04.03` 转成 camelCase 后的别名，如 `Graph`、`Node`、`Edge`、`Note`、`Op`、`Diag`、`Proposal`、`ProposalPreview`、`Session`、`Message`、`MessageBlock`、`Selection`、`RunEvent`、`GraphEvent`、`SessionEvent`、`RunStatus`、`NodeState`、`Loc`、`Actor`、`Ulid`。本层不重新声明这些结构（`G.02.05-R2`）。
- REST 响应结构 `RunMeta`、`RunView`、`NodeStateRow`、`NodeDetail`、`Approval`、`ApprovalGroup`、`Effective`、`Branch`、`OpRecord`、`GraphMeta`、`NodeDefSummary`、`NodeDef`、`TypeDef`、`Model`、`Settings` 同样按名字从 `@/lib/protocol` 导入；定义在 `schema/api.schema.json`，正文在 `B.04` 各文档（`P.09` K80）。
- 事件里的开放对象（`params`、`meta`、`ui`、`kv`）的键不转 camelCase，原样保留（`C.01-R19`，由 `W.04.03` 保证）。
- 本层私有的结构只有：`GraphModel`（`W.03.01`）、`View`（`W.03.02`）、`CanvasSelection`（`W.03.03`）、`ExecState` 与 `LiveRun`（`W.03.04`）、`Conversation` 与 `SessionActivity`（`W.03.05`）、`GhostMarks`（`W.03.06`），以及上面 §4.2 的组合类型。

## 6. 行为

### 6.1 三种生命周期
| 范围 | store | 什么时候建 | 什么时候销毁 |
|---|---|---|---|
| 应用 | ui、session、catalog、工作区管理器 | `main.tsx` 渲染前（`W.02` §6 第 2 步） | 页面关闭 |
| 会话工作区 | run；当前图的 graph、model、主画布的 view | 第一次进入这个会话（`W.03.05` §6.4） | 超过 5 个时释放最久没用的（`W.01-R16`）；切换到会话的另一张图时，旧图的 graph / model / view 销毁 |
| 画布实例 | view（以及 `CanvasStores` 组合） | 画布挂载（预览浮层打开、回放页打开） | 画布卸载 |

### 6.2 事件路由
三条流的事件由 `state/eventRouter.ts` 分发（只路由当前工作区的事件）。表里没列的事件忽略；不认识的 `kind` 记一次 `console.debug` 后忽略（`C.01-R18`）。

| 流 | 事件 | 去向 |
|---|---|---|
| 图协同流 | `op.applied`、`op.coalesced` | `W.05` 的 `ingestRemote`（它在合并本地未确认的 Op 后写 graph store）；graph 的操作历史标记过期 |
| 图协同流 | 连上（`onOpen`） | `W.05` 的 `onStreamOpen`（按 `graphVersion` 补齐缺口）；`reconnected=true` 时另外：model `refresh()`、`refreshLevel()` 并 `ingest.reconnected()`（清掉停住的 AI 光标）；工作区 `GET /graphs/{id}/validate` → graph `setDiags`（E 级事件不补发，`C.06` §5、`C.06.03-R2`） |
| 图协同流 | `resync`（`onResync`） | `W.05` 的 `reload()` |
| 图协同流 | `validate` | graph `setDiags` |
| 图协同流 | `presence` | graph `setPresence` |
| 图协同流 | `branch.updated` | graph `setBranch` |
| 图协同流 | `proposal.created`、`proposal.updated`、`proposal.decided` | model |
| 图协同流 | `mandate.changed` | model 重新取有效档位 |
| 图协同流 | `model.activity` | model `activity`（AI 光标、"AI 正在编辑…"，K79） |
| 运行流（当前运行） | `run.created`、`run.status`、`run.cancel_requested`、`run.graph_swapped` | run；`run.status` 到终态时 session 立即刷新活动摘要 |
| 运行流 | `node.state`、`node.progress`、`node.throttled`、`pool.usage`、`edge.flow`、`loop.round` | run 的实时投影（不进 zustand 状态，`G.06.02-R4`） |
| 运行流 | `node.log`、`llm.call`、`budget.*`、`escalation.*`、`brief.updated`、`orch.expanded` | run |
| 运行流 | `node.input`、`node.output`、`tool.*`、`ctx.assembled`、`prompt.rendered`、`llm.fallback`、`checkpoint.saved` | 不存；节点详情打开时按需 `GET /runs/{id}/nodes/{exec_key}`（`C.06.02` §9） |
| 运行流 | `approval.requested`、`approval.resolved` | session 的全局待审批 |
| 运行流 | `estop.triggered`、`estop.released` | session 的急停状态 |
| 运行流 | `orch.tool_call` | model `activity`（运行中的编排者的光标） |
| 运行流 | `resync`、`engine.illegal_transition` | run 重新拉快照；后者只记 `console.warn` |
| 会话流 | `session.updated`、`session.graph_attached`、`session.graph_detached` | session 的会话列表项 |
| 会话流 | `message.*`、`chat.status` | session 的对话 |
| 会话流 | 连上（`onOpen.reconnected=true`）、`resync` | session 重新拉 `status='streaming'` 的消息；`resync` 时整页重拉（`W.03.05` §6.2） |

### 6.3 谁能写什么
| 数据 | 唯一写入方 | 怎么保证 |
|---|---|---|
| 图（`GraphModel`） | `W.05`（经 `GraphWriter`） | `createGraphStore` 返回的 `writer` 只交给 `StateDeps.ops`；ESLint `no-restricted-imports` 禁止 `state/`、`ops/` 以外 import `graphWriter`（INV-08、`W-R3`） |
| 视图 | 画布引擎 | view store 不提供 React hook |
| 急停解除 | 只有 W.07.10 急停横幅的确认框 | `releaseEstop` 只在那里调用（`W.03.05` §7，INV-10、`W-R6`） |
| 其他服务器数据 | 各 store 自己的 action（先 REST 成功再改状态，或乐观改后失败回退，各叶子写明） | 组件只调 action（`W.01-R13`） |
| 实时投影 | 事件路由 → run store | 没有对外的写方法 |

### 6.4 本地存储键（全部 `hx:` 前缀，`G.06.02-R7`）
| 键 | 内容 | 定义 |
|---|---|---|
| `hx:ls-open`、`hx:rs-open`、`hx:rs-tab`、`hx:ls-fold` | 侧栏开合、分区折叠、右栏标签页 | `W.02.02`、`W.03.03` |
| `hx:list-view`、`hx:mon` | 列表视图开关、监控页的范围与状态筛选 | `W.03.03` |
| `hx:view:<图 ID>:<层>` | 每层的平移缩放 | `W.03.02`（K75） |
| `hx:theme-palette`、`hx:theme-mode`、`hx:motion` | 主题 | `W.02.03` |
| `hx:last-session` | 最近打开的会话 | `W.02.01` |
| `hx:draft:<会话 ID>` | 没发出去的文字 | `W.07.07` |
不在 localStorage 存图、消息、运行、提议、审批（`G.06.02-R7`）；不存任何密钥（INV-22、`W-R10`）。

### 6.5 高频数据怎么走
- 平移缩放：画布引擎 → view store（内存）→ 引擎自己读；React 只拿缩放停下 150ms 后才更新的缩放百分比（缩放过程中提交为 0）。
- 运行状态：运行流 → run store 实时投影 → `subscribeLive` → `RunBridge` 按帧合并写 DOM；React 只订阅最多每 400ms 加一的 `tick`（结构树状态点、预览浮层、监控页）。
- 流式回复：`message.delta` 按动画帧合并后写进对话（一帧最多一次 `set`）。
- 拖动：拖动中的位置只在画布引擎里；`W.05` 每 250ms 提交一次时才写 graph store（`C.05.04` §4）。

## 7. 不变量
- 同一份服务器数据只在一个 store 里（`W.01-R14`）：图只在 graph，运行只在 run，会话、消息、待审批、急停只在 session，提议只在 model。
- 任何 store 都不是模块级单例：都由 `create…Store` 工厂创建、经 Context 提供（`G.06.02-R2`）；测试可以并排创建多份互不影响。
- graph store 的图数据只有 `W.05` 能写；平移缩放不会产生 Op、不会改版本号（`C.02.05` §2）。
- 只有当前工作区连事件流，同时最多 3 条（`W.01-R17`、K73）。
- 每个从服务器来的对象在 store 里都保留原有的 `actor` / `origin`，界面据此区分人和模型（`W-R14`）。
- 本层没有任何代码路径调用 `DELETE /estop`，`releaseEstop` 除外（INV-10）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| action 的 REST 请求失败 | action 返回的 Promise 以 `ApiError` 拒绝；store 只在需要显示的地方记 `error` 字段（各叶子写明），不自己弹提示——提示由调用它的面板决定（`U.14.03`） |
| 后台动作失败（活动刷新、预览拉取、`last_location` 保存） | 不提示；下一轮重试；连续 3 次失败记一次 `console.warn` |
| 401 `unauthorized` | 不在本层处理，由 `W.04.01` 转到整页说明（`W.02` §6.1） |
| 事件流 `resync` | 对应 store 重新拉快照（graph：`W.05` 处理；run：`W.03.04`；会话：`W.03.05`） |
| localStorage 不可用、配额满、值非法 | 当作没有记录，用默认值；不抛错 |

## 9. 性能与资源
- 切换到已在内存里的会话 ≤ 300ms（`U.17` §1）：只换 Context 里的 store，不等网络；事件流在后台重连。
- 平移、缩放、拖动、运行状态更新期间 React 提交次数为 0（`U.17-R10`）。
- 内存：5 个工作区 × 200 节点的图合计 ≤ 300MB 中的 60MB（`U.17` §1 的标签页预算）；运行日志每次运行最多留 2000 行。
- 一次 `set` 只通知订阅了变化字段的组件：store 字段按"会一起变的放一起"拆分，避免大对象整体替换。

## 10. 验收标准
1. 六个叶子的验收全部通过。
2. 在两个结构不同的会话之间来回切换 20 次：结构树、面包屑、画布、档位、对话、提议、运行信息每次都对应正确；回来时层、视图、选中恢复（`U.09.04` §5 验收 1、2）。
3. 打开 6 个会话：内存里只剩最近 5 个工作区；浏览器开发者工具里同时打开的 SSE 连接始终 ≤ 3。
4. 会话 A 运行中切到 B：A 的运行不中断，5 秒内会话列表上 A 显示"● 运行中"；A 的运行请求审批时，A 显示审批角标、通知中心出现这条（`U.09.04-R1`、`U.09.05`）。
5. 200 节点的图在平移、拖动、30 个节点同时运行时，React Profiler 提交次数为 0（`Q.08`）。
6. ESLint：在 `panels/` 里 import `graphWriter` 报错；不带选择器调用 `useGraphStore()` 报错（`G.06.02` §2）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §4.3 按 `W.04` 定稿补齐：`Query`、`getText`、`download`、`NetError`、`retryAfterMs`、`StreamState`、`onOpen.reconnected`、`onState`、`onError`；§6.2 补图协同流连上 / `resync`、会话流重连三行；§4.5 目录 store 加数据类型 `types` | 写 `W.04`、`W.05` 时对齐（`P.09` K83、K90） |
| 2026-11-23 | §4.2 新增 `useAppStores()`（画布引擎需要 ui、catalog 的 store 实例） | `P.09` K98（写 `W.06.01` 时发现缺口） |
