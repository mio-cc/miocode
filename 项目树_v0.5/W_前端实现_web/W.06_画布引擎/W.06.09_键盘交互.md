# W.06.09 键盘交互

| 项 | 内容 |
|---|---|
| 编号 | W.06.09 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设13（快捷键、键盘操作）；demo v0.5 `26_keys.js`（方向键 1 / 5 格、`Esc` 的顺序、`deleteSel`、`duplicate` 偏移 40、`group`、`autoLayout`）；`U.16` §3；`P.09` K104、K105 |
| 最后修改 | 2026-11-23 |

## 1. 职责
画布上全部键盘操作的处理函数：通过 `deps.keys`（`CanvasKeys`，`W.02.04` 的适配）注册 `W.06` §4.2 列出的每个 `CanvasShortcutId`；节点之间的键盘焦点（`Tab`）、键盘连线（`C`）、方向键移动、删除、全选、复制 / 粘贴 / 原地复制、打包 / 解散子图、撤销 / 重做后定位、`Esc` 的逐级处理；以及引擎命令 `cmd.exec`，让停靠栏、右键菜单、命令面板执行与快捷键相同的动作。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 快捷键表、按键规范化、分层分发、冲突检查、输入法组字、`hold` 补发、按键文字 | `W.02.04`（本文只注册处理函数） |
| 菜单、快速添加面板、命令面板、属性页的界面 | `W.07.11`、`W.07.03`（本文发 `menu.open`、`quickAdd.open`、`inspect`） |
| 进入 / 返回的转场、预览浮层、定位 | `W.06.13`（本文调 `nest.*`、发 `nav.*`） |
| 拖动、框选、拖线的取消细节 | `W.06.07`、`W.06.08`（本文只调 `pointer.cancel()`） |
| 方向键移动的提交 | `W.06.07` 的 `drag.moveBy` |
| 连线是否兼容、连上 | `W.06.08` 的 `LinkApi`（本文的键盘连线只调用它） |
| 撤销栈、撤销请求 | `W.05`（`undo`、`redo`） |
| 整理布局 | `W.06.11`（`cmd.tidy`） |
| 连线逐条的键盘编辑 | 列表视图（`U.16` §4，`W.07.03`）；画布上连线只有可访问名称（`P.09` K105） |
| 全局快捷键（`Mod+K`、`[`、`]`、`F`、急停等） | `W.02.02`、`W.07` |

## 3. 继承的上级约束
`W.06` §4.2（`CanvasShortcutId`、`CanvasKeys`、`cmd.exec`）、§4.4（`PointerApi`、`SelectionApi`、`DragApi`、`LinkApi`、`NestApi`）、§6.5、§6.6、`W.06-R3`、`R5`、`R8`、`R10`；`W.02.04` §4.1、§6.1、§6.2（第 4、5 步）、§7；`W.03.03` §6.2、§6.4（`setTool`）；`W.05` §6.9；`C.02.04`；`C.02.05`；`C.05.02`（`remove_nodes`、`disconnect`、`remove_notes`、`add_node`、`connect`、`add_note`、`group`、`ungroup`）；`C.05-R3`；`U.13.01`；`U.13.02` §1、§2；`U.13.03-R1`、`R6`、`R7`；`U.13.04`（全部，含 R1、R5、R6）；`U.13.05` §1；`U.13.06` §1、§4；`U.16` §2（R3、R5、R6）、§3、§4；`U.14.05`；`P.09` K104、K105。

