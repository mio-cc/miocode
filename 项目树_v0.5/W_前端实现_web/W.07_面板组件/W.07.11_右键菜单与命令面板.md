# W.07.11 右键菜单与命令面板

| 项 | 内容 |
|---|---|
| 编号 | W.07.11 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设13；demo v0.5（v0.5.11）`26_keys.js`（命令面板、速查）、`37_nodes.js`（快速添加）；`U.13.05`、`U.11` §2（菜单、命令面板）、`U.13.04`、`U.22-R9`；`W.06.09` §6.2；`P.09` K104、K111、K114 |
| 最后修改 | 2026-11-23 |

## 1. 职责
四个弹层：画布右键菜单（按节点 / 多选 / 连线 / 空白 / 端口给出不同菜单，键盘可完整操作，不可用项写原因）、快速添加面板（双击空白、`A`、拖线到空白、连线中点"+"、停靠栏"添加"）、命令面板（`Ctrl+K`：命令、节点、节点类型、会话、子图库、设置项一处搜索）、快捷键速查（`?`）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 判断右键点到了什么、`Shift+F10` 的目标、弹层的屏幕坐标 | `W.06.07`、`W.06.09`（发 `menu.open` / `quickAdd.open`） |
| 菜单项执行的画布动作 | `W.06.09`（经 `cmd.exec`，与快捷键同一个处理函数，`P.09` K104） |
| 新节点放在哪、连到哪个端口、插入连线中间 | `W.06.07`（`cmd.addNode` 的 `at` / `connectFrom` / `insertInto`） |
| 菜单、面板控件本身 | `W.08.04` `Menu`、`Overlay`；`W.08.03` `Picker` |
| 快捷键表、按键文字 | `W.02.04`（`keys.list()`、`keys.label()`） |
| 设置页、中心窗口 | `W.09.02`、`W.09.04` |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`；`W.02` §6（命令面板动态加载）；`W.02.04` §4.1（`palette.open`、`help.keys`）、§6.1 ①②、§6.4；`W.03.01`（`nodesIn`、`crumbs`、`structureTree`）；`W.03` §4.5 目录 store（`presets`、`defs`）；`W.05` §4.1（`dispatch`、`fits`、`check`）；`W.06` §4.2（`menu.open`、`quickAdd.open`、`exec`、`addNode`）、`W.06.07` §6、`W.06.08` §2、`W.06.09` §6.2；`U.11` §2；`U.13.05`（全部，R1–R3）；`U.13.04` §1–§4；`U.10.05` §2（搜索结果高亮同"看这里"）；`U.16-R3`、`R6`；`U.22-R7`、`R9`；`U.23-R5`；`P.09` K104、K111、K114。

## 4. 接口

### 4.1 组件
```tsx
// 都挂在应用根（W.07 §6.1）
export function ContextMenu(): JSX.Element | null;        // 订阅 menu.open
export function QuickAdd(): JSX.Element | null;           // 订阅 quickAdd.open
export const CommandPalette: React.LazyExoticComponent<() => JSX.Element>;   // React.lazy(() => import('./CommandPaletteImpl'))（W.02 §6）
export function KeysHelp(): JSX.Element | null;
```
```ts
// web/src/panels/menu/menuItems.ts —— 纯函数：目标 → 菜单项（U.13.05 §1）
export type MenuCtx = { model: GraphModel; scope: Scope; sel: CanvasSelection | null; defs: CatalogState['defs']; block: EditBlock; label: (id: ShortcutId) => string; t: T };
export function itemsFor(target: HitTarget, c: MenuCtx): MenuItem[];   // MenuItem 是 W.08.04 Menu 的项类型；每项带 action
export type MenuAction =
  | { kind: 'exec'; id: CanvasShortcutId }                               // cmd.exec(id, {at, target})
  | { kind: 'ops'; ops: readonly OpDraft[] }                             // 一次 dispatch
  | { kind: 'askAi'; mode: 'explain' | 'optimize' }                      // 预填对话框（U.13.05-R3）
  | { kind: 'addNote' };                                                 // cmd.addNote({at})
export function alignOps(nodes: readonly NodeRec[], mode: 'left' | 'right' | 'top' | 'hcenter' | 'distribute'): OpDraft[];   // 一条 move_nodes

