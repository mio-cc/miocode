# W.06.07 选择与拖动

| 项 | 内容 |
|---|---|
| 编号 | W.06.07 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设13（选择、拖动）；设17 R3、R4、R6、§4（事件委托）；demo `设计规范_v0.3/src/25_pointer.js`；demo v0.5 `25_pointer.js`（`onDown`、`startDrag`、`frame`、`onUp`、`under()` 按坐标取元素、节点库放下） |
| 最后修改 | 2026-11-23 |

## 1. 职责
画布上的指针路由和"选、拖、放"：`pointerdown` 时判断进入哪种指针模式（平移 / 拖动 / 框选 / 拖线 / 交给控件），单击、加选、框选、单击空白取消选中，拖动节点和便签（吸附网格、对齐参考线、拖到边缘自动平移、`Esc` 取消），单击缩略图预览、双击进入或打开属性、双击空白快速添加，右键菜单的目标判断，从节点库拖到画布上放下，以及 `cmd.addNode`。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 平移、缩放本身 | `W.06.02`（本文判断模式后调 `vp.panBy`） |
| 拖线、断线、连线悬停按钮 | `W.06.08`（本文在按到端口时把指针交给它） |
| 键盘选择（`Tab`、`Ctrl+A`、方向键、`Esc` 的分发） | `W.06.09`（它调本文的 `pointer.cancel`、`drag.moveBy`、`sel.set`） |
| 节点上控件的输入 | `W.06.03` |
| 预览浮层、进入子图的转场 | `W.06.13`（本文调 `nest.peek`、发 `nav.enter`） |
| 选中的存放 | `W.03.03`（本文调 `ui.actions.select`） |
| 菜单、快速添加面板的界面 | `W.07.11` |
| 节点库的拖出与"最近"记录 | `W.07.02` |

## 3. 继承的上级约束
`W.06` §4.2（`cmd.addNode`）、§4.4（`PointerApi`、`SelectionApi`、`DragApi`）、§6.2（`input`、`overlay` 阶段）、§6.5、§6.6、`W.06-R3`、`R6`；`W.01-R11`；`W.03.03` §4、§6.2、§9；`W.05` §4.1、§6.8；`C.02.05`（`Pos` 为整数）；`C.05.02`（`move_nodes`、`update_note`、`add_node`、`connect`、`disconnect`）；`C.05-R3`；`U.05-R4`；`U.10.01-R6`、`R7`；`U.10.04` §1；`U.10.02` §1（`frozen` 不可拖）；`U.13.01`；`U.13.02` §1、§3；`U.13.05` §1；`U.13.06` §1、`R1`、`R7`；`U.17-R3`、`R4`、`R6`；`U.22-R7`；`U.14.05`；`P.09` K100。

## 4. 接口
```ts
// web/src/canvas/core/interact/pointer.ts —— 根元素上唯一的一组指针监听
export function createPointer(ctx: EngineCtx): PointerApi & { dispose(): void };
export function classifyDown(e: PointerEvent, ctx: EngineCtx): DownIntent;     // 纯判断，便于测试
export type DownIntent =
  | { kind: 'ignore' }                                            // 控件、按钮、浮层：交给元素自己
  | { kind: 'pan' }
  | { kind: 'port'; ref: PortRef; dir: 'in' | 'out'; alt: boolean }   // 交给 W.06.08
  | { kind: 'node' | 'note'; id: Ulid; additive: boolean; onThumb: boolean }
  | { kind: 'edge'; id: Ulid; additive: boolean }
  | { kind: 'blank'; additive: boolean };

// web/src/canvas/core/interact/select.ts
export function createSelection(ctx: EngineCtx): SelectionApi & {
  marquee: { start(s: Pt, additive: boolean): void; move(s: Pt): void; end(): void; cancel(): void };
  dispose(): void;
};
export function marqueeHits(ctx: EngineCtx, worldRect: Rect): { nodeIds: Ulid[]; noteIds: Ulid[] };   // 相交即选中

// web/src/canvas/core/interact/drag.ts
export const DRAG_THRESHOLD = 3;          // 屏幕像素，小于它算单击
export const EDGE_PAN_ZONE = 24;          // 屏幕像素，进入画布边缘这么近开始自动平移
export const EDGE_PAN_MAX = 12;           // 每帧最多平移的屏幕像素
export function createDrag(ctx: EngineCtx): DragApi & {
  begin(ids: { nodes: readonly Ulid[]; notes: readonly Ulid[] }, s: Pt): void;
  move(s: Pt, alt: boolean): void;  end(): Promise<void>;  cancel(): boolean;
  dispose(): void;
};
export function guides(primary: Rect, others: readonly Rect[]): { x: number[]; y: number[] };   // 对齐参考线（U.10.01-R7）

// web/src/canvas/core/interact/drop.ts
export const PRESET_MIME = 'application/x-hx-preset';   // W.07.02 放进 dataTransfer 的 JSON：{type, params?, label?, tags?, meta?}（meta.preset，C.15-R1，K114）
export function createDrop(ctx: EngineCtx): { addNode: EngineCommands['addNode']; addNote: EngineCommands['addNote']; dispose(): void };
```
### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`vp`、`geom`、`nodes`、`edges`、`lod`、`link`、`nest`、`emit`、`deps.newId`、`deps.t`）；`W.03.03` 的 `selectionOf`、`ui.actions.select`、`ui.getState().tool`；`W.05` 的 `OpsApi.dispatch`、`gesture`、`canConnect`；`@/lib/protocol` 的 `OpKind`（常量）。

