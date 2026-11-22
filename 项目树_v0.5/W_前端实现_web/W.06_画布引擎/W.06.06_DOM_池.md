# W.06.06 DOM 池

| 项 | 内容 |
|---|---|
| 编号 | W.06.06 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设17 R5、§8 第 6 步（反复创建删除 200 节点堆不增长）、§9.1；demo `设计规范_v0.3/src/24_render.js`（`els` / `eels` 两张 Map、`resetDOM`）；`W.01-R16` |
| 最后修改 | 2026-11-23 |

## 1. 职责
管理画布上节点、便签、连线的 DOM 元素：按 ID 复用；换层时把上一层的元素摘下保留、把新一层已有的挂回；切换会话（换文档）时按文档保留；删除的元素清空后放进空闲表给新元素用；控制保留的总量，工作区释放时丢掉对应文档的元素。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 元素内部的结构和内容 | `W.06.03`、`W.06.04`（本文只给"外壳"元素） |
| 什么时候换层、换文档 | `W.06.01`（调本文的 `switchScope`、`switchDoc`） |
| 视口裁剪（元素留在 DOM 里只是不渲染） | `W.06.05` |
| 幽灵节点、幽灵连线的元素 | `W.06.14`（数量少、生命周期跟提议走，不进本池） |

## 3. 继承的上级约束
`W.06` §4.4（`Pool`）、§6.4、`W.06-R2`；`W.01-R16`（最多 5 个工作区、释放时清空 DOM 池引用）；`W.03.05` §4.3（`onDispose`）；`U.17-R5`；`U.17` §1（进入 / 返回子图 ≤ 100ms、切换会话 ≤ 300ms）。

## 4. 接口
```ts
// web/src/canvas/core/render/pool.ts
export const MAX_DOCS = 5;               // 与 W.03.05 的 MAX_WORKSPACES 一致
export const MAX_SCOPES_PER_DOC = 5;     // 每份文档保留的层数（当前层 + 最近 4 层）
export const MAX_DETACHED = 2000;        // 所有文档摘下保留的元素总数上限
export const MAX_FREE = 64;              // 每类空闲元素上限
export type PoolKind = 'node' | 'note' | 'edge';
export function createPool(ctx: EngineCtx): Pool & {
  stats(): { attached: number; detached: number; free: Record<PoolKind, number>; docs: number; scopes: number };
  dispose(): void;
};
```
- `Pool` 的方法（`W.06` §4.4）：`node(id)`、`note(id)`、`edge(id)` 返回当前层里这个 ID 的元素，没有就取一个（空闲表里的或新建的）挂到对应图层；`has(kind, id)`；`release(kind, id)` 元素被删除时调用；`switchScope(from, to)`；`switchDoc(graphId | null)`；`dropDoc(graphId)`。

### 4.1 依赖
`W.06` §4.3 的 `scene.nodes`、`scene.notes`、`scene.edgeBase`；`ctx.doc()`、`ctx.scope()`。

## 5. 数据结构
```ts
type ElMeta = { id: Ulid; kind: PoolKind };                     // 挂在元素的私有属性 el.__hx 上；渲染层的缓存另放 el.__hxv，本池在回收时清空两者
type ScopeEls = { nodes: Map<Ulid, HTMLDivElement>; notes: Map<Ulid, HTMLDivElement>; edges: Map<Ulid, SVGGElement>; usedAt: number };
type DocCache = { graphId: Ulid; scopes: Map<Scope, ScopeEls>; usedAt: number };
// 模块内部
docs: Map<Ulid, DocCache>;  current: { doc: DocCache; scope: Scope } | null;
free: { node: HTMLDivElement[]; note: HTMLDivElement[]; edge: SVGGElement[] };
```
- 新建的外壳：节点 `div.hx-node[data-node-id]`、便签 `div.hx-note[data-note-id]`、连线 `g.hx-edge[data-edge-id]`（SVG 命名空间）。外壳上不挂任何事件监听（事件由根元素委托处理，`W.06.07`），这样丢弃时不会泄漏。

## 6. 行为

### 6.1 取元素
`node(id)`（便签、连线同理）：
1. 当前层的 `nodes` 里有 → 返回。
2. 否则从 `free.node` 弹出一个；没有就新建。设 `data-node-id = id`、`__hx = {id, kind}`，`appendChild` 到 `scene.nodes`，记进当前层的 `nodes`。
3. 新取得的元素没有 `__hxv`，渲染层据此知道要 `build`。

### 6.2 回收
`release(kind, id)`：从当前层的 Map 删除 → 从 DOM 摘下 → 清空子元素（`replaceChildren()`）、类名恢复为外壳类、去掉 `style` 和 `data-*`、`aria-*`、清空 `__hx`、`__hxv` → 空闲表未满就放进去，满了就丢弃。

### 6.3 换层（`switchScope(from, to)`）
1. 把 `from` 层三张 Map 里的元素从图层容器里摘下（不清空内容），`usedAt = now`。
2. `to` 层在缓存里有 → 用 `DocumentFragment` 按 Map 的插入顺序一次挂回三个图层；没有 → 新建空的 `ScopeEls`。
3. 本文档保留的层超过 `MAX_SCOPES_PER_DOC` → 丢弃 `usedAt` 最旧的那一层（不是当前层）：它的元素全部丢弃（不进空闲表，数量可能很大）。
4. 之后 `W.06.01` 对新层做一次全量同步：缓存里已被删除的节点由渲染层 `release`，内容过时的由 `patch` 更正（离开期间别的层的变化不会通知到摘下的元素，所以全量同步是必须的）。

