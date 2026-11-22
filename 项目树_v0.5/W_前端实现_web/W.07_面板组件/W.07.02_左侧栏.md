# W.07.02 左侧栏

| 项 | 内容 |
|---|---|
| 编号 | W.07.02 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.4 `10_body.html`；demo v0.5（v0.5.11）`32_sessions.js`、`37_nodes.js`（节点库）、`35_inbox.js`（账户菜单）、`11_sessions.css`、`19_hier.css`、`20_newsess.css`、`21_flow.css`、`42_hier.js`、`43_float.js`（流动高亮）；`U.09.01` ②、`U.09.02`、`U.09.04`、`U.13.06` §3、`U.22`、`U.23-R15`–`R22`；`P.09` K114 |
| 最后修改 | 2026-11-23 |

## 1. 职责
左侧栏的全部内容：新建会话一行、会话列表（搜索、置顶、结构摘要、运行中与待审批角标、改名 / 置顶 / 删除）、结构区（当前会话当前图的结构树、图切换、运行与提议与审批的小点、放大镜预览、直达任一层、`tree.locate` 定位）、节点库（分类树、全部 / 收藏 / 最近、搜索、拖出与点击添加、未启用包的条目）、底部固定的一排入口（账户 · 包 · 连接 · 资源库 · 设置），以及收起后的 56px 图标栏。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 左栏宽度、收展动画、分区折叠状态的存储 | `W.02.02`、`W.03.03`（本文调 `setLs`、`setLsFold`） |
| 会话列表、活动摘要、结构树数据的获取与计算 | `W.03.05`、`W.03.01`（`structureTree`）、`W.03.04`（`scopeStatus`） |
| 节点从库里拖到画布上的放下、命中、提交 | `W.06.07`（本文只往 `dataTransfer` 放 `PRESET_MIME` 数据并提供拖动预览） |
| 预览浮层本身 | `W.06.13`（本文的放大镜调 `cmd.peek`） |
| 包、连接、资源库、设置页面 | `W.09.02`、`W.09.04` |
| 新会话的空白画布空状态 | `W.09.01` |
| 流动高亮、隐藏式滚动条的实现 | `W.08` `GlideGroup`、`ScrollArea` |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`；`W.02.02` §4.2、§6.4；`W.02.04` §4.1（`lib.search`、`session.prev`、`session.next`、`session.new`）；`W.03.01` §4.3（`structureTree`）；`W.03.03`（`setLs`、`setLsFold`、`openCenter`）；`W.03.04` §6.4–§6.5（`tick`、`scopeStatus`）；`W.03.05` §4.1–§4.2（列表 action、`isRunning`、`pendingCount`、`onActivity`）；`W.03.06`（`scopesWithProposals`）；`W.06.07` §4（`PRESET_MIME`）、`W.06.13` §6（`tree.locate`）；`U.09.01` ②；`U.09.02` §1、R2、R7–R10；`U.09.03`（< 900 默认收起）；`U.09.04` §1、R1–R4、R8、R10；`U.10.05` §2（结构树定位 900ms）；`U.13.06` §1（直达、放大镜）、§3（结构树）；`U.14.02`（节点库搜索无结果）；`U.16-R3`；`U.22` 全部；`U.23-R14`–`R22`；`U.24` #1–#4、#12–#15、#18、#23；`C.15-R1`、`R3`；`P.09` K114。

## 4. 接口

### 4.1 组件
```tsx
// web/src/panels/sidebar/LeftSidebar.tsx —— 外壳 <LeftSidebar/> 插槽里的唯一组件
export function LeftSidebar(): JSX.Element;                    // lsOpen=false 时渲染 <IconRail/>

