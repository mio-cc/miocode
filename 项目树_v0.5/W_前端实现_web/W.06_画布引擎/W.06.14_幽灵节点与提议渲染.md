# W.06.14 幽灵节点与提议渲染

| 项 | 内容 |
|---|---|
| 编号 | W.06.14 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设12（幽灵节点、提议条、AI 光标）；demo `设计规范_v0.3/src/29_model.js`（`ghostOn`、`ghostOff`、`renderBar`、`pointTo`）；`C.08` §4.3；`P.09` K79、K110 |
| 最后修改 | 2026-11-23 |

## 1. 职责
把 model store 里的提议画到画布上：新增的节点和连线画成幽灵元素，被提议删除的节点和连线加删除标记，被提议修改的参数在提议条里显示"旧值 → 新值"；每处修改旁边的提议条提供"采纳 / 拒绝"；"逐条查看"时把视图移到当前那一处；以及模型正在操作时的 AI 光标（`U.12` §3、§5）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 提议的数据、预览分层、采纳与拒绝的请求、逐条查看的位置 | `W.03.06`（本文调它的 action、读它的选择器） |
| 对话框上方的提议栏（"模型提议 N 处修改 · 逐条查看 · 全部采纳 · 全部拒绝"、"另有 2 处在…"、过期提示） | `W.07`（提议栏与对话框，`U.09.01` ⑤） |
| 逐条查看跨到别的层时换层 | `W.07`（调 `W.02.01` 的 `enterLayer`，`W.03.06` §6.4）；本文只处理当前层 |
| 幽灵节点内部的结构（头部、端口、控件） | `W.06.03`（`renderInto`） |
| 幽灵连线的路径元素 | `W.06.04`（`drawGhost`、`clearGhosts`） |
| 模型直接修改（档位 2 及以上）后的模型色光环 | `W.06.01` 的订阅表（`change.actor` 为模型时 `nodes.flash(id,'model')`，`W.06` §6.3） |
| AI 角标与角标悬停卡 | `W.06.03`、`W.06.01` 的 `CanvasOverlays` |
| 档位胶囊、"AI 正在编辑…" | `W.07.01` |

## 3. 继承的上级约束
`W.06` §4.3、§5（`scene.ghosts`、`edgeGhost`、`worldUi`）、§6.2、§6.3、§6.6、`W.06-R3`–`R5`、`R7`、`R8`；`W.06.03` §6.6（`renderInto`、`setMark`）；`W.06.04` §6.6；`W.03.06` §4、§6.1–§6.5；`C.08` §4、`C.08-R2`、`R6`；`E.17.03`；`U.12` §3、§5、`R2`；`U.07.03`（呼吸点）；`U.07.04` §2；`U.10.05-R1`；`U.16` §3；`P.09` K79、K103。

## 4. 接口
```ts
// web/src/canvas/core/ghost/index.ts
export function createGhost(ctx: EngineCtx): {
  sync(): void;                 // 当前层的幽灵元素全部重算；W.06 §6.4 第 2 步、绑定文档后由 W.06.01 调用（K104）
  dispose(): void;
};
export type GhostBar = { key: string; proposalId: Ulid; opIds: readonly Ulid[]; anchor: { node: string } | { edge: string };
  reason: string; changes: readonly { label: string; old?: string; new?: string }[]; removing: boolean };   // 一个提议条
export function barsFor(marks: readonly GhostMark[], ghostGraph: GraphModel): GhostBar[];   // 纯函数：§6.2 的合并规则
export function formatValue(v: unknown, max: number): string;                               // 纯函数：参数值的单行显示（截断加 …）

// web/src/canvas/core/ghost/cursor.ts
export function createAiCursor(ctx: EngineCtx): { update(a: ModelActivity | null): void; dispose(): void };
export const CURSOR_HIDE_MS = 1500;      // 目标消失后光标淡出前停留的时间
```

### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`scene.ghosts`、`scene.worldUi`、`nodes`、`edges`、`geom`（含 `forModel`）、`vp`、`frame`、`readonly()`、`deps.t`、`deps.icon`、`deps.theme`、`doc().stores.model`）；`W.06.03` 的 `NodeLayer.renderInto`、`setMark`、`flash`；`W.06.04` 的 `drawGhost`、`clearGhosts`；`W.03.06` 的 `ModelStoreApi`、`marksIn`、`reviewTarget`、`GhostMark`、`ModelActivity`；`W.03.01` 的 `GraphModel`。

