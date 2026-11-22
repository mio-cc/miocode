# W.03.01 graph store

| 项 | 内容 |
|---|---|
| 编号 | W.03.01 |
| 类型 | 实施 |
| 上级 | W.03 状态层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设18 §3.1、§5（`lastChange` 增量通知的思路）；demo `设计规范_v0.3/src/22_state.js`（`HX.walk`、图数据 Map）；demo v0.5 `32_sessions.js`（`stat()` 结构摘要） |
| 最后修改 | 2026-11-23 |

## 1. 职责
保存一份正在打开的图文档：把嵌套的 `Graph` 规范化成按 ID 查找的 `GraphModel`，记录服务器确认的版本、校验结果、谁在编辑、分支、操作历史；提供纯函数选择器（结构树、面包屑、结构摘要、AI 角标）；给 `W.05` 提供唯一的写入接口，给画布引擎提供增量变化通知。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 应用 Op、计算逆操作、乐观更新与回滚、未确认 Op 的队列、合并 `op.applied` 与本地修改 | `W.05`（它算好新的 `GraphModel` 后调用本文的 `GraphWriter.commit`） |
| 拉图（`GET /graphs/{id}`）的时机 | `W.03.05` 工作区；`resync`、冲突后的重拉由 `W.05` 触发 |
| 类型推断、端口列表、增量校验 | `W.05`（预检）、`W.06.10`（几何）；它们是派生数据，按 `model` 缓存，不存进本 store |
| 撤销栈 | 后端（`E.05.02`） |
| 上报本页正在编辑的节点（`POST /presence`） | `W.05`（随编辑动作上报，每秒最多 2 次，`B.05.04`） |

## 3. 继承的上级约束
`W.03` §4.2、§6.2、§6.3、§7；`W-R3`、`R7`、`R14`；`G.06.02-R3`、`R5`、`R6`；`C.02-R1`–`R4`；`C.02.04` §6（层号、警告阈值）；`C.01-R19`；`C.06.03-R1`、`R3`；INV-08、INV-24；`U.09.04-R2`、`R3`；`U.12-R1`；`U.13.06-R5`。

## 4. 接口

### 4.1 规范化结构
```ts
// web/src/state/graphModel.ts
import type { Graph, Node, Edge, Note, Ulid } from '@/lib/protocol';
import type { Scope } from './types';

export type NodeRec = Omit<Node, 'children'> & { scope: Scope; isContainer: boolean };
export type EdgeRec = Edge & { scope: Scope };
export type NoteRec = Note & { scope: Scope };
export type ScopeRec = {
  parent: Scope | null;                 // root 为 null；容器节点的子图，parent 是容器节点所在的层
  depth: number;                        // 层号：根图 0（C.02.04 §6）
  nodeIds: readonly Ulid[];             // 保持文档里的顺序
  edgeIds: readonly Ulid[];
  noteIds: readonly Ulid[];
};
export type GraphModel = {
  readonly id: Ulid;
  readonly branch: string;
  readonly version: number;             // 这份模型对应的版本（含本地未确认的 Op 时 = 服务器版本 + 未确认条数，只用于显示）
  readonly head: Omit<Graph, 'root'>;   // title、mandates、packages、meta、schemaVersion…原样
  readonly nodes: ReadonlyMap<Ulid, NodeRec>;
  readonly edges: ReadonlyMap<Ulid, EdgeRec>;
  readonly notes: ReadonlyMap<Ulid, NoteRec>;
  readonly scopes: ReadonlyMap<Scope, ScopeRec>;   // 键：'root' 和每个容器节点 ID
};
export function fromDoc(g: Graph): GraphModel;
export function toDoc(m: GraphModel): Graph;      // 与 fromDoc 往返相等（顺序、未知字段都保留）
```
`GraphModel` 只是生成类型的索引（每个节点、连线、便签对象仍是生成类型本身加一个 `scope`），不是另一份协议结构（`G.02.05-R2`）。