## 4. 接口
```ts
// web/src/canvas/core/interact/keyboard.ts
export function createKeyboard(ctx: EngineCtx): {
  exec: EngineCommands['exec'];        // cmd.exec 转到这里
  dispose(): void;                     // 注销全部处理函数、移除 copy / paste 监听
};
export const MOVE_STEP = 1;            // 方向键：1 格（× L.grid）
export const MOVE_STEP_FAR = 5;        // Shift + 方向键：5 格（U.13.02 §1）
export const MOVE_BURST_MS = 500;      // 连续方向键合成一组的间隔
export const DUP_OFFSET = 40;          // 原地复制、在原处粘贴的偏移（demo duplicate）

// web/src/canvas/core/interact/focus.ts —— 键盘焦点与键盘连线
export function tabOrder(m: GraphModel, scope: Scope, pos: (id: Ulid) => Pt, grid: number): Ulid[];   // 纯函数：先按 x（取整到格）、再按 y、再按 ID
export function createFocus(ctx: EngineCtx): {
  focused(): Ulid | null;
  move(dir: 1 | -1): boolean;          // Tab / Shift+Tab；到头返回 false（焦点离开画布）
  focusNode(id: Ulid): void;           // 被裁剪的先 pin + reveal（W.06.05 §6.4）
  link: { active(): boolean; start(nodeId: Ulid): boolean; key(k: 'up' | 'down' | 'next' | 'prev' | 'enter' | 'escape'): boolean };
  announce(text: string): void;        // 写进 aria-live 区域（U.16-R5）
  dispose(): void;
};

// web/src/canvas/core/interact/clipboard.ts
export const CLIP_MARK = 'anydoor_clip';
export const CLIP_VERSION = 1;
export const CLIP_MAX_NODES = 500;     // 含子图里的节点
export const CLIP_MAX_BYTES = 2_000_000;
export type ClipNode = { node: Omit<NodeRec, 'scope' | 'isContainer' | 'origin'>; children?: ClipScope };   // 生成类型，不另定义协议结构
export type ClipScope = { nodes: ClipNode[]; edges: Edge[]; notes: Note[] };
export type ClipData = { [CLIP_MARK]: typeof CLIP_VERSION; graphId: Ulid; scope: Scope; box: Rect } & ClipScope;
export function serialize(m: GraphModel, scope: Scope, sel: CanvasSelection, box: (id: Ulid) => Rect): ClipData;   // 只带两端都在选中里的连线；容器节点带完整子图
export function parse(text: string): ClipData | null;                         // 不是本格式、版本不对、超过上限 → null
export function rekey(d: ClipData, newId: () => Ulid): { data: ClipData; map: Map<Ulid, Ulid> };   // 所有节点、连线、便签（含子图里的）换新 ID
export function toOps(d: ClipData, scope: Scope, at: Pt, known: (type: string) => boolean): { ops: OpDraft[]; skipped: number; ids: { nodes: Ulid[]; notes: Ulid[] } };
```
`cmd.exec(id, o?)`（`W.06` §4.2，K104）：`id` 为 `CanvasShortcutId`，`o.at` 为屏幕坐标（右键菜单打开处，粘贴、快速添加用），`o.target` 为菜单的目标；执行与按键相同的处理函数，返回是否执行了。

### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`deps.keys`、`deps.ui`、`deps.catalog`、`deps.newId`、`deps.t`、`sel`、`drag`、`pointer`（含 K104 新增的 `last()`）、`link`、`nest`、`vp`、`lod`、`geom`、`nodes`、`edges`、`emit`、`readonly()`、`doc().ops`、`scene.root`、`scene.screenUi`）；引擎命令 `fit`、`focusNodes`、`tidy`；`W.03.01` 的 `nodesIn`、`notesIn`、`edgesIn`；`W.05` 的 `OpsApi.dispatch`、`undo`、`redo`、`OpDraft`；`@/lib/protocol` 的 `OpKind`、`Node`、`Edge`、`Note`。

## 5. 数据结构
- 处理函数的注销函数列表 `offs: (() => void)[]`；连续方向键的 `burst: { groupId: Ulid; at: number } | null`；剪贴板的本实例副本 `memo: ClipData | null`（引擎跨会话复用，所以同一页面里跨图、跨会话粘贴可用；不放模块级变量，`W.06-R2`）。
- 键盘连线状态：`{ from: Ulid; stage: 'out' | 'target'; outIndex: number; targets: { ref: PortRef; check: Precheck }[]; ti: number } | null`。
- aria-live 区域：`div.hx-sr[aria-live=polite]`（视觉隐藏），建在 `scene.screenUi` 里。