## 5. 数据结构
- 本层私有：`ghostEls: Map<string, HTMLDivElement>`（键为幽灵节点的临时 ID `tmp:N`）、`bars: Map<string, HTMLDivElement>`、`marked: { nodes: Set<Ulid>; edges: Set<Ulid> }`（加过 `ghost-remove` 标记的真实元素）、`last: { previews; scope; review } | null`（上次同步时的引用，没变就不重算）。
- 幽灵元素不进 DOM 池（`W.06.06` §2：数量少、跟着提议走）；它们在 `scene.ghosts` 里，`data-ghost-id` 为临时 ID（`W.06.03` §6.6）。

### 5.1 提议条 DOM
```
div.hx-gbar[data-gbar][role=group][aria-label="模型提议：{理由}"]     放在 worldUi；transform 定位在锚点下方
├─ span.hx-gbar__tag        "模型提议"
├─ span.hx-gbar__why        理由一句话（textContent；超过一行截断，悬停显示全文）
├─ ul.hx-gbar__chg          被修改的参数：li > b（参数名）+ s（旧值，划线）+ "→" + em（新值，model 色）
├─ button[data-act=accept]  采纳
└─ button[data-act=reject]  拒绝
```

## 6. 行为

### 6.1 同步时机
- 订阅 model store 的 `previews`、`review`、`activity`、`deciding`（选择器 + 引用相等），以及当前层变化：有变化就 `frame.request('patch', sync)`（幽灵元素与真实节点在同一帧的 `patch` 阶段更新，采纳后 `op.applied` 与 `proposal.decided` 同帧到达时幽灵和真实节点无缝交接，`W.03.06` §6.3 第 3 步）；AI 光标在 `overlay` 阶段。
- 当前文档没有 model store（只读画布，`W.03` §4.2）→ 本模块什么都不画。

### 6.2 画什么（`marksIn(state, scope)`，`C.08` §4.3）
| 标记 | 画法 |
|---|---|
| `ghost: add`，目标是节点（`tmp:N`） | 在 `scene.ghosts` 里建 `div.hx-node.is-ghost`，`nodes.renderInto(el, ghostGraph.nodes.get(id), {ghost:true})`；位置、尺寸用 `geom.forModel(ghostGraph)`（K104）；主体透明度 0.72、外框 1.5px `model-line` 虚线（`U.12` §3，CSS） |
| `ghost: add`，目标是连线 | `drawGhost(ctx, 临时 ID, 源端口, 目标端口, 源端口类别)`：端口坐标对真实节点用 `geom.portPos`、对幽灵节点用 `geom.forModel(ghostGraph).portPos`；`model` 色虚线（`W.06.04` §6.6） |
| `ghost: remove`，节点 / 连线 | `nodes.setMark(id, 'ghost-remove', true)` / `edges.setMark(id, 'ghost-remove', true)`：红色虚线外框、标题删除线（`U.12` §3） |
| `ghost: modify`（参数） | 不改真实节点的控件；在该节点的提议条里列出"参数名 ~~旧值~~ → 新值"（新值 model 色，`U.12` §3） |
- 提议条的合并（`barsFor`，K110）：同一提议里，一个节点的全部标记（新增 / 删除 / 若干参数修改）合成一条，锚在节点下方；两端有一端是本提议幽灵节点的新增连线并入那个节点的提议条（采纳节点时连线按依赖一起处理，`C.08-R6`）；其余连线标记各一条，锚在连线中点（`geom.edgePath` 或幽灵路径的 `mid`）。
- 理由：标记自己的 `reason`，没有就用提议 `patch.op_reasons[op_id]`，再没有用 `patch.rationale`（`C.08` §2）。
- 上一次画过、这次不在的元素：移除幽灵 DOM、`setMark(…, false)`、`clearGhosts` 后重画剩下的幽灵连线。
- 幽灵节点、提议条不能拖动、不能连线、不能选中（指针在它们上面时 `W.06.07` 按 `[data-act]` / 非 `data-node-id` 处理为 `ignore` 或空白）。

