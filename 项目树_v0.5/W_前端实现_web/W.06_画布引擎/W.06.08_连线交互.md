# W.06.08 连线交互

| 项 | 内容 |
|---|---|
| 编号 | W.06.08 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设09（连线交互、类型提示、吸附）；demo `设计规范_v0.3/src/25_pointer.js`（`startLink`、`frameLink`、`endLink`、连线悬停按钮）；demo v0.5 `25_pointer.js`；`P.10` 里 Flyde、ComfyUI 的端口与连线交互（只参考行为，ADR-010） |
| 最后修改 | 2026-11-23 |

## 1. 职责
画布上建立、改接、断开连线的全部指针交互：从输出端口拖出预览线、兼容端口高亮与不兼容端口变暗、吸附、类型不兼容的原因提示、松开后连线或替换、从已连接的输入端口拔出改接、拖到空白处打开快速添加、`Alt` + 点击断开端口上的全部连线、悬停连线时的中点"插入节点 / 删除"按钮；并给键盘连线（`W.06.09`）和快速添加（`W.06.07`）提供 `LinkApi`。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 端口兼容的判断、类型推断、是否成环、是否替换旧线 | `W.05`（`canConnect`、`fits`，`P.09` K90、K99） |
| 指针按下时的模式分派、拖到边缘自动平移 | `W.06.07`（按到端口时把指针交给本文；自动平移用它的逻辑） |
| 连线和预览线的绘制 | `W.06.04`（本文调 `edges.preview`、`edges.setHover`） |
| 端口坐标、贝塞尔、最近端口 | `W.06.10` |
| 快速添加面板的界面和过滤 | `W.07.11`（本文发 `quickAdd.open`，带源端口和类型） |
| 键盘连线模式（`C`） | `W.06.09`（用本文的 `LinkApi`） |

## 3. 继承的上级约束
`W.06` §4.4（`LinkApi`）、§6.2、§6.5、§6.6、`W.06-R3`、`R6`；`W.05` §4.1、§6.2（P5–P9）；`C.02.03`；`C.04.02`（兼容规则与提示文案）；`C.04.04`（多连）；`C.05.02`（`connect` 的 `replaced`、`disconnect`）；`C.05-R3`；`U.10.03` §1、§3；`U.13.02` §4；`U.22-R9`；`U.10.06` §1（第 3 级不显示端口）；`U.14.05`。

## 4. 接口
```ts
// web/src/canvas/core/interact/link.ts
export function createLink(ctx: EngineCtx): LinkApi & {
  begin(ref: PortRef, dir: 'in' | 'out', s: Pt, alt: boolean): boolean;   // W.06.07 按到端口时调用；返回 false = 不进入拖线（只读、LOD 3、Alt 断开已处理）
  move(s: Pt): void;  end(s: Pt): Promise<void>;  cancel(): void;
  dispose(): void;
};
export const BAD_HINT_R = 12;           // 不兼容端口的提示半径，屏幕像素
export const CAND_BUDGET_MS = 4;        // 每帧计算候选端口的时间上限

// web/src/canvas/core/interact/edgeTools.ts —— 悬停连线的中点按钮
export function createEdgeTools(ctx: EngineCtx): { dispose(): void };
export const TOOLS_HIDE_DELAY = 260;    // 离开连线和按钮后多久隐藏，毫秒
```
`LinkApi`（`W.06` §4.4）：`targets(from)` 当前层所有可能的目标输入端口和预检结果；`connect(from, to, {replacing?})`；`disconnectPort(ref, dir)`；`firstFit(type, def, dir)`。

### 4.1 依赖
`W.05` 的 `OpsApi.canConnect`、`fits`、`portTypes`、`dispatch`、`undo`；`W.06.10` 的 `geom.portPos`、`geom.nearestPort`、`geom.query`、`geom.shape`；`W.06.04` 的 `edges.preview`、`edges.setHover`；`W.06.05` 的 `lod.level`、`lod.visible`；`W.03.03` 的 `ui.actions.notify`；`deps.t`、`deps.newId`；`@/lib/protocol` 的 `OpKind`。