### 5.1 剪贴板格式（`P.09` K105）
系统剪贴板里放 `text/plain` 的 JSON：
```json
{ "anydoor_clip": 1, "graphId": "01JG…", "scope": "root",
  "box": { "x": 120, "y": 80, "w": 520, "h": 240 },
  "nodes": [ { "node": { "id": "01JN…", "type": "Agent", "pos": { "x": 120, "y": 80 }, "label": "执行者", "params": {} },
               "children": { "nodes": [], "edges": [], "notes": [] } } ],
  "edges": [ { "id": "01JE…", "from": { "node": "01JN…", "port": "result" }, "to": { "node": "01JM…", "port": "in" } } ],
  "notes": [] }
```
- 字段是前端的 camelCase 形式（引擎只能用 `@/lib/protocol` 的类型，不能调用映射函数，`W.01-R6`）；只给本应用自己读，不是对外格式，所以不进 `schema/`。
- 节点去掉 `origin`（粘贴出来的节点由用户新建）；`lock` 改为 `none`（副本不带锁）。
- 只带两端都在选中里的连线；容器节点带完整子图（递归，按 `ScopeRec` 重建）。
- 上限：节点总数（含子图）≤ 500、JSON ≤ 2MB；超过时复制失败并提示"选中的内容太多，不能复制"。

## 6. 行为

### 6.1 注册与生效条件
- 只有 `deps.keys` 不为 null（主画布）时注册；`dispose` 注销全部。每个处理函数返回 true 表示已处理（`W.02.04` §4.2）。
- 生效条件 `when`：已绑定文档，且焦点在画布根元素之内或在 `document.body` 上（没有其他元素持有焦点）。`Tab` / `Shift+Tab`、`C`、`Shift+F10` 只在焦点在画布之内时生效（否则会抢走页面的 `Tab` 导航）。输入框里不生效由 `W.02.04` §6.1 第 ⑤ 层保证（`U.13.04-R1`）。
- 只读（`W.06` §6.6）时，编辑类动作（删除、粘贴、原地复制、打包、解散、方向键移动、键盘连线、快速添加、整理布局、撤销、重做）不执行：返回 true 并在画布上显示一行"现在不能编辑"（离线时"已断开，恢复后可以编辑"）1.6 秒；导航、选择、视图、复制仍可用。

### 6.2 各快捷键
| id | 键 | 处理 |
|---|---|---|
| `tool.select` / `tool.pan` | `V` / `H` | `ui.actions.setTool('select' / 'pan')` |
| `tool.pan.hold` | 按住 `Space` | `down` → `pointer.setTempPan(true)`；`up` → `false`（窗口失焦的补发由 `W.02.04` §6.2 第 4 步保证；`W.03.03` §6.4：不改 `tool`） |
| `node.quickAdd` | `A` | `emit('quickAdd.open', {at, world: toWorld(at)})`；`at` = `pointer.last()`（指针在画布里），否则可见区域中心（`U.13.02` §3） |
| `sel.delete` | `Delete`、`Backspace` | §6.4 |
| `sel.all` | `Mod+A` | 选中当前层全部节点和便签（`U.13.01`；便签一起选中，方便整体移动和删除，K105） |
| `sel.duplicate` | `Mod+D` | §6.5（原地复制，不动剪贴板） |
| `clip.copy` / `clip.paste` | `Mod+C` / `Mod+V` | §6.5 |
| `group` / `ungroup` | `Mod+G` / `Mod+Shift+G` | §6.6 |
| `undo` / `redo` | `Mod+Z` / `Mod+Shift+Z`、`Mod+Y` | `ops.undo()` / `redo()`；结果 `done` → `nest.locate(touched[0])`（`U.13.03-R6`、`R7`，`W.05` §6.9 第 4 步）；`nothing` → 画布上显示"没有可撤销的操作"1.6 秒；`failed` 的提示由 `W.05` 负责。按住自动重复照常（`W.02.04` §6.2 第 5 步） |
| `view.fit` / `view.focusSel` | `1` / `2` | `cmd.fit()`；`cmd.focusNodes(选中的节点)`，没有选中时不处理（返回 false） |
| `layout.tidy` | `L` | `cmd.tidy(选中的节点)`（≥ 2 个只整理它们，`W.06.11`） |
| `node.rename` | `F2` | 恰好选中一个节点 → `emit('inspect', {nodeId, focus:'label'})` |
| `sel.move` / `sel.moveFar` | 方向键 / `Shift+`方向键 | 键盘连线中 → §6.7；否则 §6.3 |
| `focus.nextNode` / `focus.prevNode` | `Tab` / `Shift+Tab` | 键盘连线中 → §6.7；否则 `focus.move(±1)`（§6.8），到头返回 false |
| `link.keyboard` | `C` | 有焦点节点（或恰好选中一个节点）→ `focus.link.start(id)`（§6.7） |
| `menu.context` | `Shift+F10`、`ContextMenu` | 目标：焦点节点（在多选里 → `selection`，否则 `node`）；没有焦点节点但有选中 → `selection`；否则 `canvas`。`at` = 目标包围盒右上角的屏幕坐标（`canvas` 时为可见区域中心）；`emit('menu.open', {at, target})`（`U.13.05` §1） |
| `nest.peek` | `P` | 恰好选中一个容器节点 → `nest.peek(id)`（`U.13.06` §1） |
| `nest.enter` | `Enter` | 键盘连线中 → §6.7；预览打开时由 `W.06.13` 的 peek 层先处理；焦点节点或唯一选中节点：容器 → `emit('nav.enter', {containerId})`；其他 → `emit('inspect', {nodeId, focus:'first'})`（`U.16` §3） |
| `nest.up` | `Alt+↑` | 不在根图 → `emit('nav.leave', {to: 上一层})`（不先取消选中，`U.13.04` §3） |
| `canvas.escape` | `Esc` | §6.9 |

