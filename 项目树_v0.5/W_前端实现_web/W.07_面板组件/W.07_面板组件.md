# W.07 面板组件

| 项 | 内容 |
|---|---|
| 编号 | W.07 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | W.07.01 顶部条、W.07.02 左侧栏、W.07.03 右侧栏：属性、W.07.04 右侧栏：对话、W.07.05 右侧栏：监控、W.07.06 停靠栏与浮动面板、W.07.07 底部对话框、W.07.08 浮动回复、W.07.09 审批卡片、W.07.10 提示、横幅与通知中心、W.07.11 右键菜单与命令面板 |
| 状态 | 草稿 |
| 素材 | 设11；demo v0.4 `27_panels.js`、`10_body.html`、`08_layout.css`；demo v0.5（v0.5.11）`15_art.css`、`16_monitor.css`、`21_flow.css`、`23_tab.css`、`32_sessions.js`、`35_inbox.js`、`36_composer.js`、`37_nodes.js`、`39_monitor.js`、`43_float.js`、`44_drag.js`；`P.09` K111–K120 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`web/src/panels/`：会话页上画布以外的全部 React 面板——顶部条、左侧栏、右侧栏三个标签页、画布上的浮动面板外框（停靠栏、小地图、父图位置卡）、对话框、浮动回复、提议栏与审批卡片、提示 / 横幅 / 通知中心 / 冲突框、右键菜单 / 快速添加面板 / 命令面板 / 快捷键速查。它们从 store 读数据、经 store 的 action 和 `useOps()` 写数据、经引擎命令驱动画布、订阅引擎事件响应画布上的请求。

本文把 11 个叶子的分工、目录、共用 hook、各叶子要用的 `W.08` 基础组件与 `W.10` 文案 / 格式化一次定下来；叶子只细化本文，不另起共用接口。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 各区域摆在哪、多大、断点、收展动画、`fitInsets` | `W.02.02`（本枝只提供区域里的内容组件） |
| 画布上的一切绘制：节点、连线、幽灵节点、提议条、AI 光标、预览浮层、缩略图、小地图内容 | `W.06`（本枝只给挂载点、调引擎命令、订阅引擎事件） |
| 服务器数据的存放、事件路由、请求 | `W.03`、`W.04`（本枝只调 action，`W.01-R13`） |
| 修改图的流水线、撤销、冲突的判定 | `W.05`（本枝只调 `OpsApi`，`W-R3`） |
| 快捷键的注册中心与分发顺序 | `W.02.04`（本枝用 `keys.on` 注册处理函数） |
| 按钮、输入、选择、浮层、提示等基础控件的实现 | `W.08`（本枝只组合它们；需要的组件和 props 见 §4.3） |
| 整页界面：会话首页与空状态的卡片、中心窗口、首次引导、运行历史与回放 | `W.09` |
| 文案表与数字、金额、时间的格式化函数 | `W.10`（本枝要用的见 §4.4） |
| 授权判定、急停解除的校验 | 后端（`W-R4`、INV-10） |

## 3. 继承的上级约束
`W-R2`–`R10`、`R13`、`R14`；`W.01-R5`、`R7`、`R10`、`R13`、`R14`、`R18`、`R19`；`W.01` §3.3；`W.02.02`（全部，含 §6.2 浮动元素表、§6.4 收展表）；`W.02.04` §4.2、§6.1、§6.4；`W.03` §4.2、§6.3、§6.4；`W.05` §4.1；`W.06` §4.2（引擎事件、引擎命令）、`W.06.01` §4.1；`G.06-R4`、`R5`；`G.06.01`（全部，特别是 R1、R4、R6、R9、R10）；`G.06.02-R1`、`R3`、`R7`；`G.06.03`（全部）；`G.04.02`；`G.04.06`；`G.02.05-R23`、`R25`、`R26`；`U.01`；`U.06` §3；`U.07.01`、`U.07.04`；`U.08`；`U.09` 全部；`U.11`；`U.12`；`U.13.03`–`U.13.06`；`U.14` 全部；`U.15`；`U.16`；`U.17`；`U.19`；`U.22`；`U.23` 全部；`U.24`；INV-08、INV-10、INV-22、INV-24；`P.09` K111–K120。

## 4. 接口