## 5. 数据结构
```ts
type LinkDrag = {
  from: PortRef;                         // 输出端口（改接时是原连线的源）
  type: TypeRef;  cat: Category;         // 源端口的数据类型和显示类别（推断后）
  unplug: Ulid | null;                   // 从已连接的输入端口拔出的那条连线
  pending: PortRef[];                    // 还没算预检的候选端口（视口内的先算）
  cands: Map<string, { ref: PortRef; at: Pt; check: Precheck }>;   // 键 `${node}.${port}`
  snap: string | null;  bad: string | null;
  moved: boolean;
};
```

## 6. 行为

### 6.1 开始（`begin`）
| 按下的端口 | 结果 |
|---|---|
| 输出端口 | 开始拖线：`from` = 这个端口 |
| 已有连线的输入端口 | 拔出：取连到它的最后一条连线（多连端口取最后建的那条），`from` = 它的源；这条连线先隐藏（不提交），`unplug` = 它 |
| 没有连线的输入端口 | 不进入拖线，返回 false（按节点处理） |
| `Alt` + 按下任意端口 | `disconnectPort(ref, dir)`，返回 false（`U.10.03` §3） |
- 只读（`W.06` §6.6）、LOD 第 3 级（端口不可见）→ 返回 false。
- 源端口加 `is-src`；预览线从 `geom.portPos(from)` 出发，颜色为源类别（`edges.preview(a, a, 'free', cat)`）。
- 候选端口：当前层里除源节点以外的所有输入端口，按"在可见范围内的先算"排进 `pending`；每帧在 `input` 阶段最多花 `CAND_BUDGET_MS` 调 `ops.canConnect(from, to, scope)`，算完的端口加 `is-cand`（兼容：放大发亮）或 `is-dim`（不兼容：变暗）（`U.10.03` §3）。`check.uncertain` 当作兼容。

### 6.2 拖动中（每帧）
1. 指针换成世界坐标；在已算好的兼容候选里找 `geom.nearestPort(候选, p, L.snapR / k)`（18 屏幕像素，`U.10.03` §3）。离指针最近但还没算的候选（在 18px 内的）先同步算掉，保证吸附不漏。
2. 找到 → `snap`：预览线终点吸到端口（`edges.preview(a, 端口, 'snap', cat)`），端口加 `is-snap`（光环）。同时按预检结果在端口旁 `worldUi` 里显示一个小标签：`check.assign` 表示自动展开（`C.04.02` C7）→ "逐项执行"；`check.replaces` 有值 → "将替换原连线"。
3. 没找到兼容的 → 看 `BAD_HINT_R / k` 内有没有不兼容的端口：有 → 预览线 `bad`（红色虚线），在指针右下 14px 处的 `screenUi` 显示原因（`check.textKey`，例如成环时"环只能通过循环节点形成"、ctx 端口时 `C.04.02-R2` 的提示）；没有 → 预览线 `free`，终点跟着指针。
4. 指针靠近画布边缘时自动平移（`W.06.07` §6.3 第 5 步）。

### 6.3 松开（`end`）
| 松开时 | 拖出的 | 拔出的 |
|---|---|---|
| 吸附在兼容端口上 | `connect(from, to)` | 同一个端口 → 什么都不做，恢复原线；别的端口 → 一批 `[disconnect 原线, connect 新线]` |
| 空白处 | `emit('quickAdd.open', {at, world, from:{port: from, type}})`：快速添加面板只列能接这种类型的节点（`U.10.03` §3、`U.22-R9`） | `dispatch(disconnect 原线)`，提示"已断开连线" + 撤销（`U.10.03` §3） |
| 不兼容的端口上 | 什么都不做 | 恢复原线 |
| 按下后没移动（< 3px） | 取消 | 取消，恢复原线 |
- `connect`：`OpDraft` = `connect{edge:{id: deps.newId(), from, to}}`；一次 `dispatch`。结果 `applied` / `merged` 且预检带 `replaces` → 提示"已替换原来的连线"，带"撤销"（调 `ops.undo()`，`done` 后 `cmd.locate`）。
- 结果 `blocked`（服务端前的本地预检没通过，比如拖动期间图变了）→ 在指针旁显示原因 1.6 秒。
- 清理：去掉全部 `is-cand`、`is-dim`、`is-snap`、`is-src`、标签和原因提示；`edges.preview(null)`；被隐藏的原线恢复显示（提交后由图的变化删除它）。
- `Esc`（`pointer.cancel`）→ `cancel()`：同"按下后没移动"。