### 6.3 方向键移动（`U.13.02` §1）
1. 移动集合 = 选中的节点（去掉 `frozen` 的）；没有选中但有焦点节点 → 焦点节点。便签用鼠标拖动，方向键不动便签。集合为空 → 返回 false（交给浏览器）。
2. 步长 = `MOVE_STEP` 或 `MOVE_STEP_FAR` × `L.grid`（20 或 100 世界像素）。
3. 连续按（含按住自动重复）：距上一次 < `MOVE_BURST_MS` 时沿用同一个 `groupId`（第一次按时 `deps.newId()`），调 `drag.moveBy(ids, dx, dy, {groupId})`（K104）——一次连续移动撤销一次回到原位（`C.05-R3`）。
4. 移动后主选中节点不在可见区域内 → `vp.reveal(geom.box(id))`。

### 6.4 删除（`Delete`、`Backspace`）
1. 集合：选中的节点（去掉 `frozen` 的）、选中的连线（去掉会随节点一起删掉的）、选中的便签。全空 → 返回 false。
2. 一次 `dispatch([remove_nodes{ids}, disconnect{ids}, remove_notes{ids}])`（空的那项不放），同一 `groupId`（`C.05-R3`）。
3. 结果 `applied` / `merged`：`sel.set` 为空；提示"已删除 N 个节点"（只删连线 / 便签时相应改写），带"撤销"（`ops.undo()`，`done` 后 `nest.locate`）。有 `frozen` 被跳过时提示里加"N 个冻结的节点没有删除"。
4. 可以删除子图端口节点；删除后子图缺少入口 / 出口时由服务端校验给出 V11（`C.02.04-R2`）。

### 6.5 复制、粘贴、原地复制（`U.13.04` §2：跨层、跨图可用，K105）
- **复制**（`Mod+C`）：选中为空 → 返回 false（浏览器照常复制页面上选中的文字）。否则 `memo = serialize(…)`；焦点在画布里时返回 false，让浏览器在画布根元素上触发原生 `copy` 事件，`clipboard.ts` 在根元素的 `copy` 监听里 `clipboardData.setData('text/plain', JSON)` 并 `preventDefault`（不需要剪贴板权限）。焦点不在画布里（`body`）时只写 `memo`，返回 true。提示"已复制 N 个节点"。
- **粘贴**（`Mod+V`）：焦点在画布里时返回 false，原生 `paste` 事件在根元素上触发，`parse(clipboardData.getData('text/plain'))`：是本格式 → `preventDefault` 并粘贴；不是 → 不处理（什么也不发生）。焦点不在画布里时用 `memo`，返回 true。`cmd.exec('clip.paste', {at})`（右键菜单）没有原生事件可用：先试 `navigator.clipboard.readText()`，失败或拒绝授权时用 `memo`。
- **放在哪**：`at`（右键菜单位置，或键盘粘贴时 `pointer.last()` 在画布里）→ 内容包围盒的左上角放到 `at` 的世界坐标；否则来源就是本图本层、且原内容在可见区域内 → 原位置偏移 `DUP_OFFSET`；否则放在可见区域中心。所有坐标 `geom.snap`。
- **怎么提交**：`rekey`（全部换新 ID，`SubgraphRef.overrides` 里以旧节点 ID 为键的项一起换）→ `toOps`：每个顶层节点一条 `add_node{scope, node}`（容器节点带 `children`）、两端都在里面的连线 `connect{edge}`、便签 `add_note{scope, note}`；目录里不存在的节点类型跳过（连到它的连线一起去掉），提示"N 个节点的类型在这里不可用，已跳过"。一次 `dispatch`；成功后选中粘贴出来的节点和便签。
- **原地复制**（`Mod+D`）：`serialize` 当前选中 → 偏移 `DUP_OFFSET` 粘贴到本层；不写 `memo`、不碰系统剪贴板（demo `duplicate`）。
- 跨图粘贴时参数原样带过去（连接、角色卡按名字引用，目标图里不存在时由校验提示）；剪贴板里的内容只是数据，粘贴同样经过 `W.05` 的预检和服务端授权（INV-08、INV-09）。