## 5. 数据结构
```ts
type Active =                                            // 同一时刻只有一个（W.06 §7）
  | { mode: 'pan'; last: Pt }
  | { mode: 'press'; target: DownIntent; start: Pt }       // 按下还没超过阈值
  | { mode: 'drag'; start: Pt; startWorld: Pt; origin: Map<Ulid, Pt>; notes: Map<Ulid, Pt>; gesture: Gesture | null; moved: boolean }
  | { mode: 'marquee'; start: Pt; additive: boolean; hits: Set<Ulid> }
  | { mode: 'link' }                                       // 由 W.06.08 持有细节
  | { mode: 'control' };
```
`ctx.live`：拖动中节点和便签的实时位置（`W.06` §4.3），拖动结束且 store 已到最终位置后清空。

## 6. 行为

### 6.1 按下（`pointerdown`，用 `event.target` 判断，`W.06-R6`）
| 顺序 | 条件 | 结果 |
|---|---|---|
| 1 | 不是主键也不是中键 | 不处理（右键由 §6.6 处理） |
| 2 | 目标在 `[data-ctl]`、`button`、`[data-act]`、`.hx-node__ai`、`input`、`textarea`、`hx-canvas-ui` 的浮层里 | `ignore`（模式 `control`，直到松开） |
| 3 | 中键；或主键且（按住空格 `setTempPan(true)`、或 `ui.tool='pan'`） | `pan`（`U.13.02` §2） |
| 4 | 端口圆点（`.hx-port__dot`） | `port`：交给 `W.06.08`（只读、LOD 第 3 级时降为第 5 行的节点处理） |
| 5 | 节点 / 便签 | `node` / `note`；`additive` = `Shift` 或 `Mod`；`onThumb` = 目标在 `.hx-node__thumb` 里 |
| 6 | 连线热区（`.hx-edge__hit`） | `edge` |
| 7 | 其他（空白） | `blank`；`additive` = `Shift` |
- 进入 `pan`、`press` 后对根元素 `setPointerCapture`（`U.17-R6`）；`lostpointercapture` 当作松开处理，防止卡在某个模式里。
- 根元素获得焦点（`focus({preventScroll:true})`），让画布快捷键生效。
- 预览浮层打开时，在画布其他地方按下先关闭预览（`nest.closePeek()`，`U.13.06` §2），然后照常处理。