// web/src/panels/menu/paletteSources.ts
export type PaletteGroup = 'command' | 'node' | 'nodeType' | 'session' | 'library' | 'setting';
export type PaletteItem = { id: string; group: PaletteGroup; label: string; sub?: string; icon?: string; shortcut?: string; run(): void | Promise<void> };
export function parseQuery(q: string): { scope: PaletteGroup | null; text: string };   // '>' 只搜命令、'@' 只搜节点、'#' 只搜会话（U.13.05 §2）
export const COMMANDS: readonly { id: string; labelKey: string; shortcut?: ShortcutId; icon: string; when?: (s: AppSnapshot) => boolean; run: (a: AppActionsBag) => void }[];
export const SETTING_ITEMS: readonly { section: CenterSection; item: string; labelKey: string }[];   // U.21 §1 的分区与子项；W.09.02 定稿时保持 item 一致
export function rank(items: readonly PaletteItem[], text: string): PaletteItem[];   // 前缀 > 词首 > 包含；同分按最近使用
```

### 4.2 本文需要、由上层新增的（`P.09` K111、K114）
- `W.06` §4.2 `EngineCommands` 新增 `addNote(o: { at: Pt }): Promise<DispatchResult>`（`at` 为屏幕坐标，引擎换成世界坐标、吸附网格后 `dispatch(add_note)`；实现归 `W.06.07`）——右键空白处"添加便签"没有对应的快捷键，不能经 `exec`。
- `W.02.02` 导出 `useCanvasAreaRect(): () => DOMRect | null`（`CanvasArea` 元素的页面矩形）：引擎事件给的 `at` 是相对画布根元素的屏幕坐标，弹层要换成页面坐标 = 矩形左上角 + `at`。
- `W.03` §4.5 `CatalogActions.searchLibrary(q: string): Promise<readonly LibraryItem[]>`（`GET /library?q=`，`B.04.06`）。

### 4.3 依赖
`W.03` §4.2 的 hook；`W.03.01` 的 `nodesIn`、`crumbs`、`structureTree`；`W.03.03` 的 `selectionOf`、`prefillComposer`、`openCenter`、`setLs`、`setRs`、`toggleFocus`、`select`；`W.03` §4.5 目录 store；`W.03.05` 的会话列表、`create`；`W.03.04` 的 `start`；`W.05` 的 `useOps()`；`W.06.01` 的 `useCanvasCommands`、`useCanvasEvent`；`W.02.01` 的 `useNav`；`W.02.03` 的 `themeController`、`THEMES`；`W.02.04` 的 `keys`；`W.07` §4.2 的 `useLocate`、`useShortcut`、`useEditBlock`；`W.08` 的 `Menu`、`Overlay`、`Picker`、`SearchInput`、`Kbd`、`Icon`；`W.10` 的 `useT`。

## 5. 数据结构
- 本文私有：`MenuCtx`、`MenuAction`、`PaletteItem`、`PaletteGroup`（§4.1）。
- 组件内部：当前打开的弹层与参数、命令面板的输入和每组是否"显示更多"、最近执行过的命令 ID（只在内存，本次打开期间）。
- 快速添加的"最近"与节点库共用 `hx:lib-recent`（`W.07.02` §4.2）。

## 6. 行为

### 6.1 右键菜单（`U.13.05` §1、R1、R2）
- `menu.open{at, target}` → `Menu`（宽 220、项高 28，`W.08.04`），位置 = 画布区域矩形 + `at`，放不下时 `Menu` 自己翻转。项目按目标：
  | 目标 | 菜单项（‖ 为分组线） |
  |---|---|
  | 节点 | 进入子图 ↵（容器节点，`exec('nest.enter')`）· 预览 P（容器节点，`exec('nest.peek')`）· 重命名 F2（`exec('node.rename')`）· 复制 Ctrl+D（`exec('sel.duplicate')`）‖ 打包为子图 Ctrl+G（`exec('group')`）· 解散子图（容器节点，`exec('ungroup')`）‖ 锁定 ▸（只有我能改 / 谁都不能改 / 解锁：`ops set_lock{user / frozen / none}`）· 标记色 ▸（6 种 + 无：`ops set_node_ui{color}`）‖ 让 AI 解释这个节点 · 让 AI 优化这个节点（`askAi`）‖ 删除 Delete（`exec('sel.delete')`，`danger`） |
  | 多选 | 打包为子图 · 对齐 ▸（左 / 右 / 顶 / 水平居中 / 等距：`alignOps` → 一条 `move_nodes`）· 复制 · 删除 |
  | 连线 | 插入节点（`exec('node.quickAdd', {target})` → 引擎发带 `insert` 的 `quickAdd.open`）· 删除（`ops disconnect`） |
  | 空白 | 添加节点 A（`exec('node.quickAdd', {at})`）· 粘贴 Ctrl+V（`exec('clip.paste', {at})`）· 添加便签（`addNote`）· 整理布局 L（`exec('layout.tidy')`）· 适应画布 1（`exec('view.fit')`） |
  | 端口 | 断开全部连线（`ops`：这个端口上全部连线的一条 `disconnect`）· 提升到外层（只在子图里、端口是参数接线端口时可用：`ops promote_param`；否则置灰并说明"只有子图里节点的参数端口可以提升到外层"） |
- 快捷键文字由 `keys.label(id)` 给出（`U.13.05-R1`）。
- 不可用的项不隐藏：置灰 + `disabledReason`（`U.13.05-R2`）：编辑被阻止（断开、只读）→ `useEditBlock` 的原因；节点 `frozen` → "已冻结，先解锁"；打包少于 2 个 → "先选中至少 2 个节点"；解散非容器 → 不出现（只对容器节点列出）。
- "让 AI 解释 / 优化这个节点"（`U.13.05-R3`）：确保目标节点在选中里（`ui.select`），`ui.prefillComposer({text: t('menu.ai.explain', {label}) / t('menu.ai.optimize', {label}), attachSelection: true})`；不直接发送。
- 对齐（`alignOps`）：宽度取 `ui.width`，没有时按 `LAYOUT.compact_types` 取 `node_w_sm` / `node_w`（`@/lib/protocol` 的生成常量，`W.06.10` §5.1）；左 / 右 / 顶对齐到最外侧那个；水平居中对齐到包围盒中心线；等距按 `x` 排序后均分间距；坐标吸附到 `LAYOUT.grid`；跳过 `frozen` 的节点。
- 执行完关闭菜单，焦点回到画布根元素（`Menu` 的 `restoreFocus`，`U.16-R6`）。`Esc` 只关菜单（`W.02.04` §10 验收 4）。

### 6.2 快速添加面板（`QuickAdd`）
- `quickAdd.open{at, world, from?, insert?}` → `Popover`（宽 360，`shadow-pop`，层级 `--hx-z-popover`）锚在 `at`；顶部 `SearchInput` 自动获得焦点；下面 `Picker`。
- 候选：`catalog.presets` 中启用的条目（未启用的不列出）。
  - 带 `from`（从输出端口拖线到空白，`W.06.08`）：只列有能接上的输入端口的条目——对候选的原子节点类型取 `catalog.nodeDef(atom)`（最多 13 个，缓存），任一输入端口满足 `ops.fits(from.type, port.type)` 才保留；每条第二行写"接到「{端口名}」"（`U.22-R9` 的同一规则）。
  - 带 `insert`（连线中点"+"或右键连线"插入节点"）：同时要求有能接上游类型的输入和能接下游类型的输出。
  - 没有搜索词：分两组"最近"（`hx:lib-recent`，最多 5 个）和"常用"（智能体、工具 › 内置下的前 8 个）；有搜索词：按名称、路径、原子类型匹配（与 `W.07.02` 同一个 `searchLocal`），最多 50 条，每条第二行是分类路径。
- 选中（Enter 或点击）→ `cmd.addNode({type: atom, params, label, meta: {preset: key}}, {at: world, connectFrom: from?.port, insertInto: insert})`；结果 `applied` / `merged` / `proposal` → 记入最近、关闭；`blocked` → 面板里一行红字写原因，不关闭。
- `Esc`、点外面关闭；关闭后焦点回到画布。

### 6.3 命令面板（`CommandPalette`，`U.13.05` §2、`U.11` §2）
- `useShortcut('palette.open')`（输入框里也有效）切换开关；首次打开时动态加载组件（`React.lazy`，加载中 ≤ 300ms 不显示任何东西）。模态（`Overlay layer='modal'`，焦点困在里面、关闭后回到原来的元素），宽 560，居中偏上。
- 一个输入框；`parseQuery`：`>` 开头只搜命令、`@` 开头只搜节点、`#` 开头只搜会话。
- 结果按组显示，每组最多 5 条，组底部"显示更多"（展开到 20 条）：
  | 组 | 来源 | 选中后 |
  |---|---|---|
  | 命令 | `COMMANDS`：运行、急停、新建会话、切换主题（每个配色一条 + 浅色 / 深色 / 跟随系统）、打开中心窗口的四个分区、左侧栏、右侧栏属性 / 对话 / 监控、专注模式、适应画布、整理布局、撤销、重做、列表视图、快捷键速查；右侧显示快捷键 | 执行（画布动作经 `cmd.exec`，其余调对应 action）；"急停"→ `session.triggerEstop()`；命令里没有"解除急停"（`W-R6`） |
  | 节点 | 当前图所有层的节点（`model.nodes`），第二行是所在层路径（`crumbs`） | `useLocate({scope, nodes: [id], look: 'look'})`：进入那一层并高亮（`U.10.05` §2"搜索结果"） |
  | 节点类型 | `catalog.presets` 启用的条目 | `cmd.addNode(…, {at: 'center'})`（`U.13.05` §2"添加到画布中心"） |
  | 会话 | 会话列表 | `useNav().switchSession(id)` |
  | 子图库 | `catalog.searchLibrary(q)`（有搜索词且 ≥ 1 个字时，200ms 防抖） | 在画布中心添加一个子图引用节点：`cmd.addNode({type: '子图引用', params: {ref: name + '@' + version}}, {at: 'center'})` |
  | 设置项 | `SETTING_ITEMS` | `ui.openCenter(section, item)` |