### 6.6 打包与解散（`C.05.02` `group`、`ungroup`）
- `Mod+G`：选中的节点 ≥ 2 个且都在当前层 → `dispatch(group{scope, node_ids, new_id: deps.newId(), label: t('canvas.group.label')})`；成功后选中新节点（`W.05` §5.2：`group` 等服务端结果，不乐观）。不足 2 个 → 提示"先选中至少 2 个节点"。
- `Mod+Shift+G`：选中的容器节点（有 `children` 的）各一条 `ungroup{id}`，一次 `dispatch`；没有容器节点 → 返回 false。

### 6.7 键盘连线（`C`，`U.16` §3）
1. `start(id)`：节点没有输出端口或画布只读 → 返回 false。进入第一阶段：`outIndex = 0`，该端口加 `is-kbd`（与 `W.06.08` 的 `is-src` 同样式），`announce("选择输出端口：{名称} · {数据类型}")`。
2. 第一阶段：`↑` / `↓`（`sel.move` 处理函数转来）在输出端口间循环；`Enter` → 第二阶段：`targets = link.targets(from).filter(t => t.check.ok)`；为空 → `announce("没有能接的端口")` 并结束键盘连线。
3. 第二阶段：`Tab` / `Shift+Tab` 在目标里前后循环（顺序是 `W.06.08` §6.5 的从左到右、从上到下），当前目标：`edges.preview(源端口, 目标端口, 'snap', 类别)`、目标节点不在可见区域内时 `vp.reveal`，`announce("连到 {节点} 的 {端口}（{i} / {n}）")`；`check.replaces` 有值时加"将替换原连线"。
4. `Enter` → `link.connect(from, to)`；结果 `applied` / `merged` → `announce("已连接")`；结束键盘连线。
5. `Esc` → 取消：去掉 `is-kbd`、`edges.preview(null)`，`announce("已取消连线")`。换层、换文档、图被整图替换时同样取消。

### 6.8 键盘焦点（`Tab`，`U.13.01`、`U.16` §3）
- 顺序 `tabOrder`：当前层节点按 `x`（取整到 `L.grid`）、再按 `y`、再按 ID 排（从左到右、从上到下）。从画布根元素按 `Tab` → 第一个节点；最后一个再按 `Tab` → 返回 false，焦点按浏览器默认离开画布；`Shift+Tab` 反之。
- `focusNode(id)`：`lod.pin([id])`（之前钉住的释放）；不在可见区域 → `vp.reveal(geom.box(id))`；`nodes.el(id).focus({preventScroll:true})`；`selectionKey ≠ null` 时 `sel.set({nodeIds:[id]})`（"移动焦点并选中"）。焦点环只在键盘操作时显示（`:focus-visible`，`W.06.03` 的 CSS，`U.10.05`）。
- 节点的可访问名称由 `W.06.03` 的 `aria-label` 提供（`W.06-R10`）；焦点所在节点被删除 → 焦点回到画布根元素。
- 用鼠标点了别处（`W.06.07` 让根元素获得焦点）→ 焦点节点清空、释放 `pin`。

### 6.9 `Esc` 的顺序（`U.13.04` §3、`U.13.01`）
按顺序执行第一个成立的，返回 true：
1. 键盘连线中 → 取消（§6.7 第 5 步）。
2. `pointer.cancel()` 为 true（拖动、框选、拖线中，`W.06.07` §6.3 第 8 步）。
3. `nest.closePeek()` 为 true（预览打开；正常情况下 `W.02.04` 的 peek 层已先处理）。
4. 有选中 → `sel.set` 为空。
5. 不在根图 → `emit('nav.leave', {to: 上一层})`。
都不成立 → 返回 false。菜单、下拉等弹层的 `Esc` 由 `W.02.04` 第 ② 层先处理（`W.02.04` §10 验收 4）。