### 6.2 选中规则（`U.13.01`）
| 操作 | 结果 |
|---|---|
| 按下节点（不加修饰） | 节点已选中 → 保持选中集合（准备一起拖动）；否则只选它 |
| `Shift` / `Mod` + 按下节点 | 加选 / 减选；减选后不进入拖动 |
| 单击连线 | 只选这条连线；`Shift` 加选 |
| 单击空白（移动 < 3px） | 取消全部选中 |
| 空白拖动（选择工具） | 框选：和节点或便签相交即选中；`Shift` 时与原选中合并（`P.09` K100：按 `U.13.01`，不是 demo v0.5 的"空白拖动 = 平移"） |
- 写选中：`sel.set` → `ui.actions.select(selectionKey, {scope, nodeIds, edgeIds, noteIds})`；按下节点时立即写（属性页马上切换），框选只在松开时写一次（`W.03.03` §9）。
- `selectionKey = null`（子图库预览这类不能选中的画布，`W.03` §4.2）：不选中，第 5、6、7 行都降为 `pan`（与 `U.13.06-R1` 的预览只读同一规则）。
- 选中节点不打开右栏（`U.09.02-R1`，本文不调 `setRs`）。

### 6.3 拖动节点和便签（`U.13.02` §1）
1. `press` 移动超过 `DRAG_THRESHOLD` → 开始拖动：拖动集合 = 当前选中的节点（去掉 `frozen` 的，`U.10.02` §1）和便签。集合为空 → 不拖动。只读 → 不拖动（`W.06` §6.6）。
2. 有节点时 `gesture = ops.gesture('drag', revert)`，`revert` = 各节点原位置的 `move_nodes`；给被拖节点加 `dragging` 标记（`shadow-node-drag`、最上层，`U.13.02-R2`）；`lod.pin(拖动集合)`。
3. 每帧（`input` 阶段）：`d = (当前 − 起点) / k`；每个元素 `p = 原位置 + d`，`x`、`y` 各自 `geom.snap(v, !alt)`（吸附 `--hx-grid` 20，按住 `Alt` 不吸附；结果总是整数，`C.02.05`）；写 `ctx.live`、`nodes.moveEl(id)`、`edges.updateFor(拖动的节点)`（`U.17-R4`）；位置有变化时 `gesture.update(move_nodes{moves})`（`W.05` 节流到 250ms）。
4. 对齐参考线：以指针下的那个节点为准，与可见范围内其他节点比较左边、右边、水平中线、顶边，相差 < 0.5 世界像素时在 `worldUi` 画 1px `--hx-line-3` 线（`U.10.01-R7`）；只显示，不额外吸附。
5. 自动平移：指针距画布边缘 < `EDGE_PAN_ZONE` 时每帧 `vp.panBy`，速度 = `(EDGE_PAN_ZONE − 距离) / EDGE_PAN_ZONE × EDGE_PAN_MAX`，方向朝外；平移的同时拖动的元素跟着指针（每帧重算第 3 步）。框选和拖线也用同一逻辑。
6. 松开：`gesture.end(最终 move_nodes)`；便签有移动的，用同一个 `groupId` 一次 `dispatch` 所有 `update_note{id, to:{pos}}`（只拖便签时不建手势，直接这一次 `dispatch`），撤销时与节点一起撤销（`U.13.03-R4`）。
7. 清理：去掉 `dragging`、参考线、`pin`；`ctx.live` 里的条目在 graph store 的位置等于最终位置时（`change.groupId` 是本次手势）或 `end()` 的 Promise 完成时清空；结果为 `rejected` / `dropped` → 立即清空（节点回到 store 里的位置）。
8. 拖动中 `Esc`（`W.06.09` 调 `pointer.cancel()`）：`gesture.cancel()`，清空 `ctx.live`，节点回到原位，不 `dispatch` 便签（`U.13.02` §1）。
- 引擎在拖动期间收到本次手势的 `change`（`groupId` 相同）时不把节点拉回 store 的位置（`W.05` §6.8 第 3 步、`W.06` §6.3）。
- 一次拖动服务端只多一条记录：`move_nodes` 被合并（`U.13.02-R1`、`C.05.04` §4）。

### 6.4 框选
- 开始：`press` 在空白处超过阈值；在 `screenUi` 显示框选框（填充 `--hx-marquee`、描边 `--hx-marquee-line`，`U.10.01-R6`），位置和尺寸用 `transform`、`width`、`height` 写（几何值）。
- 每帧：框换成世界矩形，`marqueeHits`（用 `geom.query`，节点和便签都算相交）；命中集合变化的元素加 / 去 `marquee` 标记（预览）。不写 store。
- 松开：框宽或高 < 3px 当作单击空白；否则 `sel.set`（`additive` 时与原选中取并）；去掉预览标记。
- 拖到边缘时自动平移，框的起点按世界坐标保持。