### 6.4 换文档（`switchDoc(graphId)`）
1. 当前文档的当前层元素摘下保留（同 §6.3 第 1 步）。
2. `graphId = null`：`current = null`（空白画布）。
3. 否则：缓存里有这份文档 → 接回它上次的当前层（`W.06.01` 随后按新文档的 `scope` 调 `switchScope`）；没有 → 新建 `DocCache`。
4. 文档数超过 `MAX_DOCS` → 丢弃 `usedAt` 最旧的文档（不是当前的）。

### 6.5 丢弃（`dropDoc(graphId)`、总量控制）
- `dropDoc`：工作区释放时（`W.03.05` `onDispose`）丢掉这份文档的全部元素引用；是当前文档时先 `switchDoc(null)`。
- 每次摘下元素后检查 `detached` 总数：超过 `MAX_DETACHED` → 按 `usedAt` 从旧到新丢弃整层，直到不超过。
- 丢弃 = 从 Map 删除、不放进空闲表；元素没有监听，引用清掉后由浏览器回收。

### 6.6 销毁
`dispose()`：清空所有 Map 和空闲表；图层容器里的元素由 `W.06.01` 的销毁步骤统一清空。

## 7. 不变量
- 同一个 ID 在同一层里最多对应一个元素；一个元素同一时刻只属于一个（文档, 层, ID）或空闲表。
- 挂在图层容器里的元素恰好是当前文档当前层三张 Map 里的元素。
- 摘下保留的元素总数 ≤ `MAX_DETACHED`；每类空闲元素 ≤ `MAX_FREE`；文档数 ≤ `MAX_DOCS`。
- 池里的外壳元素上没有事件监听。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `release` 一个不在当前层的 ID | 忽略（开发模式 `console.warn`） |
| 当前没有文档时调用 `node(id)` | 开发模式抛错；生产模式返回一个不挂到 DOM 的临时元素并 `console.error` |
| 空闲表里的元素被外部挂到了别处（不应发生） | 取出时检查 `parentNode`，不为空就丢弃它、换下一个 |

## 9. 性能与资源
- 返回已缓存的上一层（200 节点、300 连线）：摘下 + 挂回 ≤ 10ms；加上全量 `patch` ≤ 40ms，满足进入 / 返回 ≤ 100ms（`U.17` §1）。
- 切回内存里的会话：引擎部分 ≤ 120ms（`W.06.01` §6.3）。
- 反复创建、删除 200 个节点 10 次：堆快照在第 2 次之后不再增长（空闲表封顶 64）。
- 保留的元素约 2000 个 × 每个节点约 40 个子元素：内存 ≤ 40MB。

## 10. 验收标准
1. 进入子图再返回：父层节点元素是同一批对象（引用相等），返回 ≤ 100ms（不含转场）。
2. 在 6 个会话之间切换：池里的文档 ≤ 5；被释放的工作区对应的元素不再被引用（堆快照里找不到它们的 `data-node-id`）。
3. 反复创建删除 200 节点 10 次，堆不持续增长（`设17` §8）。
4. 在第 7 层之间来回切换：每份文档保留的层 ≤ 5，摘下保留的元素总数 ≤ 2000。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/render/pool.ts`、`pool.test.ts`；`web/tests/bench/canvas-pool.bench.ts`（`W.11` 收集）。
- 不许碰的文件：`render/node.ts`、`render/note.ts`、`render/edge.ts`（它们只调用本文）、`web/src/state/`、`web/src/canvas/core/engine.ts`（换层、换文档的调用点在 `W.06.01`）。
- 函数签名：见 §4。
- 测试用例（jsdom，假时钟）：
  - `W0606-T1 复用`：`node(a)` 两次返回同一元素；`has('node', a)` 为 true
  - `W0606-T2 回收与再用`：`release('node', a)` 后元素不在 DOM、`data-node-id`、`style`、子元素、`__hxv` 都被清掉；`node(b)` 拿到的是同一个元素对象
  - `W0606-T3 空闲上限`：回收 100 个节点 → 空闲表 64 个
  - `W0606-T4 换层保留`：root 有 3 个节点 → `switchScope('root', X)` → root 的元素不在 DOM 但仍被保留；`switchScope(X, 'root')` → 3 个同样的元素按原顺序挂回
  - `W0606-T5 层数上限`：依次进入 6 个不同的层 → 本文档保留 5 层，最早离开的那层被丢弃
  - `W0606-T6 总量上限`：多层合计摘下 2500 个元素 → 丢弃最旧的层直到 ≤ 2000
  - `W0606-T7 换文档`：文档 A → B → A：A 的当前层元素对象与第一次相同
  - `W0606-T8 文档上限与 dropDoc`：打开 6 份文档 → 保留 5 份；`dropDoc(A)` 后 `stats().docs` 减 1，A 的元素不再被引用（用 `WeakRef` 检查在 Map 里找不到）
  - `W0606-T9 无监听`：测试里监视 `EventTarget.prototype.addEventListener`，池创建的外壳元素上的调用次数为 0
  - `W0606-T10 基准`：200 节点 300 连线的层"摘下 + 挂回" ≤ 10ms；反复建删 200 节点 10 次后 `stats()` 稳定（bench）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部；另：不在外壳元素上挂事件监听；回收时不保留旧 ID 的任何数据；不保留超过上限的元素；不在本模块里渲染内容。
- 完成标志：`G.14` 全部条件；§10 四条验收通过。