### 4.2 store
```ts
// web/src/state/graphStore.ts
import type { ApiError } from './deps';
import type { Actor, Diag, Ulid } from '@/lib/protocol';

export type GraphChange = {
  seq: number;                          // 每次 commit / load 加 1
  source: 'load' | 'local' | 'remote' | 'rollback';
  full: boolean;                        // true：整图替换（load、resync），引擎全部重建
  nodes: ReadonlySet<Ulid>; edges: ReadonlySet<Ulid>; notes: ReadonlySet<Ulid>;
  scopes: ReadonlySet<Scope>;           // 结构变了的层（增删节点、打包为子图、解散子图）
  actor?: Actor;                        // remote 时为这批 Op 的操作者（模型改动的提示、闪光用，U.12 §4）
  groupId?: Ulid;
};
export type Presence = { actor: Actor; editing: readonly Ulid[]; scope: Scope; cursor?: { x: number; y: number }; at: number };
export type SyncState = { pending: number; state: 'idle' | 'saving' | 'conflict' | 'offline' };   // W.05 写
export type GraphState = {
  status: 'loading' | 'ready' | 'error';
  error: ApiError | null;
  graphId: Ulid;
  branch: string;
  model: GraphModel | null;             // 正在显示的图
  serverVersion: number;                // 服务器最后确认的版本
  registryHash: string;
  diags: { version: number; items: readonly Diag[] };
  presence: ReadonlyMap<string, Presence>;     // 键 = `${kind}:${id}:${instanceId ?? ''}`；不含本页自己
  branches: readonly Branch[];
  sync: SyncState;
  change: GraphChange;
  history: { items: readonly OpRecord[]; nextCursor?: string; status: 'idle' | 'loading' | 'ready' | 'error'; stale: boolean };
};
export type GraphActions = {
  loadHistory(opts?: { refresh?: boolean }): Promise<void>;   // GET /graphs/{id}/ops?branch=&cursor=（监控页 › 操作历史）
  loadBranches(): Promise<void>;                              // GET /graphs/{id}/branches
};
export type GraphStoreApi = ReadonlyStore<GraphState> & { actions: GraphActions };

// —— 只给 W.05 和 state/ 内部（工作区、事件路由）——
export type GraphWriter = {
  load(doc: Graph, meta: { registryHash: string; diags: readonly Diag[] }): void;
  commit(next: GraphModel, change: Omit<GraphChange, 'seq'>): void;
  confirm(version: number): void;                 // serverVersion 只能变大
  setSync(s: SyncState): void;
  fail(err: ApiError): void;                      // 加载失败：status=error
};
export type GraphIngest = {                       // 事件路由用（W.03 §6.2）
  setDiags(version: number, items: readonly Diag[]): void;
  setPresence(actor: Actor, data: { editing: readonly Ulid[]; scope?: Scope; cursor?: { x: number; y: number } }): void;
  setBranch(b: { name: string; head: number; behind: number; ahead: number }): void;
  markHistoryStale(): void;
};
export function createGraphStore(o: {
  graphId: Ulid; branch: string; client: RestClient; selfInstance: string;   // selfInstance：本页的 presence 标识，收到自己的 presence 时忽略
  now?: () => number;
}): { store: GraphStoreApi; writer: GraphWriter; ingest: GraphIngest; dispose(): void };
```
只读画布（回放页、子图库预览）只拿 `store`，丢弃 `writer`。