### 6.5 单击与双击（用 `elementFromPoint` 判断，`W.01-R11`、`U.13.06-R7`）
| 事件 | 指针下的元素 | 结果 |
|---|---|---|
| 单击（按下到松开移动 < 3px） | 容器节点的缩略图 | `nest.peek(id)`（`U.13.06` §1）；拖动过就不预览（`U.13.06` 补充验收 2） |
| 双击 | 容器节点任意位置 | `emit('nav.enter', {containerId})`；只读画布也可以进入（这是导航，不是编辑） |
| 双击 | 非容器节点（不在控件上） | `emit('inspect', {nodeId, focus:'label'})` |
| 双击 | 便签 | `W.06.03` 的便签编辑（只读时不编辑） |
| 双击 | 空白 | `emit('quickAdd.open', {at, world})`（`U.13.02` §3；只读时不发） |
| 单击 | 状态脚按钮、提议条按钮 | 由 `W.06.03` / `W.06.14` 处理（`data-act`） |

### 6.6 右键
`contextmenu`：`preventDefault`；用 `elementFromPoint` 取目标：节点（已在多选里 → `selection`，否则先只选它再给 `node`）、连线、便签、端口、空白；`emit('menu.open', {at: 屏幕坐标, target})`（`U.13.05` §1）。拖动中忽略右键。

### 6.7 从节点库放下（`U.22-R7`、`U.13.02` §3）
- `dragover`：`dataTransfer.types` 含 `PRESET_MIME` → `preventDefault`、`dropEffect='copy'`；每帧最多一次用 `elementFromPoint` 看指针下是不是连线，是 → `edges.setHover(id)` 作插入预览。只读时 `dropEffect='none'`。
- `drop`：解析 JSON（`type` 必须是字符串，`params` 必须是对象，否则忽略并 `console.warn`）；放置点 = 指针世界坐标减去（节点宽 / 2，头部高 / 2），吸附；指针下是连线 → `cmd.addNode(d, {at, insertInto: 连线})`，否则 `cmd.addNode(d, {at})`。
- 节点库条目的半透明拖动预览由 `W.07.02` 用 `setDragImage` 提供。

### 6.8 `cmd.addNode(d, o)`（快速添加、放下、节点库点击共用）
1. 只读 → 返回 `{status:'blocked', reason:'readonly'}`。
2. `at = 'center'`：可见区域（扣掉 `fitInsets`）中心；位置吸附成整数。
3. 新节点 `id = deps.newId()`；`ops` 组成一批：`add_node{scope, node:{id, type, pos, params, label, tags, meta}}`（`meta` 原样带上，只用于显示来源）（容器节点的子图端口由 `W.05` 补，`W.05` §5.2）。
4. `connectFrom`：`link.firstFit(源端口的数据类型, 新节点的 NodeDef, 'in')` 找新节点上第一个能接的输入端口（按 NodeDef 顺序；新节点还不在图里，所以按 NodeDef 的端口类型判断，`W.06.08`），有就加一条 `connect{edge:{id: newId(), from, to}}`；没有就只放节点。
5. `insertInto`：原连线 `from → to`；`link.firstFit` 找到新节点兼容的输入和输出 → 加 `disconnect{ids:[原连线]}`、`connect(from → 新.输入)`、`connect(新.输出 → to)`；任一端不兼容 → 只放节点，不改连线，提示"类型不兼容，已放在旁边"。
6. 一次 `ops.dispatch(批)`（`C.05-R3`）；结果 `applied` / `merged` → `sel.set({nodeIds:[id]})`。

- `cmd.addNote({at})`（`W.07.11` 右键空白处"添加便签"，`P.09` K111）：只读 → `blocked`；`at` 换成世界坐标、吸附；一次 `dispatch(add_note{scope, note:{id: deps.newId(), pos, text: '', size 缺省}})`；成功后选中新便签。