export function NewSessionRow(): JSX.Element;
export function SessionList(): JSX.Element;
type SessionItemProps = { session: Session; current: boolean };
export function SessionItem(p: SessionItemProps): JSX.Element;
export function StructureTree(): JSX.Element;
type TreeRowProps = { item: TreeItem; depth: number; current: boolean; onPath: boolean; expanded: boolean; onToggle(): void; flash: boolean };
export function TreeRow(p: TreeRowProps): JSX.Element;
export function NodeLibrary(): JSX.Element;
type LibraryItemProps = { item: PresetItem; showPath: boolean; fav: boolean; onFav(): void };
export function LibraryItem(p: LibraryItemProps): JSX.Element;
export function SidebarFoot(): JSX.Element;                    // 底部一排（展开时横排，收起时竖排在图标栏底部）
export function IconRail(): JSX.Element;
type AccountMenuProps = { at: { x: number; y: number }; onClose(): void };
export function AccountMenu(p: AccountMenuProps): JSX.Element;
```

### 4.2 本文需要、由上层新增的数据（`P.09` K114）
```ts
// W.03 §4.5 目录 store 新增
export type PresetItem = {
  key: string;                         // `${packageId}/${preset.id}`
  preset: NodePreset;                  // C.15：{id, atom, path[≤3], name, description?, params?, label?}
  packageId: string; packageName: string;
  source: 'core' | 'mcp' | 'extension' | 'skill' | 'connection';
  enabled: boolean;
  disabledReason?: 'package_disabled' | 'pending_confirm';   // U.22-R4："扩展包未启用""等你确认"
};
CatalogState.presets: { items: readonly PresetItem[]; total: number; status: LoadStatus };   // total > 500 时 items 只含分类第一层（懒加载，U.22-R10）
CatalogActions.loadPresets(o?: { path?: readonly string[] }): Promise<void>;   // GET /node-presets?path=（B.04.06）
CatalogActions.searchPresets(q: string): Promise<readonly PresetItem[]>;       // GET /node-presets?q=，> 500 项时搜索在后端做

// W.03.05 session store 新增
SessionState.graphMeta: ReadonlyMap<Ulid, GraphMeta>;          // GET /graphs?limit=200：会话列表第二行、结构区图切换
SessionActions.loadGraphMeta(): Promise<void>;                  // 面板挂载时、session.updated / graph_attached 后（300ms 防抖）