## 7. 不变量
- 本模块不直接监听 `keydown` / `keyup`（`W.02.04` §7）；只在画布根元素上监听 `copy`、`paste`。
- 每个编辑类快捷键最多一次 `dispatch`；连续方向键共用一个 `groupId`。
- 只读时没有任何快捷键能产生 `dispatch`。
- 键盘连线不自己判断兼容，只用 `LinkApi.targets` 的预检结果。
- 不注册、不提供任何解除急停的快捷键（`W-R6`）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `dispatch` 结果为 `blocked` | 在画布上显示 `Precheck.textKey` 的说明 1.6 秒 |
| `rejected` / `dropped` / `proposal` | 提示由 `W.05` 负责；本文不再提示 |
| 剪贴板内容不是本格式、版本不对 | 什么也不做 |
| 剪贴板内容超过上限 | 复制时提示"选中的内容太多，不能复制"；粘贴时 `parse` 返回 null |
| `navigator.clipboard` 不可用或拒绝授权 | 用 `memo`；`memo` 也为空时提示"剪贴板里没有可以粘贴的节点" |
| 撤销结果 `nothing` | 画布上显示"没有可撤销的操作"1.6 秒 |
| 处理函数抛错 | `W.02.04` §8 捕获；本文的状态（键盘连线、方向键分组）重置 |

## 9. 性能与资源
- 每个处理函数 ≤ 1ms（不含 `dispatch` 之后的渲染）；`tabOrder` 200 节点 ≤ 0.3ms。
- 复制 / 粘贴 100 个节点（含子图）：序列化 ≤ 5ms，粘贴到画面更新 ≤ 30ms。
- 按住方向键（每秒约 30 次重复）：每次一个乐观 `dispatch`，保持 60fps。