### 6.4 `disconnectPort(ref, dir)`
把这个端口上的全部连线（输入端口：连到它的；输出端口：从它出发的）放进一次 `dispatch(disconnect{ids})`；没有连线 → 什么都不做。成功后提示"已断开 N 条连线" + 撤销。右键菜单的"断开全部连线"（`U.13.05` §1）也调这里。

### 6.5 `targets(from)`、`firstFit`
- `targets(from)`：当前层除源节点外所有输入端口，逐个 `canConnect`，按节点从左到右、从上到下、端口从上到下排序返回（给 `W.06.09` 的键盘连线用）。
- `firstFit(type, def, dir)`：按 NodeDef 里端口的声明顺序，返回第一个 `ops.fits(type, 端口类型)`（`dir='in'`）或 `ops.fits(端口类型, type)`（`dir='out'`）为真的端口名；端口类型是 `$T` 时视为能接（推断在连上之后由 `W.05` 完成）；`ctx`、`tool`、`ref` 端口按严格匹配（`C.03.01-R4`，由 `fits` 保证）。

### 6.6 连线悬停按钮（`edgeTools.ts`）
- 指针移到连线热区（没有进行中的指针模式时）：`edges.setHover(id)`；在 `worldUi` 里连线中点（`geom.edgePath(id).mid`）显示两个按钮："+"（插入节点）、"×"（删除）（`U.10.03` §3）。只读时只变粗，不显示按钮。
- 离开连线和按钮 `TOOLS_HIDE_DELAY` 后隐藏；移到按钮上时取消隐藏。
- "+" → `emit('quickAdd.open', {at: 按钮位置, world: mid, insert: id})`，选中节点类型后由 `cmd.addNode(…, {insertInto: id})` 插入（`W.06.07` §6.8）。
- "×" → `dispatch(disconnect{ids:[id]})`，提示"已删除连线" + 撤销。
- 按钮是 `button` 元素，有 `aria-label`（`U.08-R5`）；点击事件在根元素上委托处理，用 `elementFromPoint` 取按钮（`W.06-R6`）。

## 7. 不变量
- 拖线过程中不提交任何 Op；松开后最多一次 `dispatch`（改接是一批两条，同一 `groupId`）。
- 预览线、候选标记、原因提示只在拖线期间存在；结束后全部清掉。
- 是否兼容、是否替换、是否成环只来自 `OpsApi` 的预检；本文不自己判断类型。
- 被拔出的原线在提交前一直保留在图里，只是不显示；取消时原样恢复。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 预检 `ok:false` 的端口被吸附 | 不会发生：只在兼容候选里吸附 |
| `dispatch` 结果为 `rejected`（例如服务端判定成环） | 提示由 `W.05` 负责；本文清理预览，原线恢复 |
| 拖线中图被整图替换（`change.full`） | `cancel()` |
| 拖线中源节点被别人删除 | 下一帧发现 `from` 不存在 → `cancel()`，在指针旁提示"源节点已被删除" |
| `canConnect` 抛错 | 该端口按不兼容处理，`console.error` 一次 |

## 9. 性能与资源
- 拖线每帧（吸附 + 预览 + 提示）≤ 2ms（200 节点、约 800 个输入端口，`设17` §7）。
- 开始拖线的那一帧 ≤ 4ms（候选分帧计算）；可见范围内的候选在 3 帧内全部算完。
- 悬停按钮的显示和隐藏只改 `worldUi` 里两个元素。