### 6.3 采纳与拒绝
- 点提议条的按钮（`click` 在根元素上委托，用 `elementFromPoint` 取按钮，`W.06-R6`）：`model.actions.accept(proposalId, opIds)` / `reject(...)`。`opIds` 是这条提议条合并的全部 Op；依赖联动由服务端做（`C.08-R6`），本文不推算。
- 提议正在提交（`deciding` 含它）：按钮 `disabled`，提议条加 `is-busy`。
- 画布只读（`W.06` §6.6，例如断开连接）：按钮 `disabled`，悬停说明"已断开，恢复后再处理"；急停中采纳会被服务端拒绝（`P.09` K82），提示由 `W.03.06` / `W.05` 负责。
- 成功后不在本地删幽灵：等 `proposal.decided` 和 `op.applied` 到达（`W.03.06` §6.3 第 3 步）。

### 6.4 逐条查看（`U.12` §3）
- `reviewTarget(state)` 变化且目标在当前层：对应提议条加 `is-review`（`--hx-model` 外环），`vp.reveal(目标的包围盒)`（节点用 `box`、连线用两端节点的包围盒并集）；幽灵节点和真实节点都 `flash(…, 'model')`（幽灵节点用 CSS 类，不经 `NodeLayer`）。
- 目标在其他层：不处理（换层由 `W.07` 发起，换层后 `sync` 时再按上一条处理）。
- 结束逐条查看：去掉 `is-review`。

### 6.5 AI 光标（`U.12` §5、`P.09` K79）
- 数据：`state.activity`（`W.03.06` §6.5：图协同流的 `model.activity.target`，或当前运行的 `orch.tool_call.target_node`）。
- `state` 为 `editing` / `thinking` 且 `target.node` 在当前层（真实节点，或本层幽灵节点）→ 在 `worldUi` 里显示 `div.hx-aicursor`（小指针图标 + "AI" 角标，`model` 色），移动到目标节点右上角外侧（`box.x + box.w − 8, box.y − 10`）；移动用 CSS `transition: transform var(--hx-t-3)`，减少动效时没有过渡（`U.07.04` §2）。
- 没有目标、目标在别的层、`activity` 为 null 或 `idle` / `stopped`：光标停 `CURSOR_HIDE_MS` 后淡出；期间来了新目标就继续移动。
- 光标不响应指针（`pointer-events: none`），`aria-hidden="true"`；读屏用户从顶部条的"AI 正在编辑…"得到同样的信息（`W.07.01`）。
- 节点被拖动时光标跟着节点（位置在 `overlay` 阶段按 `geom.box` 重算，`geom.pos` 先读 `ctx.live`）。

### 6.6 视口与 LOD
- 幽灵节点和提议条不受视口裁剪（数量少）；LOD 第 2、3 级时幽灵节点按同样的 `.lod-2` / `.lod-3` 规则简化，提议条在第 3 级只保留"采纳 / 拒绝"两个按钮，按钮在屏幕上保持 ≥ 24px（`U.05-R5`；尺寸用 `--_inv` 换算，`W.06.05` §6.1）。

## 7. 不变量
- 本模块从不调用 `OpsApi.dispatch`、不改 graph store；采纳 / 拒绝只经 model store 的 action（INV-08、`W.03.06` §7）。
- 画布上的每个幽灵元素都对应当前层 `marksIn` 里的一个标记；提议被处理或过期后它的幽灵元素在同一帧消失。
- 幽灵节点不在 `scene.nodes` 下、没有 `data-node-id`；真实节点的 `ghost-remove` 标记只在它被提议删除期间存在。
- 只读画布不显示任何幽灵元素和 AI 光标。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 标记的目标在 `ghostGraph` 里找不到 | 跳过这一条，`console.warn` 一次（`W.03.06` §6.2 已过滤大部分） |
| 幽灵连线的端口在形状里不存在 | 画成两节点边缘中点之间的虚线（与 `W.06.04` §8 同样的兜底） |
| `accept` / `reject` 失败 | 按钮恢复可用；提示由 `W.03.06` 的调用结果交给 `W.07` 显示（本文只恢复按钮） |
| 参数值是对象或很长的文本 | `formatValue` 截成一行 40 字，悬停显示全文 |