- 排序（`rank`）：前缀匹配 > 词首匹配 > 包含；同分时本次打开期间用过的命令在前。
- 键盘：`↑` / `↓` 在所有组的结果里连续移动、`Enter` 执行、`Esc` 关闭；执行后关闭。模态期间其他快捷键不生效（`W.02.04` §6.1 ①），急停 `Mod+.` 例外。
- 空结果："没有找到「{q}」"。

### 6.4 快捷键速查（`KeysHelp`，`help.keys` = `?`）
- `useShortcut('help.keys')` 打开；模态，宽 560；内容 `keys.list()` 按 `group` 分四组（全局、画布、嵌套导航、对话框，与 `U.13.04` 同序），每行：说明 + `Kbd`（`keys.label`，macOS 显示 ⌘）。顶部一个筛选框。只读；"在设置里查看"→ `ui.openCenter('settings', 'keys')`。

## 7. 不变量
- 菜单和命令面板执行的画布动作与快捷键是同一个处理函数（`cmd.exec`），结果一致。
- 不可用的菜单项一律显示并写原因，不隐藏（`U.13.05-R2`）。
- 命令面板里没有任何解除急停的命令；"让 AI …"只预填、不发送。
- 一次菜单动作最多一次 `dispatch`（对齐、锁定、断开全部都是一批，`C.05-R3`）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `exec` 返回 false | 不提示（与按快捷键时一致） |
| `dispatch` 结果 `blocked` | 菜单已关闭时在画布区域弹一条 `info` 提示原因；快速添加面板里行内红字 |
| `rejected` 等 | 提示由 `W.05` 负责 |
| 命令面板动态加载失败 | 提示"命令面板加载失败，请刷新页面" |
| `searchLibrary` 失败 | 子图库组显示"搜索失败" |
| `nodeDef` 取不到（快速添加的兼容过滤） | 那个原子类型的条目照常列出，不过滤（由连线预检兜底） |