### 4.3 选择器（纯函数）
```ts
// web/src/state/graphSelectors.ts —— 都按 model 对象缓存（WeakMap），同一个 model 返回同一个引用
export function nodesIn(m: GraphModel, scope: Scope): readonly NodeRec[];
export function edgesIn(m: GraphModel, scope: Scope): readonly EdgeRec[];
export function notesIn(m: GraphModel, scope: Scope): readonly NoteRec[];
export function crumbs(m: GraphModel, scope: Scope): readonly { scope: Scope; label: string }[];   // 根图 → … → 当前层（面包屑、父图位置卡）
export type BoundaryLink = { dir: 'in' | 'out'; outer: { nodeId: Ulid; label: string; port: string }; inner: string };   // inner：容器节点上的端口名
export function boundaryLinks(m: GraphModel, scope: Scope): readonly BoundaryLink[];   // 当前层（容器节点 scope）和上一层的连接：连到 / 连出这个容器节点的连线；父图位置卡的"进 {上游}.{端口} → {入口}"、"出 {出口} → {下游}.{端口}"（U.13.06 §3，W.07.06）；根图为空
export type TreeItem = { scope: Scope; nodeId: Ulid | null; label: string; type: string; depth: number; nodeCount: number; children: readonly TreeItem[] };
export function structureTree(m: GraphModel): TreeItem;         // 根图 + 所有容器节点（U.13.06 §3 结构树）
export function stats(m: GraphModel): { layers: number; subgraphs: number; nodes: number };   // U.09.04-R2；nodes 不含子图端口节点
export function scopeExists(m: GraphModel, scope: Scope): boolean;
export function isDeep(m: GraphModel, scope: Scope): boolean;   // 层号 > 4（U.13.06-R5）
export function modelTouched(rec: { origin?: { actor?: Actor } }): boolean;   // AI 角标：origin.actor.kind === 'model'（U.12-R1）
export function diagsOf(s: GraphState, nodeId: Ulid): readonly Diag[];
export function editingByOthers(s: GraphState, nodeId: Ulid): readonly Presence[];   // "AI 等你改完这个节点"、他人编辑提示
```

### 4.4 依赖
`@/lib/protocol` 的 `Graph`、`Node`、`Edge`、`Note`、`Diag`、`Actor`、`Branch`、`OpRecord`（`P.09` K80）；`W.03` §4.3 的 `RestClient`、`ApiError`；`zustand/vanilla` 的 `createStore`、`zustand/middleware` 的 `subscribeWithSelector`。

## 5. 数据结构
见 §4.1、§4.2。`GraphModel` 内部不可变：每次 `commit` 都给一个新对象；没变的节点、连线对象沿用旧引用（结构共享），所以引擎和选择器可以用引用相等判断"没变"。

## 6. 行为

### 6.1 规范化（`fromDoc`）
1. 从 `root` 开始深度优先遍历：每个节点记 `scope`（所在层），带 `children` 的节点记 `isContainer=true` 并为它的子图建一条 `ScopeRec`（`parent` = 节点所在层，`depth` = 所在层 `depth + 1`）。
2. `NodeRec` 去掉 `children`，其余字段原样（`params`、`ui`、`meta` 里的未知字段保留，`C.01-R19`）。带 `ref` 但没有 `children` 的子图引用节点不是容器（子图在子图库里，不在本文档内）。
3. 连线、便签按所在子图记 `scope`。
4. 节点 ID 重复（违反 `C.02-R1`）：后出现的丢弃，`console.error` 一次；这种文档服务器本不该返回。
5. `toDoc` 反过来按 `ScopeRec` 的顺序重建嵌套结构，结果与原文档按 `C.02.01` §6 的规范化 JSON 比较相等。