## 9. 性能与资源
- 一个 50 处修改的提议：首次 `sync` ≤ 8ms（含 50 次 `renderInto`）；之后 `previews` 不变时 `sync` ≤ 0.2ms。
- AI 光标每次更新只写一个元素的 `transform`；`model.activity` 每秒数次也不触发其他重算。

## 10. 验收标准
1. 档位 1 下让 AI 加一个人工复核节点：画布上出现半透明、模型色虚线外框的幽灵节点和幽灵连线，节点下方提议条写着理由和"采纳 / 拒绝"（`U.12` §3）；点"采纳"后幽灵节点原地变成真实节点，没有闪烁和跳动。
2. 提议修改了某节点的并发数：提议条显示"并发 ~~3~~ → 5"；提议删除一条连线：连线变红色虚线。
3. "逐条查看"依次聚焦每处修改，跨层时画布进入那一层后再聚焦（与 `W.07` 联合）。
4. 提议过期：幽灵元素全部消失。
5. 对话 Agent 改图时 AI 光标移动到它操作的节点；它停下 1.5 秒后光标淡出；减少动效时光标直接跳到目标。
6. 断开服务时提议条按钮不可点；回放页、子图库预览里看不到幽灵元素。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/ghost/index.ts`、`bars.ts`、`cursor.ts`、`ghost.css`，以及 `ghost.test.ts`、`bars.test.ts`、`cursor.test.ts`；`web/tests/e2e/canvas-proposal.spec.ts`；`web/tests/visual/canvas-ghost.spec.ts`。
- 不许碰的文件：`render/`（只调用 `renderInto`、`setMark`、`drawGhost`）、`render/pool.ts`、`interact/`、`web/src/state/`（只调用 model store 的 action）、`web/src/panels/`（提议栏在 `W.07`）、`design/tokens.css`。
- 函数签名：见 §4。
- 测试用例（jsdom；假 model store、假 `ghostGraph`）：
  - `W0614-T1 新增节点`：一条 `add` 节点标记 → `scene.ghosts` 下 1 个元素、`data-ghost-id='tmp:1'`、`renderInto` 调用 1 次、位置等于 `ghostGraph` 里的 `pos`
  - `W0614-T2 新增连线`：`tmp:1.out → n5.in` → `drawGhost` 收到的终点等于 `geom.portPos(n5.in)`，起点来自 `forModel`
  - `W0614-T3 删除`：节点和连线的 `remove` 标记 → `setMark(…,'ghost-remove',true)`；标记消失后 `false`
  - `W0614-T4 合并提议条`：一个节点的 `add` + 连到它的 2 条连线 + 另一节点的 2 个参数修改 → 2 条提议条；参数修改条里 2 行"旧 → 新"
  - `W0614-T5 采纳`：点"采纳" → `model.actions.accept(pid, [节点 op, 2 条连线 op])` 1 次；不调用 `dispatch`；本地幽灵元素仍在，直到 `previews` 变化
  - `W0614-T6 deciding`：`deciding` 含 pid → 按钮 `disabled`
  - `W0614-T7 只读`：`readonly()=true` → 按钮 `disabled`；`stores.model=null` → `scene.ghosts` 为空
  - `W0614-T8 逐条查看`：`review` 指向当前层第 2 处 → 对应提议条 `is-review`、`vp.reveal` 1 次；指向别的层 → 0 次
  - `W0614-T9 换层`：`sync()` 在换层后调用 → 上一层的幽灵元素全部移除，只画新一层的
  - `W0614-T10 AI 光标`：`activity.target.node=a`（当前层）→ 光标 `transform` 指向 a 的右上角；`activity=null` → 1.5 秒后加淡出类；目标在别的层 → 同样淡出
  - `W0614-T11 不用 innerHTML`：理由里写 `<img onerror>` → 按文本显示
  - `W0614-T12 端到端`：§10 验收 1、2、4、5（Playwright，`anydoor --fake-llm` 的录放编排者）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R6、R23、R25）；另：不在本地推算提议的依赖联动；采纳后不在本地删幽灵或改图；不给幽灵元素绑定单独的事件监听；不把理由、参数值拼进 `innerHTML`；高亮只用 `--hx-model`（`U.10.05-R1`）。
- 完成标志：`G.14` 全部条件；§10 六条验收通过。