### 6.9 `drag.moveBy(ids, dx, dy, o?)`（给方向键用）
`dispatch(move_nodes{moves}, {groupId: o?.groupId})` 一次（不走手势），`dx`、`dy` 是世界像素（`W.06.09` 传 20 或 100），结果吸附到网格；`frozen` 的节点跳过。`W.06.09` 把连续的方向键传同一个 `groupId`，撤销一次回到原位（`P.09` K104）。

### 6.10 `pointer.last()`
根元素上的 `pointermove`（不论是否在拖动）记录最新屏幕坐标，`pointerleave` 时置 null；`last()` 返回它（`W.06.09` 的 `A` 快速添加、键盘粘贴的落点用，K104）。不额外加监听：与 `W.06.02` §6.8 指针柔光读同一次事件。

## 7. 不变量
- 同一时刻只有一个指针模式；松开、`lostpointercapture`、`Esc` 后回到 `idle`。
- 拖动期间对 store 的写入只有 `gesture.update`（`W.05` 节流）和每帧的 `setView`（自动平移时）；没有 React 提交。
- 拖动结束后 `ctx.live` 为空；节点最终位置都是整数且（未按 `Alt` 时）是 20 的倍数。
- 只读或 `frozen` 的节点从不进入拖动集合。
- 判断单击、双击、右键的目标总是用 `elementFromPoint`，不用 `event.target`。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `gesture` / `dispatch` 结果为 `blocked` | 节点回到原位；在指针旁显示 `Precheck.textKey` 一行说明 1.6 秒 |
| 结果为 `rejected`、`dropped`、`proposal` | 节点回到 store 的位置（`W.05` 已回滚或转提议）；提示由 `W.05` 负责 |
| 拖动中连接断开（`ui.net` 不再是 `online`） | 本次拖动照常结束并提交（`W.05` 会排队等重连）；之后的新拖动被只读拦住 |
| 放下的数据不是合法 JSON | 忽略，`console.warn` 一次 |
| 拖动中文档被整图替换（`change.full`） | 取消本次拖动（`gesture.cancel`），按新文档重画 |

## 9. 性能与资源
- 拖 1 个节点每帧脚本 ≤ 1ms，拖 20 个 ≤ 3ms（含相连连线和参考线）；框选每帧 ≤ 2ms（200 节点）。
- `pointermove` 只记录最后一次事件，每帧最多处理一次（`U.17-R3`）。
- 根元素上只有一组指针监听（委托），节点和连线元素上没有监听。