### 6.2 写入
| 调用 | 效果 |
|---|---|
| `writer.load(doc, meta)` | `model = fromDoc(doc)`；`serverVersion = doc.version`；`registryHash`、`diags` 更新；`status='ready'`；`change = {source:'load', full:true}`；`history.stale = true` |
| `writer.commit(next, change)` | `model = next`；`change.seq` 加 1；只通知订阅了 `model` / `change` 的订阅者 |
| `writer.confirm(v)` | `v > serverVersion` 时更新，否则忽略 |
| `writer.setSync(s)` | 更新 `sync`（顶部条"正在保存…"、冲突提示由 `W.05` / `W.07.01` 决定怎么显示） |
| `ingest.setDiags(v, items)` | 只接受 `v ≥ diags.version` 的结果；`validate` 是 E 级事件，可能乱序到达 |
| `ingest.setPresence(actor, data)` | 按 actor 键覆盖，记 `at = now()`；`actor` 等于本页（`selfInstance`）时忽略；`editing` 为空且没有 `cursor` 时删除这一项 |
| 每 10 秒 | 删除 60 秒没有更新的 presence（`B.05.04` §5） |
| `ingest.setBranch(b)` | 更新 `branches` 里同名的一项（没有就追加） |
| `ingest.markHistoryStale()` | `history.stale = true`；操作历史正在显示时，由面板 1 秒内调 `loadHistory({refresh:true})` |

### 6.3 画布引擎怎么订阅
```ts
graph.subscribe((s) => s.change, (c) => engine.markDirty(c), { equalityFn: Object.is });
```
- `full=true`：引擎丢弃全部节点 DOM 后重建（当前层）。
- 否则：只更新 `nodes`、`edges`、`notes` 里列出的元素；`scopes` 里列出的层如果是当前层或在当前层可见（子图节点的缩略图），重画对应部分。
- `source='remote'` 且 `actor.kind='model'`：引擎给改动的节点闪模型色光环（`U.12` §4）；`W.07.10` 据 `groupId` 合并成一条"AI 修改了 N 处"。

### 6.4 面板怎么订阅（例）
```ts
const label = useGraphStore((s) => s.model?.nodes.get(id)?.label);
const items = useGraphStore((s) => (s.model ? nodesIn(s.model, scope) : EMPTY));   // 返回缓存的同一引用，不需要 shallow
const tree  = useGraphStore((s) => (s.model ? structureTree(s.model) : null));
```

## 7. 不变量
- `model` 只能经 `GraphWriter` 改变；`GraphWriter` 和 `GraphIngest` 不出现在 `state/`、`ops/` 以外的任何 import 里。
- 任何时候 `model.nodes` 里每个节点的 `scope` 都在 `model.scopes` 里；每个 `ScopeRec.nodeIds` 里的 ID 都在 `model.nodes` 里，`scope` 等于这个层。
- `serverVersion` 单调不减；`change.seq` 严格递增。
- `toDoc(fromDoc(g))` 与 `g` 规范化相等。
- 选择器是纯函数：同一个 `model` 多次调用返回同一个引用。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 加载失败（`not_found` 404 等） | `writer.fail(err)` → `status='error'`、`error=err`；路由按 `W.02.01` §8 处理 |
| `loadHistory` / `loadBranches` 失败 | `history.status='error'`（分支列表保持旧值），Promise 拒绝；面板显示"重试" |
| 文档里节点 ID 重复 | §6.1 第 4 步 |
| `commit` 传入的 `next.id` 与本 store 的 `graphId` 不同 | 开发模式抛错；生产模式 `console.error` 并忽略 |

## 9. 性能与资源
- `fromDoc` 500 节点 + 700 连线 ≤ 10ms；`structureTree`、`stats` 500 节点 ≤ 2ms（首次），之后命中缓存。
- `commit` 自身 ≤ 0.5ms（不复制没变的 Map 条目以外的东西；W.05 负责用结构共享构造 `next`）。
- presence 最多保留 20 项。

## 10. 验收标准
1. `schema/examples/graph_loop.json`（闭环迭代，3 层）`fromDoc` → `toDoc` 往返相等；`params`、`ui` 里的未知字段保留。
2. 示例图的 `stats`（层数、子图数、节点数）与测试里按示例文件手工数出的值一致，`crumbs` 和 `structureTree` 与 `U.13.06` §3 一致。
3. `commit` 一次只触发一次 `change` 订阅回调；没变的节点对象引用不变。
4. 乱序到达的旧 `validate` 不覆盖新结果；presence 60 秒后消失；本页自己的 presence 不显示。
5. 在 `panels/` 里 import `GraphWriter` 或 `createGraphStore` 时 ESLint 报错。