// W.03.03 ui store 新增（对话框预填，W.07.07 消费）
UiActions.prefillComposer(p: { text: string; attachSelection?: boolean }): void;
UiState.composerPrefill: null | { text: string; attachSelection: boolean; seq: number };
```
- `PRESET_MIME`（`W.06.07` §4）的 JSON 为 `{type, params?, label?, tags?, meta?}`，`meta = {preset: key}`（`C.15-R1`：只用于显示来源）；`EngineCommands.addNode` 的 `d` 同样带 `meta?`（`W.06` §4.2，K114）。
- localStorage：`hx:lib-fav`（收藏的 `key` 数组）、`hx:lib-recent`（最近 10 个 `key`，新的在前）、`hx:lib-open`（展开的分类路径数组，缺省 `["智能体", "工具/内置"]`，`U.22-R5`）。都登记在 `W.03` §6.4。

### 4.3 依赖
`W.03` §4.2 的 hook；`W.03.01` 的 `structureTree`、`TreeItem`；`W.03.03`；`W.03.04` 的 `live.scopeStatus`、`tick`；`W.03.05` 的 `SessionActions`、`isRunning`、`pendingCount`、`sessionMeta`；`W.03.06` 的 `scopesWithProposals`；`W.02.01` 的 `useNav`；`W.06.01` 的 `useCanvasCommands`、`useCanvasEvent`；`W.06.07` 的 `PRESET_MIME`（从 `@/canvas/Canvas` 导出的常量）；`W.07` §4.2 的 `useShortcut`；`W.08` 的 `GlideGroup`、`ScrollArea`、`IconButton`、`Button`、`SearchInput`、`Tabs`、`Select`、`Menu`、`Dialog`、`StatusDot`、`Badge`、`EmptyState`、`Icon`、`Kbd`；`W.10` 的 `useT`、`fmtRelTime`、`fmtCount`。

## 5. 数据结构
- 组件内部：结构树各行的展开状态 `Set<Scope>`（不持久化；缺省展开当前路径上的层和第 1 层）、`flashScope: Scope | null`、搜索词、正在改名的会话 ID。
- 节点库的分类树在组件里由 `presets.items` 按 `preset.path` 构建（`useMemo`，按 `items` 引用缓存）：一级固定顺序 智能体 · 模型 · 工具 · 数据与状态 · 流程控制 · 人工 · 子图（`U.22` §1），不在表里的一级排在最后。

## 6. 行为

### 6.1 整体与层级（`U.09.02-R7`、`U.23-R15`–`R19`）
```
┌ NewSessionRow：居中按钮"＋ 新建会话"（独立一行，上下留白，下方 1px 分隔线）
├ ScrollArea（整体一个滚动区，预留滚动条位置）
│  ├ ① 分区标题：图标 + "会话"         13px / 600 / text-1，顶格；点击折叠
│  │   ② 分组："置顶""最近"           11px / text-3，缩进到标题文字下方
│  │   ③ 条目：会话名 / 第二行元信息    13px / 400 / text-1；元信息单行省略、前面不放图标
│  │   左侧 1px 引导线把 ②③ 挂在标题下
│  ├ ── 1px 分隔线 + 留白 ──
│  ├ ① 结构  {会话名}   [图切换 ▾]
│  │   结构树（每深一层缩进 16，各有自己的引导线）
│  ├ ── 分隔线 ──
│  └ ① 节点库
│      全部 / 收藏 / 最近（纯文字 + 当前项 1.5px 下划线）  搜索框
│      分类树
└ SidebarFoot：账户 · 包 · 连接 · 资源库 · 设置（固定在底部，不随内容滚动）
```
- 三个分区的折叠由 `ui.layout.lsFold` 决定，标题点击 `setLsFold(sec, !folded)`；折叠后只剩标题行。
- 当前会话、当前层是浮起的卡片（`bg-2` + 柔和阴影 `shadow-node`），不只靠淡灰底；其他条目透明底（`U.23-R15`）。
- 滚动区、图标栏、底部一排分别包在 `GlideGroup` 里：悬停高亮是一块流动的底块（`U.23-R21`、`U.24` #15）；条目自身不设悬停底色。
- 节点库最后一项与底部一排之间留 `--hx-s-5`，不会被压住（`U.24` #1、#2）。

### 6.2 新建会话（`U.23-R19`、`R22`、`U.09.04-R8`）
- 按钮：居中，主色浅底（`color-mix(in srgb, var(--hx-accent) 11%, var(--hx-bg-2))`）+ `accent-strong` 文字 + 极淡主色内描边；左侧 + 图标固定 14px（`U.24` #23）；`Alt+N` 只在悬停时以 `Kbd` 淡显。
- 点击或 `Alt+N`（`useShortcut('session.new')`）→ `session.create()` → `useNav().switchSession(新 ID)`；失败提示"没能新建会话"。新会话的对话框自动获得焦点由 `W.07.07` 负责（它看到当前会话没有消息且没有图时聚焦）。

### 6.3 会话列表（`U.09.04`）
- 数据：`session.list.items`（服务端已按置顶在前、更新时间倒序排）；挂载时 `loadList()`、`loadGraphMeta()`。分组：`pinned` 的进"置顶"，其余进"最近"。
- 条目第一行：会话名（单行省略）；右侧：`isRunning(s, id)` → `StatusDot running` + 读屏文字"运行中"（`U.09.04-R1`）；`pendingCount(s, id) > 0` → `wait` 色数字角标。
- 第二行（`U.09.04-R2`，`text-3`，单行省略）：`active_graph_id` 的 `graphMeta.stats` → "3 层 · 2 个子图 · 24 节点 · {fmtRelTime(updated_at)}"；`layers=1` 写"单层"；没有图写"空白画布"；元信息还没加载时只显示时间。
- 点击 → `switchSession(id)`（已是当前会话时不动）。键盘：列表 `role="listbox"`，上下键移动、Enter 打开。
- 悬停出现"⋯"按钮（右键同效）→ `Menu`：重命名（条目变成 `TextInput`，Enter 提交 `rename`）· 置顶 / 取消置顶（`setPinned`）· 删除（`Dialog`："删除会话「X」？图不会被删除，可以在「所有图」里找到"，危险按钮"删除"在右，`U.15` §3、`U.11` §2）。删除当前会话后导航到列表下一项，没有则 `/`（`W.03.05` §6.1）。
- 搜索框（分区标题下方，只在列表 > 8 项时显示）：输入 250ms 防抖后 `loadList({q})`。滚到底部 200px 内且有 `nextCursor` → `loadList({more:true})`。
- `Alt+[` / `Alt+]`（`useShortcut('session.prev' / 'session.next')`）：按列表显示顺序切到上一个 / 下一个，到头不循环（`U.09.04-R10`）。
- `onActivity` 不需要单独订阅：`activity.bySession` 变化即重渲染受影响的条目（选择器按会话 ID 取）。

### 6.4 结构区（`U.13.06` §3、`U.09.04-R3`、`R4`）
- 标题："结构" + `text-3` 当前会话名（`U.09.04-R3`）；会话挂了多张图（`graph_ids.length > 1`）时标题右侧 `Select`，选项为各图的标题（`graphMeta`）→ `switchGraph(id)`（`U.09.04-R4`）。
- 树：`structureTree(model)`（按 model 缓存）。每行（`role="treeitem"`、`aria-level`、`aria-expanded`）：类型图标 · 名称 · `text-3` 节点数 · 状态点（右侧），从左到右：
  | 小点 | 条件 | 样式 |
  |---|---|---|
  | 运行状态 | `run.live.scopeStatus(scope)` ≠ `idle`（订阅 `run.tick` 后读，最多 400ms 一次，`U.17-R11`） | 运行中 `accent` 呼吸、完成 `ok`、等待 `wait`、失败 `danger`（`StatusDot`，带读屏文字） |
  | 待处理提议 | `scopesWithProposals(model)` 含这一层 | 模型色小点（`U.12-R2`） |
  | 待审批 | 当前图的待审批所在层是这一层（同 `W.07.01` §6.3 的取层方法） | `wait` 色小点（`U.14.04` §2） |
- 当前层：浮起卡片（§6.1）；当前路径上的层文字 `text-1`，其他 `text-2`。
- 点击行：是当前层 → 无；是当前层的上层 → `leaveTo(scope)`；否则 → `enterLayer(item.nodeId)`（跨多层也只 push 一条，`W.02.01` §6.1）；根图行 → `leaveTo('root')`。
- 悬停（或键盘焦点）出现放大镜按钮（不在根图行）→ `cmd.peek(item.nodeId)`（`U.13.06` §1）；提示框"预览 · P"。
- 行的展开 / 折叠：行首小三角；键盘 → / ← 展开 / 折叠，↑ / ↓ 移动，Enter 同点击。
- `tree.locate{scope}`（`useCanvasEvent`）：`setLs(true)`、`setLsFold('tree', false)`、展开它的所有上层、`scrollIntoView({block:'nearest'})`、这一行加 `is-located`（1.5px `--hx-focus` 外框）900ms 后去掉（`U.10.05` §2）。
- 没有图：只显示标题，不放说明文字（`U.23-R12`；空白画布的说明在画布上，`W.09.01`）。

### 6.5 节点库（`U.22`）
- 挂载时 `catalog.loadPresets()`；`status='loading'` 超过 300ms 显示旋转弧。
- 顶部 `Tabs variant="underline"`：全部 / 收藏 / 最近（`U.22-R2`、`R11`）；下方 `SearchInput`。`/`（`useShortcut('lib.search')`）→ `setLs(true)`、`setLsFold('lib', false)`、聚焦搜索框（`U.09.02` §1）。订阅 `ui.libQuery`：`seq` 变化时把 `text` 填进搜索框、切到"全部"并按 §6 的搜索显示结果（包详情"在节点库中显示"，`W.09.04`，`P.09` K149）；`revealInLibrary` 已经打开左栏并展开节点库。
- 全部：分类树最多三层；一级标题 12.5px / 500 / `text-1`，二级 12px / `text-2`，条目 12.5px / `text-1`，逐级缩进（`U.22-R12`）；展开状态存 `hx:lib-open`。每个一级分类底部有入口（`U.22-R6`）：模型 › "连接更多模型…"（`ui.openCenter('connections')`）；工具 › "接入 MCP 服务、安装扩展包…"（`openCenter('packages')`）。`total > 500` 时展开某个分类才 `loadPresets({path})`（`U.22-R10`）。
- 收藏 / 最近：平铺，每条下方 `text-3` 小字显示分类路径；空时一行 `text-3`"还没有收藏"/"还没有用过"。
- 搜索（`U.22-R3`）：`total ≤ 500` 时本地匹配名称、说明、分类路径、来源、原子节点类型（大小写、全半角不敏感）；否则 200ms 防抖 `searchPresets(q)`。有搜索词时平铺结果并显示路径；无结果 → `EmptyState`："没有找到「{q}」"、"试试别的词，或者让 AI 帮你做一个"、按钮"让 AI 帮我做" → `ui.prefillComposer({text: t('ls.lib.askAi', {q})})`（`U.14.02`）。
- 条目：图标 16px `text-3`、无底板（`U.22-R12`、`U.24` #3）· 名称 · 来源标记（MCP、扩展包、连接名，`text-3` 小字，不用彩色底，`U.22-R1`、`R13`）· 悬停出现 ★（已收藏的 ★ 常显）→ 切换 `hx:lib-fav`。不显示"N 个节点"总数（`U.22-R13`）。
- 未启用（`enabled=false`）：整条 `opacity: .5`，第二行写原因"扩展包未启用""等你确认"；不能拖；点击 → `openCenter('packages', packageId)`（`U.22-R4`、`C.15-R3`）。
- 添加（`U.22-R7`）：
  - 拖：`draggable`；`dragstart` 时 `dataTransfer.setData(PRESET_MIME, JSON.stringify({type: preset.atom, params: preset.params, label: preset.label ?? preset.name, meta: {preset: key}}))`、`effectAllowed='copy'`、`setDragImage(预览元素, 12, 12)`（预览元素是一张半透明的小卡片：图标 + 名称，建在 `document.body` 下、拖动结束移除）；`dragend` 且 `dropEffect === 'copy'` → 记入最近。
  - 点击（或 Enter）：`cmd.addNode({type, params, label, meta}, {at: 'center'})`；结果 `applied` / `merged` / `proposal` → 记入最近；`blocked` → 提示框显示原因（`Precheck.textKey`）。
  - 只读或断开（`useEditBlock()` 不为 null）：条目照常显示，拖动与点击无效，提示框写原因。

### 6.6 底部一排与账户菜单（`U.09.02-R7`、`U.22-R8`）
- 五个 `IconButton`（展开时横排、收起时竖排在图标栏底部）：账户（打开 `AccountMenu`）· 包（`openCenter('packages')`）· 连接（`openCenter('connections')`）· 资源库（`openCenter('library')`）· 设置（`openCenter('settings')`，提示框带 `keys.label('center.open')`）。
- `AccountMenu`（`Menu`）：一行不可点的"本机 · 单用户"；"重新查看导览"（`W.09.03` 的入口，`U.18-R1`）；"关于与诊断"（`openCenter('settings', 'about')`）。

### 6.7 图标栏（`lsOpen=false`，`U.09.02` §1、R8）
- 宽 `--hx-ls-w-min`；从上到下：新建会话（＋，主色浅底小方块）· 会话 · 结构 · 节点库；底部是 §6.6 的五个按钮。按钮中线与顶部条左栏开关对齐（`U.24` #4）。
- 点会话 / 结构 / 节点库 → `setLs(true)` + `setLsFold(sec, false)` + 展开后把那个分区滚到顶部。
- 每个按钮有提示框；当前会话有待审批时会话图标带 `wait` 小点。

## 7. 不变量
- 结构树永远是当前会话当前图（`U.09.04` §1）；切换会话后第一帧就换成新会话的树（旧树不残留）。
- 侧栏只有一个滚动区；底部一排不随内容滚动（`U.09.02-R7`）。
- 节点库不显示条目总数；未启用的条目不能拖入（`C.15-R3`）。
- 结构树的运行状态点最多每 400ms 刷新一次（`U.17-R11`）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 会话列表加载失败 | 列表位置一行"没能加载会话 · 重试"（`W.03.05` §8） |
| 改名、置顶、删除失败 | store 已回退；提示一次错误 |
| 节点库加载失败 | 节点库位置"没能加载节点库 · 重试" |
| 搜索请求失败 | 结果区"搜索失败 · 重试"，保留输入 |
| `addNode` 被拒绝（`rejected`） | 提示由 `W.05` 负责，本文不重复 |
| 切到的图不存在（`switchGraph` 后 404） | 由 `W.02.01` §8 处理，本文无事 |

## 9. 性能与资源
- 会话列表 > 200 项、节点库可见条目 > 500 项时按 `W.07` §9 窗口化。
- 结构树 100 个容器节点：`tick` 一次重渲染 ≤ 4ms（只重渲染状态点变化的行：每行用 `memo`，状态点值作为 props）。
- 节点库本地搜索 500 项 ≤ 2ms（预先把每项的可搜索文本规范化后缓存）。

## 10. 验收标准
1. 左栏全部展开时能滚到节点库最后一项，最后一项不被底部一排遮住；底部一排不随滚动移动（`U.24` #1、#2）。
2. 三级层级可辨：分区标题、分组、条目字号字重不同，内容缩进在标题下并有引导线；当前会话和当前层是浮起卡片（`U.23-R15`、`R17`）。
3. 新建会话独立一行、居中、主色浅底；图标 14px；`Alt+N` 新建后画布为空、对话框获得焦点（`U.09.04-R8`）。
4. 会话 A 运行中切到 B：5 秒内 A 显示"● 运行中"；A 有审批时显示数字角标；第二行显示"3 层 · 2 个子图 · 24 节点 · 刚刚"。
5. 在第 3 层时结构树当前行浮起，路径上的行为 `text-1`；点根图行回到根图；点第 3 层行直接进入；放大镜打开预览；预览里点"在结构树中定位"后那一行闪 900ms。
6. 节点库默认展开"智能体""工具 › 内置"；搜索"检索"平铺结果并显示路径；拖一个条目到画布上，画布上出现节点且"最近"里出现它；未启用包的条目灰显、拖不动、点击打开包详情。
7. 左栏收起成图标栏后，按钮与顶部左栏开关同一中线；点结构图标展开并打开结构区。
8. 流动高亮在条目之间平滑滑动，离开区域淡出；滚动条平时不可见，指针移入才出现。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/sidebar/LeftSidebar.tsx`、`NewSessionRow.tsx`、`SessionList.tsx`、`SessionItem.tsx`、`StructureTree.tsx`、`TreeRow.tsx`、`NodeLibrary.tsx`、`LibraryItem.tsx`、`SidebarFoot.tsx`、`IconRail.tsx`、`AccountMenu.tsx`，每个同名 `.css`、`.test.tsx`；`web/src/panels/sidebar/libTree.ts`（分类树构建与本地搜索，纯函数）、`libTree.test.ts`；`web/tests/e2e/sidebar.spec.ts`；`web/tests/visual/sidebar.spec.ts`。
- 不许碰的文件：`web/src/state/`（`presets`、`graphMeta`、`prefillComposer` 由 `W.03` 实现）、`web/src/canvas/`、`web/src/shell/`、其他 `panels/` 目录、`design/tokens.css`、`schema/`。
- 函数签名：见 §4；纯函数：
  ```ts
  export function buildLibTree(items: readonly PresetItem[], order: readonly string[]): LibNode[];   // LibNode = { path: string; label: string; children: LibNode[]; items: PresetItem[] }
  export function searchLocal(items: readonly PresetItem[], q: string): PresetItem[];
  export function sessionMetaLine(meta: GraphMeta | undefined, updatedAt: string, t: T): string;
  ```