## 10. 验收标准
1. `U.13.01` 表里的每个操作结果正确（单击、`Shift` / `Ctrl` 加减选、框选、`Shift` 框选、单击空白、单击连线）。
2. 拖动 3 秒：服务端只收到 ≤ 13 次 `move_nodes`，操作历史 1 条，`Ctrl+Z` 一次回到原位（`W.05` §10 验收 1）；拖动中按 `Esc` 回到原位且不产生记录。
3. 拖到画布边缘：画布自动平移，节点跟着指针；按住 `Alt` 不吸附网格；与相邻节点左边对齐时出现参考线。
4. 单击子图节点的缩略图弹出预览；拖动后松手不弹出；双击子图节点任意位置进入（`U.13.06` 补充验收 1、2）。
5. 从节点库拖一个 Agent 到画布：在松开处出现并被选中；拖到一条兼容的连线上：节点插在中间，撤销一次恢复原样。
6. 拖动 200 节点图里的 20 个节点：60fps，React 提交 0 次。
7. 断开服务 3 秒后不能拖动节点，可以平移、选中（`U.14.05`）。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/interact/pointer.ts`、`select.ts`、`drag.ts`、`drop.ts`、`interact.css`（框选框、参考线、拖动中光标），以及 `pointer.test.ts`、`select.test.ts`、`drag.test.ts`、`drop.test.ts`；`web/tests/e2e/canvas-select-drag.spec.ts`。
- 不许碰的文件：`interact/link.ts`、`interact/edgeTools.ts`、`interact/keyboard.ts`（其他叶子）、`view/`、`render/`、`geom/`、`web/src/state/`、`web/src/ops/`、`web/src/panels/`。
- 函数签名：见 §4。
- 测试用例（jsdom；假 `ops`、假 `geom`、假 `raf`；`elementFromPoint` 用测试替身）：
  - `W0607-T1 分类`：按下控件 → `ignore`；中键 → `pan`；空格按住 + 主键 → `pan`；端口圆点 → `port`；节点 → `node`；连线热区 → `edge`；空白 → `blank`
  - `W0607-T2 单选与加选`：单击 a → `[a]`；`Shift` + 单击 b → `[a,b]`；`Mod` + 单击 a → `[b]`；单击空白 → `[]`
  - `W0607-T3 已选中再按下`：选中 a、b 后按下 a 拖动 → a、b 一起动
  - `W0607-T4 阈值`：移动 2px 松开 → 单击，不建手势；移动 4px → 拖动
  - `W0607-T5 吸附`：拖动位移 (33, 47) → 位置 (+40, +40)；按住 `Alt` → (+33, +47)，且仍为整数
  - `W0607-T6 手势`：假时钟拖 3 秒 → `gesture.update` 每帧调用、`end` 1 次；便签和节点一起拖 → 便签的 `update_note` 用同一个 `groupId` 一次 `dispatch`
  - `W0607-T7 Esc 取消`：拖动中 `pointer.cancel()` → `gesture.cancel` 1 次、`ctx.live` 为空、节点元素回到原 `transform`
  - `W0607-T8 frozen 与只读`：选中集合含 `frozen` 节点 → 它不动；`readonly` → 不进入拖动
  - `W0607-T9 回声不拉回`：拖动中收到 `change{groupId: 本手势}` → 被拖节点的 `transform` 不变
  - `W0607-T10 框选`：从 (0,0) 拖到 (300,200) → 相交的 3 个节点和 1 个便签有预览标记；松开 `ui.actions.select` 调用 1 次；`Shift` 框选与原选中合并
  - `W0607-T11 参考线`：两个节点左边相同 x → 1 条竖线；相差 1px → 0 条
  - `W0607-T12 自动平移`：指针停在距右边缘 6px → 每帧 `vp.panBy(-9, 0)`（(24−6)/24×12）
  - `W0607-T13 缩略图`：按下缩略图不移动松开 → `nest.peek`；移动 10px 松开 → 不预览
  - `W0607-T14 双击`：容器节点 → `nav.enter`；普通节点 → `inspect{focus:'label'}`；空白 → `quickAdd.open`；只读时空白双击不发
  - `W0607-T15 指针捕获后取目标`：捕获后 `click.target` 为根元素，`elementFromPoint` 返回缩略图 → 仍判定为点了缩略图（`W.01-R11` 的回归用例）
  - `W0607-T16 右键`：右键多选中的一个 → `menu.open{target:{kind:'selection'}}`；右键未选中的节点 → 先只选它，`target.kind='node'`
  - `W0607-T17 放下`：`drop` 带 `{type:'Agent'}` → 一次 `dispatch`，含 `add_node`（ID 来自 `deps.newId`、位置吸附）；放在兼容连线上 → `add_node`、`disconnect`、两条 `connect` 在同一批
  - `W0607-T18 addNode connectFrom`：从 `result` 端口快速添加 → 批里有 `connect` 到新节点第一个兼容输入
  - `W0607-T19 不能选中的画布`：`selectionKey=null` → 空白和节点上拖动都是平移，不调 `select`
  - `W0607-T20 端到端`：§10 验收 1–5、7（Playwright，`anydoor --fake-llm`）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R6、R25）；另：拖动中不调 `dispatch`（只用手势的 `update`）；不给节点、连线元素单独绑定监听；不用 `event.target` 判断单击、双击、右键的目标；拖动中不写 ui store；不在框选过程中写选中。
- 完成标志：`G.14` 全部条件；§10 七条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `drag.moveBy` 增加 `groupId`；新增 §6.10 `pointer.last()`；`selectionKey = null` 的例子改为子图库预览 | 第 7 棒；`P.09` K103、K104 |
| 2026-11-23 | `PRESET_MIME` 的 JSON 与 `add_node` 带 `meta`；`createDrop` 同时实现 `cmd.addNote`（屏幕坐标换世界坐标、吸附后一次 `add_note`，便签缺省尺寸 `L.noteW` × `L.noteH`） | 第 8 棒写 `W.07`；`P.09` K111、K114 |