### 实施卡
- 要建 / 要改的文件：`web/src/state/types.ts`（只放 `W.03` §4.2 的公共类型）、`web/src/state/graphModel.ts`、`web/src/state/graphModel.test.ts`、`web/src/state/graphStore.ts`、`web/src/state/graphStore.test.ts`、`web/src/state/graphSelectors.ts`、`web/src/state/graphSelectors.test.ts`；`web/eslint.config.js` 只加一条 `no-restricted-imports`：`state/` 和 `ops/` 以外禁止 import `@/state/graphStore` 的 `GraphWriter`、`GraphIngest`、`createGraphStore`（测试文件和 `pages/history/` 的只读用法除外：后者只能用 `store`）。
- 不许碰的文件：`web/src/lib/protocol/`（含 `generated/`）、`web/src/ops/`、`web/src/canvas/`、`schema/`（测试只读 `schema/examples/graph_loop.json`）。
- 函数签名：见 §4.1–§4.3。
- 测试用例：
  - `W0301-T1 往返`：`graph_loop.json`、`graph_minimal.json` 经 `fromDoc` → `toDoc` 与原文规范化 JSON 相等；节点 `params` 里加一个未知键 `x_extra` 也保留
  - `W0301-T2 索引一致`：每个节点的 `scope` 存在；`scopes` 的 `depth` 依次为 0、1、2；带 `ref` 无 `children` 的节点 `isContainer=false`
  - `W0301-T3 重复 ID`：文档里两个节点同 ID → 只保留第一个，`console.error` 一次
  - `W0301-T4 选择器`：`crumbs(m, 资料采集的 ID)` = 根图 / 闭环迭代 / 资料采集；`structureTree` 层次正确；`stats` 不计子图端口节点；`isDeep` 在第 5 层为 true
  - `W0301-T5 缓存`：同一 `model` 调两次 `nodesIn` 返回同一数组；`commit` 一个新 `model` 后返回新数组
  - `W0301-T6 commit 通知`：订阅 `change` 的回调每次 `commit` 只调一次，`seq` 递增；只订阅 `diags` 的回调不被调用
  - `W0301-T7 confirm 单调`：`confirm(5)` 后 `confirm(3)` 不改 `serverVersion`
  - `W0301-T8 validate 乱序`：先 `setDiags(7)` 再 `setDiags(6)` → 保留 7 的结果
  - `W0301-T9 presence`：用假时钟，60 秒后删除；`selfInstance` 的 presence 被忽略；`editing=[]` 且无 `cursor` 时删除
  - `W0301-T10 AI 角标`：`origin.actor.kind='model'` 为 true；用户再改后（`origin.actor.kind='user'`）为 false（`U.12-R1`）
  - `W0301-T11 操作历史`：`markHistoryStale` 后 `loadHistory({refresh:true})` 从第一页重新拉；失败时 `status='error'`
  - `W0301-T12 性能`：500 节点 `fromDoc` ≤ 10ms（vitest bench，`W.11` 收集）
  - `W0301-T13 ESLint`：`web/tests/lint/` 下的反例文件在 `panels/` 里 import `GraphWriter`，lint 报错
- 允许使用的依赖：`zustand`（`G.10` §3.3）；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部（特别是 R1、R2、R6）；另：不提供任何绕过 `GraphWriter` 修改 `model` 的方法（包括 `setState` 暴露给外部）；不在本 store 里存类型推断、校验预检这类派生结果；不在 localStorage 存图数据。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §4.3 新增 `boundaryLinks`（父图位置卡的连接行） | `P.09` K109（第 7 棒写 `W.06.13` 时发现：连接行由 React 画，需要纯函数） |