## 10. 验收标准
1. 从输出端口拖出：兼容的输入端口放大发亮、不兼容的变暗；拖到 18px 内吸附并出现光环；松开建立连线（`U.10.03` §3）。
2. 连到已有连线的非多连端口：吸附时显示"将替换原连线"，松开后旧线被替换并提示"已替换原来的连线"，撤销一次恢复旧线。
3. 拖到不兼容端口：预览线变红色虚线，旁边显示 `C.04.02` 的原因；连出非法的环时显示"环只能通过循环节点形成"。
4. 从已连接的输入端口拖出接到别处：一次撤销恢复原连线；拖到空白处松开：连线被删除并提示。
5. 拖到空白处松开（新拖出的）：快速添加面板只列能接这种类型的节点，选中后自动创建并连好。
6. `Alt` + 点击端口断开它的全部连线；悬停连线出现"+""×"，"×"删除、"+"插入节点。
7. 自动展开的连线吸附时显示"逐项执行"。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/interact/link.ts`、`edgeTools.ts`、`link.css`（候选、吸附光环、标签、原因提示、中点按钮），以及 `link.test.ts`、`edgeTools.test.ts`；`web/tests/e2e/canvas-link.spec.ts`。
- 不许碰的文件：`interact/pointer.ts`、`select.ts`、`drag.ts`、`keyboard.ts`、`render/`、`geom/`、`web/src/ops/`（只调用 `OpsApi`）、`web/src/state/`、`web/src/panels/`。
- 函数签名：见 §4。
- 测试用例（jsdom；假 `ops.canConnect` 按测试表返回；假 `geom`）：
  - `W0608-T1 开始`：输出端口 → 进入拖线；无连线的输入端口 → `begin` 返回 false；只读或 LOD 3 → false
  - `W0608-T2 候选分帧`：400 个输入端口、`canConnect` 每次 0.02ms → 第一帧算 ≤ 200 个，3 帧内可见范围全部算完；兼容的有 `is-cand`、不兼容的有 `is-dim`
  - `W0608-T3 吸附`：指针在兼容端口 17 屏幕像素处（`k=0.5`）→ 吸附；19 像素 → 不吸附
  - `W0608-T4 原因提示`：不兼容端口 10px 内 → 预览 `bad`、原因文字为 `check.textKey` 的文案；`cycle` → "环只能通过循环节点形成"
  - `W0608-T5 标签`：`check.replaces` 有值 → "将替换原连线"；`check.assign` 为自动展开 → "逐项执行"
  - `W0608-T6 连上`：松开在兼容端口 → 一次 `dispatch`，`connect.edge.id` 来自 `deps.newId`；带 `replaces` 时成功后 `notify` 一次且带"撤销"
  - `W0608-T7 改接`：拔出 e1 接到另一端口 → 一次 `dispatch([disconnect e1, connect 新])`；接回原端口 → 不 dispatch，e1 恢复显示
  - `W0608-T8 拔出到空白`：→ `dispatch(disconnect e1)`、提示"已断开连线"
  - `W0608-T9 拖出到空白`：→ `quickAdd.open` 带 `from.port`、`from.type`，不 dispatch
  - `W0608-T10 取消`：`cancel()` → 无 dispatch，所有标记、预览、提示被清掉
  - `W0608-T11 Alt 断开`：端口上 3 条连线 → 一次 `dispatch(disconnect{ids: 3 个})`，提示"已断开 3 条连线"
  - `W0608-T12 firstFit`：`fits` 假实现下，`方案@1` 对 Agent 的输入 → 第一个能接的端口名；`上下文包@1` → `context`；没有能接的 → null
  - `W0608-T13 中点按钮`：悬停连线 → 两个按钮出现在中点；离开 260ms 后消失；"×" → `dispatch(disconnect)`；"+" → `quickAdd.open{insert}`；只读 → 不出现按钮
  - `W0608-T14 源节点被删`：拖线中 `change` 删除源节点 → 下一帧取消
  - `W0608-T15 端到端`：§10 验收 1–6（Playwright，`harnessd --fake-llm`，用 `assign_vectors.json` 里的类型构造测试图）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R3、R6）；另：不在前端自己写类型兼容规则（只用 `canConnect`、`fits`）；拖线中不 dispatch；不跨层连线；不用 `event.target` 判断松开在哪个端口（用几何吸附）。
- 完成标志：`G.14` 全部条件；§10 七条验收通过。