## 9. 性能与资源
- 右键到菜单出现 ≤ 50ms（`itemsFor` 是纯函数 ≤ 1ms）。
- 命令面板：每次输入后 ≤ 16ms 出结果（节点 1000 个、节点类型 500 个，按规范化文本预先缓存）；首次打开含加载 ≤ 300ms。
- 快速添加的兼容过滤：13 个原子类型的 `NodeDef` 缓存后，每次打开 ≤ 3ms。

## 10. 验收标准
1. 右键节点、多选、连线、空白、端口，各出现 `U.13.05` §1 对应的菜单；每项带快捷键提示；断开服务时编辑类项置灰并写原因。
2. 只用键盘：`Shift+F10` 打开菜单，方向键移动、`→` 展开"锁定"子菜单、`Enter` 选择、`Esc` 关闭；关闭后焦点回到画布（`U.13.05-R1`）。
3. 右键节点"让 AI 解释这个节点"：对话框预填一句话并获得焦点、显示"附带 1 个节点"，没有发送（`U.13.05-R3`）。
4. 从 Agent 的"结果"端口拖线到空白处：快速添加面板只列出能接收这种数据的节点类型；选一个后新节点出现并已连好线。
5. `Ctrl+K` 输入"@验收"：只列节点，选中后画布进入那一层，节点闪两次、其余变淡（`U.10.05` §2）；输入">主题"只列命令。
6. 命令面板里"整理布局"与按 `L` 效果相同；命令面板打开时按 `[` 左栏不变化（`W.02.04` §10 验收 5）。
7. 多选三个节点"对齐 › 左"：操作历史里只有 1 条，撤销一次全部回到原位。
8. 按 `?` 打开速查，macOS 上显示 ⌘K、Windows 上显示 Ctrl+K。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/menu/ContextMenu.tsx`、`QuickAdd.tsx`、`CommandPalette.tsx`（`React.lazy` 入口）、`CommandPaletteImpl.tsx`、`KeysHelp.tsx`，每个同名 `.css`、`.test.tsx`；`web/src/panels/menu/menuItems.ts`、`paletteSources.ts` 及同名 `.test.ts`；`web/tests/e2e/menu.spec.ts`。
- 不许碰的文件：`web/src/canvas/`（`addNote` 由 `W.06.07` 实现）、`web/src/shell/`（`useCanvasAreaRect` 由 `W.02.02` 实现；快捷键表不改）、`web/src/state/`、其他 `panels/` 目录、`design/tokens.css`、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0711-T1 itemsFor`：五种目标各一组，项目与 `U.13.05` §1 一致；非容器节点没有"进入子图""预览""解散子图"
  - `W0711-T2 不可用原因`：`block={reason:'offline'}` → 编辑类项 `disabled` 且 `disabledReason` 为断开文案；选中 1 个时"打包为子图"写原因
  - `W0711-T3 exec 透传`：点"粘贴"→ `cmd.exec('clip.paste', {at, target})`
  - `W0711-T4 alignOps`：三个节点左对齐 → 一条 `move_nodes`，`x` 全等于最小 `x`；等距 → 间距相等；`frozen` 节点不在里面
  - `W0711-T5 askAi`：→ `ui.select` 包含目标节点、`prefillComposer({attachSelection:true})`；没有 `send`
  - `W0711-T6 快速添加过滤`：`from.type` 为 `判定@1` → 只保留有 `ctrl` / 可赋值输入的类型（假 `fits`）；`insert` 时上下游都满足
  - `W0711-T7 快速添加提交`：选中 → `cmd.addNode` 收到 `{at: world, connectFrom, insertInto}`；`blocked` → 行内红字、不关闭
  - `W0711-T8 parseQuery`：`'>主题'` → `{scope:'command', text:'主题'}`；`'@验'`、`'#竞品'`、`'abc'` 各一条
  - `W0711-T9 rank`：前缀 > 词首 > 包含；同分时用过的在前
  - `W0711-T10 命令面板分组`：每组 5 条 + "显示更多"；方向键跨组连续移动；没有"解除急停"命令
  - `W0711-T11 节点结果`：选中 → `useLocate({look:'look'})`
  - `W0711-T12 动态加载`：首次 `palette.open` 才 `import()`；模态期间 `[` 不生效、`Mod+.` 生效
  - `W0711-T13 速查`：`keys.list()` 的四组都出现；筛选"撤销"只剩相关行
  - `W0711-T14 端到端`：§10 验收 2、4、5（Playwright）
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R14）；另：不隐藏不可用的菜单项；"让 AI …"不直接发送；不提供解除急停的命令；菜单里的画布动作不另写实现（只经 `cmd.exec`）。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 8 棒；`P.09` K104、K111、K114 |