### 4.1 目录与分工
```
web/src/panels/
├─ shared/        W.07.01 实施  useLocate.ts useShortcut.ts useEditBlock.ts describeOp.ts（§4.2，各叶子共用）
├─ top-bar/       W.07.01  TopBar、SessionTitle、Crumbs、BranchChip、BranchMenu、MergeDialog、ModelPill、LevelPill、LevelPanel、RunButton、RunStatus、EstopButton、ThemeMenu、RsToggle
├─ sidebar/       W.07.02  LeftSidebar、NewSessionRow、SessionList、SessionItem、StructureTree、TreeRow、NodeLibrary、LibraryItem、SidebarFoot、IconRail、AccountMenu
├─ inspector/     W.07.03  RightSidebar（三个标签页的容器）、PropsPage、NodeProps、ParamRow、MultiProps、EdgeProps、NoteProps、LayerProps、ListView、NodeRunDetail、LargeEditor、PromptPreview
├─ chat/          W.07.04  ChatPage、MessageList、MessageView、Markdown、BlockView、GraphCard、AppliedCard、RunCard、FocusCard、ErrorCard、ChatStatusLine
├─ monitor/       W.07.05  MonitorPage、RunFilters、RunList、RunItem、RunDetail、Waterfall、StepList、StepRow、LogView、OpHistory、OpHistoryItem
├─ dock/          W.07.06  FloatPanel、Grip、Dock、MinimapFrame、TypeLegend、NestCardFrame、BoundaryRows；panelPos.ts
├─ composer/      W.07.07  Composer、ComposerInput、RefChips、AttachMenu、SlashMenu、MentionMenu、ContextRing、ContextPopover、ModelButton、ModelPicker、EffortSegment、SendButton；draft.ts、slash.ts
├─ float-reply/   W.07.08  FloatReplyProvider（W.02.02 的 FloatLayer 用它包住子元素）、FloatReply、ReplyTab、FloatReplyTail、FlowLine；flowPath.ts
├─ approval/      W.07.09  ProposalBar、ProposalCard、ApprovalCard、ApprovalDetail
├─ notice/        W.07.10  ToastStack、BannerStack、EstopBanner、NetBanner、NarrowBanner、ReleaseEstopDialog、ConflictDialog、InboxButton、InboxPanel、InboxItem、ModelEditToast；LiveRegion.tsx、useAnnounce.ts
└─ menu/          W.07.11  ContextMenu、menuItems.ts、QuickAdd、CommandPalette、paletteSources.ts、KeysHelp
```
- 一个文件一个组件，旁边放同名 `.css` 和 `.test.tsx`（`G.06.01-R1`）；表里没写扩展名的都是 `.tsx` 组件，写了 `.ts` 的是纯函数或 hook。
- 跨叶子复用只通过各目录导出的组件：`W.07.05` 用 `inspector/NodeRunDetail`；`W.07.04` 用 `approval/ProposalCard`、`ApprovalCard`；`W.07.08` 用 `chat/MessageView`；`W.07.01` 用 `notice/InboxButton`；`W.07.07` 用 `approval/ProposalBar` 的高度参与 `fitInsets`（由 `W.02.02` 量）。不跨目录 import 对方的内部文件（非组件文件、`.css`）。
- `panels/` 不 import `canvas/core/**`（只用 `@/canvas/Canvas` 导出的 `useCanvasCommands`、`useCanvasEvent`，`W.06.01` §4.1）和 `components/` 以外的 `shell/` 内部文件（只用 `@/shell/keys` 的 `keys`、`@/shell/theme` 的 `themeController` / `useTheme`、`@/shell/breakpoints` 的类型）。

### 4.2 共用 hook（`panels/shared/`，实现与测试写在 `W.07.01` 的实施卡）
```ts
// web/src/panels/shared/useLocate.ts —— "在画布上定位"的唯一实现：监控页步骤、"看这里"卡片、已修改卡片、通知"查看"、命令面板的节点结果、撤销后定位
import type { Ulid } from '@/lib/protocol';
import type { Scope } from '@/state/types';
export type LocateTarget = {
  sessionId?: Ulid;               // 缺省 = 当前会话
  graphId?: Ulid;                 // 缺省 = 当前图
  scope: Scope;
  nodes: readonly Ulid[];
  look?: 'select' | 'look' | 'none';   // select：选中并闪（监控页步骤，U.09.07）；look："看这里"（其余变淡 2 秒，U.10.05 §2）；缺省 select
};
export type LocateResult = 'done' | 'gone' | 'timeout' | 'blocked';
export function useLocate(): (t: LocateTarget) => Promise<LocateResult>;

// web/src/panels/shared/useShortcut.ts —— 组件里注册快捷键处理函数（W.02.04 §4.2），卸载时注销
import type { ShortcutId, KeyHandler } from '@/shell/keys';
export function useShortcut(id: ShortcutId, h: KeyHandler, o?: { when?: () => boolean; enabled?: boolean }): void;

// web/src/panels/shared/useEditBlock.ts —— 现在能不能改图；不能时给出原因文案键（按钮置灰 + 提示框说明，U.11 §1）
export type EditBlock = null | { reason: 'offline' | 'readonly' | 'estop-run' | 'no-graph'; textKey: string };
export function useEditBlock(): EditBlock;

// web/src/panels/shared/describeOp.ts —— 一条 Op 的一句话描述（操作历史、"AI 修改了 N 处"、已修改卡片）
import type { Op } from '@/lib/protocol';
import type { GraphModel } from '@/state/graphModel';
export function describeOp(op: Op, m: GraphModel | null, t: (k: string, v?: Record<string, string | number>) => string): string;
```
`useLocate(t)` 的步骤：
1. `t.sessionId` 不是当前会话 → `useNav().switchSession(sid)`，等工作区 `status='ready'`（订阅 `workspaces.subscribe` 与 `ws.state`，最多 3 秒，超时返回 `timeout`）。是否先问用户由调用方决定（`U.09.07-R4` 由 `W.07.05` 先显示"切过去"）。
2. `t.graphId` 不是当前图 → `switchGraph(gid)`，等 `graph.status='ready'`（最多 3 秒）。
3. 节点都不在 `model` 里 → 返回 `gone`（调用方提示"那个节点已经不在了"）；`scope` 不存在 → 同样 `gone`。
4. `cmd.locate({scope, nodes})`（`W.06.13` 负责跨层导航与 `reveal`）；等主画布 view store 的 `scope === t.scope`（用 `useCanvasStores().view.subscribe`，不是 hook，最多 3 秒）。
5. `look='select'` → `ui.actions.select(sessionId, {scope, nodeIds: nodes, edgeIds: [], noteIds: []})`；`look='look'` → `cmd.highlight(nodes, 'look')`。返回 `done`。
6. 引擎未就绪（`useCanvasCommands()` 为 null）→ `blocked`。