## 10. 验收标准
1. `U.13.04` §2、§3 的每个画布快捷键在画布有焦点时可用（Playwright 逐条按键，与 `W.02.04` §10 验收 1 联合）；光标在属性页输入框里按 `Delete`、`A`、方向键不影响画布。
2. 方向键移动 1 格、`Shift` + 方向键 5 格；按住 → 连续移动，松开后 `Ctrl+Z` 一次回到原位。
3. 选中 3 个节点（含 1 个容器）`Ctrl+C`，进入另一层 `Ctrl+V`：粘贴出 3 个节点和它们之间的连线，容器节点的子图完整，ID 全部是新的；到另一个会话的图里再粘贴同样可用（`U.13.04` §2"跨层、跨图可用"）。
4. `Ctrl+D` 在原处偏移 40 复制一份并选中副本；`Delete` 删除选中，`Ctrl+Z` 恢复并定位。
5. 在子图里 `Ctrl+Z` 撤销了上一层的修改：画布回到上一层并定位到改动处（`U.13.03-R7`）。
6. 只用键盘：`Tab` 依次聚焦节点（被裁剪的会先移进视口）；`C` → `↓` 选输出端口 → `Enter` → `Tab` 选目标 → `Enter` 建立连线；`Esc` 取消；读屏能听到每一步（`U.16` §3）。
7. `Esc` 依次：取消拖动 → 关预览 → 取消选中 → 返回上一层；`Alt+↑` 有选中时也直接返回（`U.13.04` §3）。
8. 断开服务后按 `Delete`、`Ctrl+V`：不提交，画布显示"已断开，恢复后可以编辑"；`Tab`、`1`、`Ctrl+C` 照常。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/interact/keyboard.ts`、`focus.ts`、`clipboard.ts`、`keyboard.css`（`is-kbd`、视觉隐藏的 aria-live 区域、画布上的一行提示），以及 `keyboard.test.ts`、`focus.test.ts`、`clipboard.test.ts`；`web/tests/e2e/canvas-keyboard.spec.ts`。
- 不许碰的文件：`web/src/shell/keys/`（注册中心在 `W.02.04`；`overlay` 适配在 `W.06.01` 的 `adapters.ts`）、`interact/pointer.ts`、`select.ts`、`drag.ts`、`link.ts`、`render/`、`nest/`、`web/src/state/`、`web/src/ops/`、`schema/builtin/shortcuts.yaml`。
- 函数签名：见 §4。
- 测试用例（jsdom；假 `keys` 记录注册并可手动触发；假 `ops`；假剪贴板事件）：
  - `W0609-T1 注册`：`deps.keys` 非空时 `W.06` §4.2 的 27 个 id 各注册 1 次；`dispose` 后 0 个；`deps.keys=null` 时不注册
  - `W0609-T2 生效条件`：焦点在属性页按钮上时 `Delete` 处理函数的 `when` 为假；焦点在 `body` 时为真；`Tab` 只在焦点在画布里时为真
  - `W0609-T3 方向键分组`：连按 3 次 → `drag.moveBy` 3 次且 `groupId` 相同；间隔 600ms 再按 → 新 `groupId`；`Shift` → 100 世界像素
  - `W0609-T4 删除`：选中 2 节点 + 1 条与它们无关的连线 + 1 便签 → 一次 `dispatch`，3 条 Op；`frozen` 节点不在 `remove_nodes` 里且提示 1 次
  - `W0609-T5 全选`：`Mod+A` → `sel.set` 含当前层全部节点和便签，不含连线
  - `W0609-T6 序列化`：选中 a、b（a→b、a→c 两条连线，c 未选中）→ 只带 a→b；容器节点带子图；去掉 `origin`、`lock='none'`
  - `W0609-T7 rekey`：粘贴后的节点、连线、便签、子图内部元素的 ID 都来自 `deps.newId`；连线端点、`overrides` 键已替换
  - `W0609-T8 粘贴位置`：`at=(500,300)`、`k=1`、原点 0 → 包围盒左上角为 (500,300) 吸附后的值；同层且可见 → 偏移 40；其他 → 可见区域中心
  - `W0609-T9 未知类型`：剪贴板里 1 个未知类型节点 → 被跳过、连到它的连线去掉、提示 1 次
  - `W0609-T10 原生事件`：焦点在画布里 `Mod+C` 处理函数返回 false；随后的 `copy` 事件里 `setData('text/plain', …)` 1 次且 `preventDefault`；`paste` 事件里非本格式文本 → 不 `dispatch`
  - `W0609-T11 上限`：501 个节点 → 复制失败提示；`parse` 超过 2MB → null
  - `W0609-T12 撤销定位`：`undo` 返回 `done{touched:[{scope:X, nodes:[a]}]}` → `nest.locate` 收到第一项；`nothing` → 画布提示
  - `W0609-T13 Tab 顺序`：节点 (0,0)、(0,200)、(300,0) → 顺序 1、2、3；最后一个再 `Tab` → 返回 false；被裁剪的节点 → 先 `pin`、`reveal` 再 `focus`
  - `W0609-T14 键盘连线`：`C` → `↓` → `Enter` → `Tab` ×2 → `Enter` → `link.connect` 收到第 2 个兼容目标；每步 `announce` 1 次；`Esc` → 无 `connect`、预览清掉
  - `W0609-T15 Esc 顺序`：依次构造"拖动中 / 预览打开 / 有选中 / 在子图里"四种情况 → 分别调 `pointer.cancel`、`closePeek`、`sel.set([])`、`nav.leave`
  - `W0609-T16 只读`：`readonly()=true` 时 `Delete`、`Mod+V`、方向键、`C`、`Mod+Z` 不 `dispatch`、不调 `undo`，返回 true 并显示提示；`Tab`、`1`、`Mod+C` 照常
  - `W0609-T17 exec`：`cmd.exec('clip.paste', {at})` → 先 `navigator.clipboard.readText`，拒绝时用 `memo`；`cmd.exec('layout.tidy')` → `cmd.tidy` 1 次
  - `W0609-T18 打包`：选中 1 个按 `Mod+G` → 提示、不 `dispatch`；选中 3 个 → `group` 的 `new_id` 来自 `deps.newId`
  - `W0609-T19 端到端`：§10 验收 1–8（Playwright，`anydoor --fake-llm`）
- 允许使用的依赖：无运行时依赖（`navigator.clipboard` 为浏览器 API）；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R6、R24、R25、R26）；另：不在 `shell/keys/` 以外 `addEventListener('keydown')`；不在页面加载时读取剪贴板；剪贴板里的内容不经预检不提交；不把剪贴板数据放进 `innerHTML`；不提供解除急停的快捷键。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。