- 测试用例：
  - `W0702-T1 分组`：两条置顶、三条普通 → "置顶"2、"最近"3；选择器只在本会话活动变化时重渲染该条
  - `W0702-T2 第二行`：`{layers:3, subgraphs:2, nodes:24}` → "3 层 · 2 个子图 · 24 节点 · 刚刚"；`layers:1` → "单层 · …"；没有图 → "空白画布 · …"
  - `W0702-T3 删除确认`：删除当前会话 → 确认框 → `remove` → 导航到下一项
  - `W0702-T4 会话快捷键`：`Alt+]` 在最后一项不循环；`Alt+N` → `create` 后 `switchSession`
  - `W0702-T5 结构树小点`：`scopeStatus` 返回 `failed` → 红点；`scopesWithProposals` 含这一层 → 模型色点；`tick` 不变时不重渲染
  - `W0702-T6 结构树导航`：点上层 → `leaveTo`；点下层 → `enterLayer`；放大镜 → `cmd.peek`；根图行没有放大镜
  - `W0702-T7 tree.locate`：左栏收起、结构区折叠时收到事件 → `setLs(true)`、`setLsFold('tree', false)`、行有 `is-located`，900ms 后去掉
  - `W0702-T8 分类树`：`buildLibTree` 按固定一级顺序；三层路径正确嵌套；未知一级排在最后
  - `W0702-T9 本地搜索`：按名称、路径、来源、原子类型都能命中；全角"ＡＩ"命中"AI"
  - `W0702-T10 后端搜索`：`total=800` → 输入后 200ms 只发 1 次 `searchPresets`
  - `W0702-T11 拖出`：`dragstart` 的 `dataTransfer` 含 `PRESET_MIME` 且 JSON 带 `meta.preset`；`dropEffect='copy'` 的 `dragend` → 最近首位；未启用条目 `draggable=false`
  - `W0702-T12 点击添加`：`cmd.addNode` 收到 `{at:'center'}`；`blocked` → 提示框原因，不记最近
  - `W0702-T13 无结果`：搜索无结果 → `EmptyState`；"让 AI 帮我做" → `prefillComposer`
  - `W0702-T14 图标栏`：点"结构" → `setLs(true)`、`setLsFold('tree', false)`
  - `W0702-T15 端到端`：§10 验收 1、4、5、6（Playwright，`--fake-llm`）
  - `W0702-T16 视觉回归`：展开 / 收起 × 浅色 / 深色；全部分区展开时滚到底的截图
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部；另：不在侧栏条目上单独写悬停底色（用 `GlideGroup`）；不显示节点库总数；不让未启用包的条目被拖入；不在本文里自己计算结构树或运行状态（只用 `W.03` 的选择器）。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 8 棒；`P.09` K114 |
| 2026-11-23 | 节点库订阅 `ui.libQuery`（包详情"在节点库中显示"） | 第 9 棒写 `W.09.04`；`P.09` K149 |