### 4.3 需要 `W.08` 提供的组件（第 9 棒写 `W.08` 的输入）
`W.08` 的组件只拿 props，不依赖 `state`、`ops`、`lib/protocol`（`W.01-R7`）；文案由调用方翻译好传入。
| 编号 | 组件 | props（必须有的） | W.07 用在哪 |
|---|---|---|---|
| W.08.01 | `Button` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'model'`、`size?: 'md' \| 'sm'`、`icon?`、`loading?`（文字换成旋转弧，宽度不变）、`disabled?`、`disabledReason?`（禁用时提示框说明原因，U.11 §1）、`onClick` | 全部；`primary` 只在运行按钮和发送（`U.23-R2`） |
| W.08.01 | `IconButton` | `icon`、`label`（`aria-label` 与提示框）、`shortcut?: string`（已由 `keys.label` 得到的文字，提示框里显示）、`size?: 28 \| 24`、`pressed?`（`aria-pressed`）、`dot?: 'accent' \| 'danger' \| 'wait' \| 'model' \| 'focus'`、`disabled?`、`disabledReason?` | 顶部条、停靠栏、侧栏图标栏、底部一排 |
| W.08.01 | `Kbd` | `text` | 菜单项、命令面板、速查面板 |
| W.08.02 | `TextInput` | `value`、`onChange`、`onCommit`（Enter / 失焦）、`onCancel`（Esc）、`placeholder?`、`invalid?`、`error?`（下方一行红字，`U.14.03` §1）、`mono?`、`autoFocus?`、`readOnly?`、`lockReason?` | 会话改名、属性页参数、搜索 |
| W.08.02 | `TextArea` | 同上 + `minRows`、`maxRows`、`autosize`、`onKeyDown`（对话框要拦 Enter）、`onCompositionStart/End` | 对话框、属性页多行参数、大编辑器 |
| W.08.02 | `NumberStepper` | `value`、`min?`、`max?`、`step?`、`onStart()`、`onChange(v)`、`onEnd(v)`（拖动 / 滚轮 / 双击输入；`Shift` ×10；调用方用 `ops.gesture('step')` 合并，`U.11` §2） | 属性页 |
| W.08.02 | `Slider` | `value`、`min`、`max`、`step`、`onStart`、`onChange`、`onEnd`（拖动时上方浮出数值） | 属性页 |
| W.08.02 | `SearchInput` | `value`、`onChange`、`onClear`、`inputRef`、`shortcut?` | 会话列表、节点库、监控页、命令面板 |
| W.08.03 | `Select` | `value`、`options: {value, label, desc?, disabled?, disabledReason?, group?}[]`、`onChange`、`filterable?`、`footer?: ReactNode` | 属性页参数、结构区图切换 |
| W.08.03 | `Segmented` | `value`、`items: {value, label, tip?}[]`、`onChange`（选中背景滑动 `--hx-t-2`，减少动效直接切换） | 主题明暗、思考强度、监控页状态 |
| W.08.03 | `Switch` | `checked`、`onChange`、`label` | 列表视图、减少动效、属性页布尔参数 |
| W.08.03 | `Tabs` | `value`、`items: {value, label, badge?}[]`、`onChange`、`variant: 'underline' \| 'pill'`（`underline` = 纯文字 + 当前项 1.5px 下划线，`U.22-R11`） | 右侧栏标签页、节点库筛选、通知中心、监控页小标签 |
| W.08.03 | `Picker` | `groups: {title?, items: {id, icon?, label, desc?, right?, disabled?}[]}[]`、`activeId`、`onPick`、`onActiveChange`、`emptyText`、`footer?`、`listId?`、`query?`、`ref: PickerHandle`（键盘上下、Enter、Tab 选择；焦点留在调用方的输入框时，输入框的 `onKeyDown` 交给 `ref.current.key(e)`，`P.09` K126） | 附件菜单、`/` 命令、`@` 引用、模型选择、快速添加 |
| W.08.04 | `Overlay` | `layer: 'popover' \| 'modal' \| 'toast' \| 'tooltip' \| 'pane'`（映射 `--hx-z-*`，`U.06` §3）、`open`、`onClose`、`trapFocus?`、`restoreFocus?`（默认 true，`U.16-R6`）、`closeOnOutside?`、`onKey?`、`initialFocus?`、`scrim?`、`anchorEl?`、`children`；打开时经界面环境 `UiEnv.pushOverlay(layer === 'modal' ? 'modal' : 'popover', …)` 压栈（`components/ui` 不 import `shell`，`W.02` 注入 `keys.pushOverlay`），`Esc` / `Tab` 之外的键交给 `onKey`（`W.08` §4.3，`P.09` K121、K126） | 所有浮层（`G.06.01-R9`） |
| W.08.04 | `Popover` | `anchor: HTMLElement \| DOMRect`、`placement`、`offset?`、`open`、`onClose`、`width?`、`glass?`（玻璃材质，`U.23-R6`）、`children`；用 `@floating-ui/dom` 定位 | 主题菜单、档位面板、分支菜单、上下文用量、类型图例、通知中心 |
| W.08.04 | `Menu` | `at: {x, y} \| HTMLElement`、`items: MenuItem[]`（`{id, label, icon?, shortcut?, disabled?, disabledReason?, danger?, model?, checked?, children?: MenuItem[], run?()} \| 'sep' \| {group: string}`；选中时先 `run()` 再 `onPick(id)`）、`onPick(id)`、`onClose`（宽 220、项高 28；方向键、Enter、Esc、→ 展开子菜单，`U.13.05-R1`） | 右键菜单、会话项菜单、账户菜单 |
| W.08.04 | `Dialog` | `title`、`width: 400 \| 560`、`open`、`onClose`、`actions: {label, variant, onClick, autoFocus?}[]`（危险按钮在右，`U.11` §2）、`dismissible?`（false：`Esc`、点遮罩不关闭，冲突框）、`busy?`、`error?`、`children` | 冲突框、解除急停确认、删除会话确认、合并预览 |
| W.08.04 | `Tooltip` | `content`、`shortcut?`、`delay?`（默认 400ms）、`children` | 全部图标按钮（经 `IconButton`）、截断的文字 |
| W.08.05 | `Toast` | `level: 'info' \| 'ok' \| 'wait' \| 'error' \| 'model'`、`text`、`detail?`、`actions?: {label, onClick}[]`（最多 3 个，`W.07.10` §6.3；原 `action?` 改为数组，`P.09` K126）、`onClose`、`glass?`、`onHover?(on)`（悬停暂停计时） | `W.07.10` 提示堆叠 |
| W.08.05 | `Badge` | `tone: 'neutral' \| 'accent' \| 'ok' \| 'danger' \| 'wait' \| 'model'`、`text`（弱色底 + 实色字，`U.03.02-R1`） | 运行状态徽标、AI 字样、来源标记 |
| W.08.05 | `StatusDot` | `state: NodeState 的界面类别 'idle' \| 'running' \| 'waiting' \| 'failed' \| 'done'`、`breathing?`（减少动效时静态，`U.07.04`）、`label`（读屏文字，`U.16-R2`） | 会话列表、结构树、监控页 |
| W.08.05 | `Spinner` | `size: 12 \| 16`（旋转弧；减少动效改静态半圆弧） | 加载 300ms–2s（`U.14.01`） |
| W.08.05 | `ProgressBar` | `value: 0..1`、`tone`（`transform: scaleX`，`U.07.01-R2`） | 监控页运行列表、运行按钮旁 |
| W.08.05 | `EmptyState` | `icon?`（≤ 32px 线性图标）、`title`、`desc?`、`actions?`（最多一句标题 + 一句说明，`U.23-R13`、`U.14.02-R2`） | 监控页、节点库搜索无结果 |
| W.08 | `Icon` | `name`（`U.08` §2 图标表）、`size?: 14 \| 16` | 全部；画布引擎经 `EngineDeps.icon` 也取这个模块 |
| W.08 | `GlideGroup` | `itemSelector: string`、`variant: 'row' \| 'icon'`、`children`（流动高亮：底块跟随指针在条目间滑动 0.32s，离开区域淡出；减少动效时只做透明度，`U.23-R21`、`U.09.02-R9`） | 侧栏滚动区、图标栏、底部一排、停靠栏 |
| W.08 | `ErrorBoundary` | `fallback: (retry: () => void) => ReactNode`、`children`、`name`（写进 `console.error`） | 每个区域外包一层（§8） |
| W.08 | `ScrollArea` | `children`、`gutter?: 'stable'`（滚动条平时隐藏，指针进入才出现 6px 半透明滑块，`U.23-R20`、`U.09.02-R10`） | 侧栏、右侧栏各页、通知中心、命令面板结果 |

- 以上是必须有的 props；`W.08` 在叶子里补充的可选 props 列在 `W.08` §4.5（`P.09` K126），名称和类型以 `W.08.0x` §4 的代码块为准。
- 以上没列出的控件需求出现时，叶子先上报（`G.02.03`），由 `W.08` 补，不在 `panels/` 里自建通用控件。
- 控件一律不加边框，靠填充色和明暗分层；只有键盘焦点显示外环（`U.23-R5`；`U.11` §1 的"悬停外框 `line-3`"按 `U.23-R5` 不再使用，`P.09` K118）。

### 4.4 需要 `W.10` 提供的
- 文案：`useT()` 返回 `t(key, vars?)`；键名前缀按叶子分：`top.`、`ls.`、`insp.`、`chat.`、`mon.`、`dock.`、`comp.`、`float.`、`appr.`、`notice.`、`menu.`、`common.`（`U.15-R6`）。组件里不写中文字面量（`G.06-R4`）。
- 格式化：`fmtRelTime(iso)`（"2 分钟前"，悬停用 `fmtAbsTime` 显示本地时区绝对时间，`U.15-R4`、INV-23）、`fmtDuration(ms)`（"12 秒""3 分 05 秒"）、`fmtCost(micros)`（"¥0.42"，币种按 `P.09` Q9 默认人民币）、`fmtTokens(n)`（"3.2 万"）、`fmtCount(n)`。

### 4.5 依赖
`W.03` §4.2 的全部 hook（`useUiStore`、`useSessionStore`、`useCatalogStore`、`useGraphStore`、`useRunStore`、`useModelStore`、`useZoomPercent`、`useAppActions`、`useCanvasStores`、`useAppStores`）和各 store 的选择器；`W.05` 的 `useOps()`、`OpsApi`；`W.06.01` 的 `useCanvasCommands()`、`useCanvasEvent()`；`W.02.01` 的 `useNav()`；`W.02.03` 的 `themeController`、`useTheme`、`THEMES`；`W.02.04` 的 `keys`；`W.08` §4.3 的组件；`W.10` §4.4 的函数；依赖库只有 `react`、`react-markdown`、`rehype-sanitize`（`W.07.04`）、`@floating-ui/dom`（经 `W.08.04`）（`G.10` §3.3）。

## 5. 数据结构
- 协议类型从 `@/lib/protocol` 导入，store 状态类型从 `@/state/*` 导入（`W.01-R6` 的同一规则也适用于面板）；不重新声明协议结构（`G.02.05-R2`）。
- 本枝私有结构只有：`LocateTarget`、`EditBlock`（§4.2）、各叶子组件的 props 类型和组件内部临时状态（`useState`，`G.06.02-R1`）。
- 本枝新增的 localStorage 键（全部登记在 `W.03` §6.4，`P.09` K114）：`hx:pos:<dock|mini|nest>`（`W.07.06`）、`hx:nestcard-min`（`W.07.06`）、`hx:legend`（`W.07.06`）、`hx:lib-fav`、`hx:lib-recent`、`hx:lib-open`（`W.07.02`）、`hx:inbox-read`（`W.07.10`）、`hx:draft:<会话 ID>`（`W.07.07`，原有）。

## 6. 行为

### 6.1 挂在外壳的哪里（`W.02.02` §4.1）
| 外壳插槽 | 组件 | 叶子 |
|---|---|---|
| `<TopBar/>` | `TopBar`（内含 `notice/InboxButton`） | W.07.01 |
| `<LeftSidebar/>` | `LeftSidebar`（`lsOpen=false` 时渲染 `IconRail`） | W.07.02 |
| `<RightSidebar/>` | `RightSidebar`：`rsTab` 为 `insp` / `chat` / `mon` 时分别渲染 `PropsPage` / `ChatPage` / `MonitorPage` | W.07.03 / 04 / 05 |
| `<FloatLayer/>` | `Dock`、`MinimapFrame`、`NestCardFrame`、`ProposalBar`、`FloatReply`、`Composer`（从上到下：浮动回复 → 提议栏 → 对话框，居中于画布区域，`U.09.01-R3`） | W.07.06 / 09 / 08 / 07 |
| `<BannerSlot/>` | `BannerStack`（急停横幅、离线横幅、窄屏提示） | W.07.10 |
| 应用根（`App.tsx` 里 `AppShell` 的同级） | `ToastStack`、`LiveRegion`、`ConflictDialog`、`ContextMenu`、`QuickAdd`、`CommandPalette`（`React.lazy` 动态加载，`W.02` §6）、`KeysHelp` | W.07.10、W.07.11 |

### 6.2 引擎事件的去向（`W.06` §4.2）
| 引擎事件 | 订阅者 | 做什么 |
|---|---|---|
| `menu.open` | `W.07.11` `ContextMenu` | 在 `at` 打开对应目标的菜单（`U.13.05` §1） |
| `quickAdd.open` | `W.07.11` `QuickAdd` | 在 `at` 打开快速添加面板；带 `from` 时只列能接上的节点类型，带 `insert` 时插入到这条连线中间 |
| `inspect` | `W.07.03` | `ui.setRs(true, 'insp')`，属性页聚焦 `focus` 指定的位置 |
| `param.editLarge` | `W.07.03` | 打开右栏属性页并展开大编辑器 |
| `prompt.preview` | `W.07.03` | 打开"预览最终提示词" |
| `tree.locate` | `W.07.02` | 展开左栏结构区，那一行滚到可见并闪 900ms |
| `node.action{details}` | `W.07.05`（`W.06.01` §6.1 第 6 步已 `setRs(true,'mon')`） | 监控页打开当前运行并展开这个节点的执行 |
| `nav.enter`、`nav.leave`、`node.action{approve,deny,rerun}`、`popover.select`、`hovercard.*`、`ready` | `W.06.01`（`Canvas.tsx` / `CanvasOverlays`） | 不归面板 |

### 6.3 引擎命令的调用方
| 命令 | 调用方 |
|---|---|
| `fit`、`zoomBy`、`exec('tool.*' / 'node.quickAdd' / 'group' / 'layout.tidy' / 'view.fit' / 'undo' / 'redo')` | `W.07.06` 停靠栏 |
| `exec(…)` 其余动作 | `W.07.11` 右键菜单、命令面板（与快捷键执行同一个处理函数，`P.09` K104） |
| `addNode` | `W.07.02` 节点库点击添加、`W.07.11` 快速添加与命令面板"节点类型" |
| `locate`、`highlight` | 只经 `useLocate`（§4.2） |
| `peek` | `W.07.02` 结构树放大镜 |
| `mountSlot('minimap' / 'nestCard')` | `W.07.06` |
| `tidy` | `W.07.07` 的 `/整理布局`（不发给编排者，`W.06.11` §2） |

### 6.4 读写哪些 store
| 叶子 | 读 | 写（只经 action / `OpsApi`） |
|---|---|---|
| W.07.01 | session（会话名、急停、待审批）、graph（`crumbs`、`branches`、`sync`、`diags`）、run（当前运行状态、计时、费用）、model（`levelBadge`、`activity`）、catalog（模型）、ui（`layout`、`rsDot`、`bp`）、主题 | `session.rename`、`triggerEstop`；`run.start` / `pause` / `resume` / `cancel`；`model.setSessionLevel`；`graph.loadBranches`；`themeController.*`；`ui.setLs` / `setRs` |
| W.07.02 | session（列表、活动、`graphMeta`）、graph（`structureTree`、当前层）、run（`tick` → `scopeStatus`）、model（`scopesWithProposals`）、catalog（`presets`）、ui（`lsFold`） | `session.create` / `rename` / `setPinned` / `remove`；`ui.setLsFold`、`openCenter`；`cmd.addNode`、`cmd.peek` |
| W.07.03 | graph（选中的节点 / 连线 / 便签、`diagsOf`、`editingByOthers`）、catalog（`NodeDef`）、run（`live.stateOf` / `execsOf`、`nodeDetail`）、model（`activity`）、ui（选中、`listView`） | `ops.dispatch`、`gesture`、`setEditing`、`revertOp`；`run.fork`；`ui.setListView` |
| W.07.04 | session（`conversations`、`chat`）、model（提议）、run | `session.loadOlder` / `stop` / `retry`；`ops.revertOp`；经 `useLocate` |
| W.07.05 | run（`list`、`current`、`live`、`tick`、`logs`）、graph（`history`）、ui（`monitor`） | `run.loadList` / `focus` / `cancel` / `start` / `fork` / `timeline`；`graph.loadHistory`；`ops.revertOp` / `revertTo` / `redo`；`ui.setMonitor` |
| W.07.06 | ui（`tool`、`layout`）、graph（`boundaryLinks`、`crumbs`）、view 的缩放百分比（`useZoomPercent`） | `ui.setTool`；`cmd.*`；`useNav().leaveTo` |
| W.07.07 | session（当前会话、`chat`）、catalog（`models`、`settings`）、ui（选中） | `session.send` / `stop` / `upload` / `contextUsage` / `compact` / `clearMessages` / `setOrchestratorModel` / `setEffort`；`cmd.tidy` |
| W.07.08 | session（`lastAssistant`） | `ui.setRs(true, 'chat')` |
| W.07.09 | model（全部）、session（`approvals`） | `model.accept` / `reject` / `acceptAll` / `rejectAll` / `startReview` / `reviewStep` / `endReview` / `dismissStale`；`session.resolveApproval` / `resolveBatch`；`useNav().enterLayer` |
| W.07.10 | ui（`toasts`、`net`、`bp`）、session（`estop`、`approvals`、`inbox`、`onActivity`）、graph（`change`）、ops（`conflict`）、run（`budget`） | `ui.dismiss`；`session.releaseEstop`（**只在** `ReleaseEstopDialog`）、`resolveApproval`、`loadInbox`；`ops.resolveConflict`、`revertOp` |
| W.07.11 | ui（选中）、graph、catalog、session | `cmd.exec`、`cmd.addNode`；经 `useLocate`；各 action |

### 6.5 `U.23` 视觉精修在面板上的落实
| 规则 | 落在哪 |
|---|---|
| 90% 中性色（R1） | 面板底色、文字、分隔只用 `bg-*`、`text-*`、`line-*`；主色只出现在：运行中状态、当前运行的进度、选中项的指示（侧栏当前会话 / 当前层的浮起卡片不用主色）、唯一的主按钮；模型色只用于 AI 相关（模型胶囊呼吸点、提议栏左边线、AI 字样、对话框模型标签） |
| 实心主色只三处（R2、R14） | `W.07.01` 运行按钮、H 标识；`W.07.07` 有文字时的发送键。其余按钮透明底，悬停才出现填充；新建会话是主色浅底（11%）+ 主色文字（R22），不是实心 |
| 控件无边框（R5、R16） | 全部控件靠填充分层（`W.08`）；分区之间保留 1px 细分隔线或留白（侧栏、右栏、通知中心） |
| 玻璃浮层（R6） | 停靠栏、小地图、父图位置卡、对话框、浮动回复、提议栏、提示：`background: var(--hx-bg-glass)` + `backdrop-filter: blur(var(--hx-blur-glass)) saturate(1.6)`；其余面板（侧栏、右栏、菜单、对话框式弹窗）不用（`P.09` K112） |
| 流动高亮（R21） | `W.08` `GlideGroup`：左栏滚动区、图标栏、底部一排、停靠栏 |
| 滚动条悬停出现（R20） | `W.08` `ScrollArea`：左栏（预留滚动条位置）、右栏三页、通知中心、命令面板结果、对话框弹出列表 |
| 侧栏三级层级（R15、R17–R19） | `W.07.02` §6.1 |
| 少文字（R10–R13） | `W.07.01`：档位只剩刻度 + 数字、运行状态只在运行时出现、急停平时灰色图标、主题三粒色点、通知只是圆点、根图不显示面包屑和分支；全枝不常驻提示语和"没有选中"之类的说明 |

### 6.6 `U.24` 已改条目的最终效果在哪里实现
| # | 最终效果 | 叶子 |
|---|---|---|
| 1 | 左栏底部合成一排，不与任何内容重叠；节点库最后一项不被底栏压住 | W.07.02 |
| 2 | 左栏整体一个滚动区，全部展开也能滚到底 | W.07.02 |
| 3、6 | 按钮透明底 + 悬停填充；节点库筛选纯文字 + 下划线；条目图标无底板；顶部右侧图标默认 `text-3`、无底 | W.07.01、W.07.02 |
| 4 | 收起后图标栏与顶部左栏开关同一中线（开关左边距 = (56 − 30) / 2） | W.07.01、W.07.02 |
| 7、11 | 运行按钮、H 标识实心主色 | W.07.01 |
| 8、16、24 | 浮动回复：8 秒无操作自动收拢、悬停暂停计时、Esc 收拢；无 ×；回复标签 + 小尾巴 + 流动线条 | W.07.08 |
| 9、10 | 没有专注按钮；右栏只有顶部一个开关（悬停提示写 `F`） | W.07.01、W.07.03 |
| 12、13、18、23 | 侧栏三级层级与引导线；新建会话独立一行、居中、主色浅底、图标固定 14px | W.07.02 |
| 14 | 滚动条平时隐藏 | `W.08` `ScrollArea`（用在 W.07.02–05、W.07.10、W.07.11） |
| 15 | 流动高亮 | `W.08` `GlideGroup`（用在 W.07.02、W.07.06） |
| 17 | 思考强度按模型显示支持的几级，默认"中" | W.07.07 |
| 19 | 不用观察器改自己观察的属性（React 实现里没有 `MutationObserver` 改 class 的写法） | 全枝（W.07-R10） |
| 20 | 停靠栏、小地图、父图位置卡可拖动、吸附、记住位置、双击复位 | W.07.06 |
| 21 | 单击缩略图预览、双击进入 | `W.06.07`（面板不涉及） |
| 5、22 | 中心窗口角色卡、页面体积 | `W.09.02`、不适用（Vite 构建） |
| 待 demo 改 4 条 | 框选、选中色、图标色、端口提示 | `W.06`（面板不涉及） |

### 6.7 规则
| 编号 | 规则 |
|---|---|
| W.07-R1 | 一个文件一个组件；类名 BEM `hx-块__元素`、状态 `is-*`（`G.04.06`）；块名以目录为准：`hx-top`、`hx-ls`、`hx-rs`、`hx-insp`、`hx-chat`、`hx-mon`、`hx-dock`、`hx-mini`、`hx-nestcard`、`hx-comp`、`hx-float`、`hx-pbar`、`hx-appr`、`hx-toast`、`hx-banner`、`hx-inbox`、`hx-cmenu`、`hx-qadd`、`hx-palette`、`hx-keys` |
| W.07-R2 | 样式只用令牌（`G.06.03-R1`、`R8`）；几何量（拖动位置、线条路径、标签轮廓）以常量写在对应 `.ts` 文件并注释出处，不写进 CSS 的颜色、字号、间距、时长（`P.09` K112） |
| W.07-R3 | 界面文案全部来自 `useT()`（`W.10`），用词以 `P.06` 为准（"子图""停靠栏""浮动回复""监控""属性""思考强度""端口"）；用户和模型写的文字只作为文本节点渲染，不用 `dangerouslySetInnerHTML`（`G.06.01-R10`）；Markdown 只经 `chat/Markdown`（`W.07.04`） |
| W.07-R4 | 组件不直接发请求，不 import `@/lib/protocol/client` 和 `RestClient`：只调 store 的 action、`useOps()`、引擎命令（`W.01-R13`、`G.06.01-R4`） |
| W.07-R5 | 修改图只经 `useOps()`（`dispatch`、`gesture`、`revertOp`、`revertTo`、`undo`、`redo`）；一次用户动作一次 `dispatch`（`C.05-R3`）；`useOps()` 为 null 或 `useEditBlock()` 不为 null 时，编辑类控件置灰并用提示框说明原因（`U.11` §1、`U.14.05`） |
| W.07-R6 | 浮层（菜单、弹层、提示框、确认框、命令面板、通知中心）一律用 `W.08.04` 的 `Overlay` / `Popover` / `Menu` / `Dialog` 渲染到顶层容器，层级按 `U.06` §3（`G.06.01-R9`）；打开时焦点移入，关闭后回到触发元素（`U.16-R6`） |
| W.07-R7 | 图标按钮都有 `aria-label` 和提示框；有快捷键的提示框显示 `keys.label(id)` 的结果，不手写按键文字（`U.08-R5`、`W.02.04` §6.4） |
| W.07-R8 | 快捷键只经 `useShortcut` 注册（`W.02.04` §7）；组件里不写 `addEventListener('keydown')`；不注册任何能解除急停的快捷键（`W-R6`） |
| W.07-R9 | `releaseEstop` 只在 `notice/ReleaseEstopDialog` 的确认按钮里调用（`W.03.05` §7 的 ESLint 规则覆盖整个 `panels/`） |
| W.07-R10 | 订阅 store 必须带选择器；返回对象或数组时传 `shallow` 或返回 store 里已有的引用（`G.06.02-R3`）；不订阅 `run.live`、`view.view` 这类高频数据（只订阅 `tick`、`useZoomPercent`，`W-R2`）；不用 `MutationObserver` 改自己观察的元素（`G.02.05` §补充） |
| W.07-R11 | 每处由模型产生的内容（消息、提议、修改、操作历史条目、通知）都显示 AI 标记或模型色，数据来自 `actor` / `origin`（`W-R14`、`U.12` §2） |
| W.07-R12 | 动画只动 `transform`、`opacity`（`U.07.01` §2）；JS 动画（浮动回复线条、流动高亮）在 `themeController.get().reducedMotion` 为真时按 `U.07.04` 替代；组件出现、消失的动画时长只用 `--hx-t-*`（浮动回复线条用 `--hx-t-flow`，`P.09` K112） |
| W.07-R13 | 加载状态按 `U.14.01`：< 300ms 不显示；300ms–2s 局部旋转弧；> 2s 加说明文字；切换会话时旧内容保留到新内容就绪（`U.14.01-R3`） |
| W.07-R14 | 错误按 `U.14.03` 分级显示，同一个问题只在一处报一次（`U.14-R3`、`G.13-R7`）：action 的 Promise 拒绝由调用它的面板决定显示在行内还是提示；`W.05` 已提示过的（`rejected`、`dropped`、`merged`）面板不再提示 |

## 7. 不变量
- 面板没有任何直接修改图数据、直接发请求、直接写 DOM 到画布引擎元素里的代码路径（`mountSlot` 给出的空容器除外，`W.01-R10`）。
- 任何时候顶部条急停按钮可见、可用（`/welcome` 除外，`U.14.04-R1`、`W.02.02` §6.5）；没有任何面板上的入口能让 AI 解除急停。
- 平移、缩放、拖动、运行状态更新期间，面板的 React 提交只有：缩放停下后的缩放百分比 1 次、`tick`（≥ 400ms 一次）驱动的结构树状态点和监控页（≥ 700ms 一次）（`U.17-R10`、`R11`）。
- 选中节点不会让右侧栏打开（`U.09.02-R1`）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| action 的 Promise 以 `ApiError` 拒绝 | 调用方按 `U.14.03` §1 分级显示：字段级 → 控件下方红字；操作级 → `ui.notify({level:'error'})`（文案用服务端 `message` 或 `W.10` 按 `code` 的文案） |
| `NetError` / 断开 | 不单独提示（离线横幅已经说明，`U.14.05`）；编辑类控件置灰 |
| 423 `estopped` | 不单独报错（急停横幅已说明，`U.14.03` §2） |
| 面板渲染抛错 | 每个区域外包一个错误边界（`ErrorBoundary`，`W.08` 提供）：区域内显示"这里出了问题 · 重新加载这一块"，不影响其他区域和画布；`console.error` |
| 引擎未就绪（`useCanvasCommands()` 为 null） | 停靠栏、菜单里依赖引擎的项置灰；`useLocate` 返回 `blocked` |

## 9. 性能与资源
- 每个面板组件只订阅自己显示的字段；会话切换时允许一次外壳级重渲染，切换总时长 ≤ 300ms（`U.17` §1）。
- 长列表（会话 > 200 项、节点库 > 500 项、消息 > 200 条、日志 2000 行、操作历史）只渲染可见部分加上下各 10 行的缓冲（简单的定高窗口化，不引入依赖，`G.10-R3`）。
- 面板的打开、关闭、切换标签页反馈 ≤ 100ms（`U.17` §1）；命令面板首次打开（含动态加载）≤ 300ms。

## 10. 验收标准
1. 11 个叶子的验收全部通过。
2. 1440、1180、1100、900、760 五个宽度 × 浅色 / 深色截图：没有重叠、没有截断看不到的按钮（`U.09.03` §2、`U.20`）。
3. 200 节点的图上平移、拖动、30 个节点同时运行 10 秒：React Profiler 里面板的提交只来自 `tick` 驱动的结构树、监控页，频率 ≤ 2.5 次 / 秒（`U.17-R10`、`R11`、`W.11`；按 `W.11` 的性能区域统计，即只有 `ls`、`rs` 区域有提交，`P.09` K167）。
4. 只用键盘能完成：新建会话 → 发一条消息 → 打开右栏属性页改一个参数 → 打开监控页定位一个步骤 → 用命令面板运行（`U.16-R3`）。
5. 打开减少动效：浮动回复线条、流动高亮、分段滑块、呼吸点全部变为静态替代，状态仍能分辨（`U.07.04` §3）。
6. ESLint：在 `panels/` 里 import `@/lib/protocol/client`、`graphWriter`、`canvas/core/**` 报错；在 `notice/ReleaseEstopDialog.tsx` 以外出现 `releaseEstop` 报错；`dangerouslySetInnerHTML` 报错。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版：目录与分工、共用 hook、`W.08` 需求表、引擎事件与命令的去向、视觉规则与 `U.24` 落实表 | 第 8 棒；`P.09` K111–K120 |
| 2026-11-23 | §4.3：`Overlay` 经 `UiEnv` 压栈并加 `onKey` 等；`Menu` 的 `at` 可为元素、`MenuItem` 加 `run` / `model` / `checked`；`Picker` 加 `PickerHandle`；`Dialog` 加 `dismissible` / `busy` / `error`；`Toast` 的 `action` 改为 `actions` 并加 `onHover`；指向 `W.08` §4.5 | 第 9 棒写 `W.08`；`P.09` K121、K126 |
| 2026-11-23 | §10 验收 3 写明按性能区域统计 | 第 10 棒写 `W.11`；`P.09` K167 |
