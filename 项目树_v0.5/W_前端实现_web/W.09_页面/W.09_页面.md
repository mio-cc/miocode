# W.09 页面

| 项 | 内容 |
|---|---|
| 编号 | W.09 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | W.09.01 会话首页与空状态、W.09.02 中心窗口：设置与资源库、W.09.03 首次引导页、W.09.04 中心窗口：包与连接、W.09.05 运行历史与回放 |
| 状态 | 草稿 |
| 素材 | 设11、设14；demo v0.5（v0.5.11）`34_center.js`、`38_hub.js`、`35_inbox.js`（首次引导）、`12_center.css`、`33_config.js`（只作字段参考）；`主流harness对照.md`；`U.14.02`、`U.18`、`U.21`；`P.09` K141–K157 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`web/src/pages/`：会话页以外、或覆盖在会话页之上的整页界面——会话首页与画布上的空状态、中心窗口（包 · 连接 · 资源库 · 设置四个分区）、首次引导与画布导览、运行历史与回放。它们和 `W.07` 面板一样只从 store 读数据、经 store 的 action 与 `useOps()` 写数据；页面里的大部分内容按声明（包的贡献、连接类型字段、包的设置、模板的 `inputs`）自动生成。

本文把 5 个叶子的分工、目录、挂载位置、中心窗口的寻址方式、页面共用的表单控件生成规则、需要上层新增的 store 接口一次定下来；叶子只细化本文。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 路由表、URL 解析、`/welcome` 的跳转判断 | `W.02.01`（本枝只提供页面组件） |
| 外壳网格、页面模式下侧栏 `inert`、急停按钮始终可用 | `W.02.02`（本枝通过 `AppShell` 的 `page`、`canvasOverlay`、`cover` 三个插槽挂载，§6.1） |
| 会话页上的面板（顶部条、侧栏、对话框、通知中心、命令面板、确认框里的急停解除） | `W.07`（本枝复用 `W.07.09` 的 `ApprovalCard`；急停只显示状态，不复用、也不提供解除入口） |
| 基础控件（按钮、输入、选择、浮层、提示）的实现 | `W.08`（本枝只组合 `W.07` §4.3 表里的组件，§4.4） |
| 服务器数据的存放与请求 | `W.03`（本枝要的 `hubStore` 接口在 `W.03` §4.6，`P.09` K143） |
| 画布的绘制：回放画布、子图库预览 | `W.06`（`CanvasKind` 为 `replay`、`library`，本枝只组装 store 和挂 `<Canvas>`） |
| 授权判定、密钥存储、扩展包与 MCP 的确认校验 | 后端（`W-R4`、`S.03`、`S.08`；本枝只显示后端给的信息并提交用户的确认） |
| 文案表、金额与时间格式化 | `W.10`（§4.5） |
| 插件市场、在线检查更新、定时任务 | 非目标（`P.02`；`G.02.05-R32`） |

## 3. 继承的上级约束
`W-R2`–`R14`；`W.01-R5`、`R7`、`R13`、`R14`、`R18`、`R19`；`W.01` §3.2（`pages/` 目录）、§3.6（demo 迁移对照）；`W.02` §6（首屏不加载中心窗口、引导、运行历史）；`W.02.02` §4.1、§6.5；`W.03` §4.2–§4.6；`W.05` §4.1；`W.06` §4.2（`CanvasKind`）、§6.6（只读）；`W.07` §4.3、§6.7（`W.07-R1`–`R14` 对页面同样适用，块名见 §6.6）；`G.06-R4`、`R5`；`G.06.01`（全部）；`G.06.02-R1`、`R2`、`R3`、`R7`、`R8`；`G.06.03`（全部）；`G.02.05-R20`、`R23`、`R26`、`R32`；`U.14` 全部；`U.15`；`U.16`；`U.18`；`U.21`（R1–R11）；`U.22`；`U.23`；`S.03-R4`、`R5`；`S.08`；`S.11-R4`、`R6`；INV-10、INV-13、INV-22、INV-24；`P.09` K141–K157。

## 4. 接口

### 4.1 目录与分工
```
web/src/pages/
├─ home/          W.09.01  HomePage（`/` 没有会话时）、CanvasEmpty（空白画布 / 当前层为空 / 没有可用模型）、TemplateCards；startFromTemplate.ts
├─ center/        W.09.02  CenterHost（App.tsx 懒加载的入口）、CenterWindow、SectionTabs、CenterNav、CenterSearch、SideSheet、PageHead、SettingRow、FieldControl、SaveState；
│                          registry.ts（CENTER_PAGES、LEGACY_ITEMS、parseItem、navOf）、search.ts、settingDefs.ts
│  ├─ settings/   W.09.02  GeneralPage、AppearancePage、KeysPage、DefaultModelsPage、AuthzPage、LayerMandate、BudgetPage、PricingSheet、PoolsPage、DataPage、PurgeDialog、AccessPage、AboutPage、PackageSettingsPage
│  ├─ library/    W.09.02  RoleCardsPage、RoleCardSheet、RecipesPage、TypesPage、SubgraphsPage、SubgraphDetail、LibraryPreview、TemplatesPage
│  ├─ packages/   W.09.04  PackagesPage、PackageDetail、ContribList、ToolRow、McpConfirmDialog、ExtConfirmDialog、AddMcpSheet、InstallSheet、PackageMoreMenu
│  └─ connections/ W.09.04 ConnectionsPage、ConnectionDetail、NewConnectionSheet、TypePicker、ConnectionForm、SecretField、TestResult、UsagesList
├─ welcome/       W.09.03  WelcomePage、StepWelcome、StepModel、StepTemplate、StepInputs、Tour、TourBubble；tourSteps.ts
└─ history/       W.09.05  HistoryCover、HistoryPage、HistoryRunList、ReplayView、ReplayToolbar、Scrubber、RunSummary；useReplayStores.ts、scrub.ts
```
- 一个文件一个组件，旁边放同名 `.css` 和 `.test.tsx`（`G.06.01-R1`）；写了 `.ts` 的是纯函数或 hook。
- 跨叶子只 import 对方目录导出的组件：`W.09.03` 用 `home/TemplateCards`、`connections/ConnectionForm`；`W.09.02` 的模板页用 `home/TemplateCards`；`W.09.04` 用 `center/` 的 `SideSheet`、`PageHead`、`SettingRow`、`FieldControl`。
- `pages/` 可以 import `panels/` 的导出组件（`W.01-R5`）；不 import `canvas/core/**`，只用 `@/canvas/Canvas` 和 `W.06.01` 导出的 hook。`panels/` 不能 import `pages/`（依赖方向）。

### 4.2 中心窗口的寻址（`P.09` K141）
`ui.center = { section, item? }`（`W.03.03`）。`item` 的写法由 `center/registry.ts` 唯一解析，所有调用方（`W.07.01`、`W.07.02`、`W.07.07`、`W.07.10`、`W.07.11`、`W.06.01`、本枝）只传下表的字符串：

| section | item | 打开什么 |
|---|---|---|
| `settings` | 缺省 / `general` · `notify` · `appearance` · `keys` · `models` · `authz` · `authz:<scope>` · `budget` · `pricing` · `pools` · `data` · `access` · `about` · `help` · `pkg:<包 id>` | 通用（`notify` 滚到通用页的"通知"组）· 外观 · 快捷键 · 默认模型 · 授权与安全（`authz:<scope>` 展开"这一层的授权"）· 预算与用量（`pricing` 打开价格表侧拉表单）· 并发与限流 · 数据与存储 · 本机访问与命令行 · 关于与诊断（`help` 滚到"帮助"组）· 包的设置里某个包 |
| `library` | 缺省 / `rolecards` · `rolecard:<ref>` · `recipes` · `types` · `subgraphs` · `subgraph:<name>` · `templates` | 角色卡 · 上下文配方 · 数据类型 · 子图库 · 模板 |
| `packages` | 缺省 / `core` · `mcp` · `extensions` · `skills` · `<包 id>` · `add-mcp` · `install` · `import-skill` | 包列表的各组 · 包详情 · 接入 MCP / 安装扩展包 / 导入技能的侧拉表单 |
| `connections` | 缺省 / `all` · `group:<分组>` · `<连接 id>` · `new` · `new:<连接类型 id>` | 连接列表 · 某一分组 · 连接详情 · 新建连接（先选类型 / 直接填某类型） |

```ts
// web/src/pages/center/registry.ts（实现归 W.09.02）
import type { CenterSection } from '@/state/uiStore';
export type CenterTarget =
  | { section: CenterSection; page: string; anchor?: string; arg?: string; sheet?: string };   // page：左侧导航项；anchor：页内分组；arg：scope / 包 id / 连接 id；sheet：侧拉表单
export function parseItem(section: CenterSection, item?: string): CenterTarget;     // 不认识的 item → 该分区第一页（不报错）
export const LEGACY_ITEMS: Readonly<Record<string, { section: CenterSection; item?: string }>>;   // U.21-R3，§6.4
export type CenterPage = { section: CenterSection; id: string; labelKey: string; icon: string; group?: string; leaf: 'W.09.02' | 'W.09.04';
  load: () => Promise<{ default: React.ComponentType<CenterPageProps> }>;   // 每页再分一次 chunk
  keywords?: readonly string[] };                                          // 搜索用的额外词（§6.5）
export type CenterPageProps = { target: CenterTarget; query: string };    // query：左上搜索框的文字（U.21-R2）
export const CENTER_PAGES: readonly CenterPage[];
```
- `W.07.11` 的 `SETTING_ITEMS` 必须是 `CENTER_PAGES` 里 `section`、`id` 的子集，测试 `W0902-T3` 同时 import 两边比对（`panels/` 不能 import `pages/`，所以两份数据各写一份，用测试保证一致）。

### 4.3 需要上层新增的
| 位置 | 新增 | 用在 | 登记 |
|---|---|---|---|
| `W.03` §4.6（实现在 `W.03.05` 实施卡） | 应用级 `hubStore`：包、MCP 服务、扩展包、工具、连接类型、连接、角色卡、配方、数据类型、子图库、模板、价格表、用量的列表与动作；`patchSettings` | 全部叶子 | K143 |
| `W.03` §4.5 | `libSigs`、`ensureLibSig`（子图库条目的端口签名）、`settingOf(settings, path, fallback)` | `W.06.10`、`W.07.07`、`W.07.10`、`W.09.02` | K142、K145 |
| `W.03.03` | `history`、`openHistory`、`closeHistory`；`tour`、`setTour`；`libQuery`、`revealInLibrary` | `W.09.05`、`W.09.03`、`W.09.04` | K146、K147、K149 |
| `W.02.02` §4.1 | `AppShell` 新增 `canvasOverlay?`、`cover?` 两个插槽 | `W.09.01`、`W.09.03`、`W.09.05` | K146、K148 |
| `W.02` §6、`App.tsx` | `ui.center` 非空时懒加载 `pages/center/CenterHost` | `W.09.02` | K141 |
| `C.16`、`B.04.06`、`B.04.03`、`B.04.12` | 连接请求体的 `secrets`、响应的 `secret_tails`；`LibraryItem.ports`、`?as=graph`；`GET /usage`；技能 zip 安装 | `W.09.02`、`W.09.04` | K144、K145、K150、K152 |

### 4.4 用到的 `W.08` 组件
只用 `W.07` §4.3 表里的组件（名称和 props 以该表为准）：`Button`、`IconButton`、`Kbd`、`TextInput`、`TextArea`、`NumberStepper`、`Slider`、`SearchInput`、`Select`、`Segmented`、`Switch`、`Tabs`、`Picker`、`Overlay`、`Popover`、`Menu`、`Dialog`、`Tooltip`、`Toast`（经 `ui.notify`）、`Badge`、`StatusDot`、`Spinner`、`ProgressBar`、`EmptyState`、`Icon`、`GlideGroup`、`ErrorBoundary`、`ScrollArea`。
- 选择文件（扩展包 zip、技能 zip）用隐藏的原生 `<input type="file">`，由 `Button` 触发（`G.06.01-R6`）；不另建上传控件。
- 表格（价格表、快捷键、档位矩阵）用原生 `<table>` 加页面自己的 CSS；不另建通用表格组件。
- 表中没有、页面又必须用的控件：先上报（`G.02.03`），由 `W.08` 补。

### 4.5 需要 `W.10` 提供的
- 文案键前缀：`home.`、`center.`、`set.`、`lib.`、`pkg.`、`conn.`、`welcome.`、`tour.`、`hist.`（`U.15-R6`）。组件里不写中文字面量（`G.06-R4`）；包、连接类型、设置项、模板自己声明的 `label` / `help` / `description` 是数据，原样显示。
- 格式化：`W.07` §4.4 的 `fmtRelTime`、`fmtAbsTime`、`fmtDuration`、`fmtCost`、`fmtTokens`、`fmtCount`；另需 `fmtBytes(n)`（"1.2 GB"，数据与存储页）、`parseCostInput(text): number | null`（"0.42" → 420000 micros，价格表与预算输入，`C.01-R9` 整数）。

### 4.6 依赖
`W.03` §4.2 的 hook 与 §4.5、§4.6 的目录 store、`hubStore`；`W.03.03`（`center`、`history`、`tour`、`libQuery` 与对应 action、`notify`）；`W.03.05`（`create`、`rename`、会话列表、`estop`）；`W.03.04`（运行列表、快照模式）；`W.03.01`（`createGraphStore` 的只读用法，限 `pages/history/` 与 `pages/center/library/`）；`W.03.02`（`createViewStore({persist:false})`）；`W.05` 的 `useOps()`；`W.06.01` 的 `<Canvas>`、`useCanvasCommands`；`W.02.01` 的 `useNav`；`W.02.03` 的 `themeController`、`THEMES`；`W.02.04` 的 `keys`（`list()`、`label()`、`pushOverlay`）；`W.07.09` 的 `ApprovalCard`；`W.08`（§4.4）；`W.10`（§4.5）。依赖库只有 `react`、`react-router`、`zustand`（`G.10` §3.3）。

## 5. 数据结构
- 协议类型（`Package`、`NodePreset`、`SettingDef`、`ConnectionType`、`Connection`、`ToolDef`、`McpServer`、`Extension`、`RoleCard`、`Recipe`、`TypeDef`、`LibraryItem`、`Template`、`PricingTable`、`Settings`、`RunMeta`、`RunView`、`Bar`、`Mandate`、`Effective`）一律从 `@/lib/protocol` 导入（`W.04.04-R1`），本枝不重新声明（`G.02.05-R2`）。
- 本枝私有：`CenterTarget`、`CenterPage`（§4.2）、`FieldSpec`（§6.3）、`TourStep`（`W.09.03`）、`ScrubState`（`W.09.05`）。

## 6. 行为

### 6.1 挂在哪里
| 页面 | 挂载者 | 插槽 | 何时加载 |
|---|---|---|---|
| 会话首页（没有会话） | `W.02.01` 的 `/` 路由 | `AppShell mode='session'` 的 `canvasOverlay`（画布为空白画布） | 首屏，静态 import（它就是首屏） |
| 空白画布、当前层为空、没有可用模型 | `SessionRoute`（`W.02.01`） | `canvasOverlay` | 静态（很小） |
| 中心窗口 | `App.tsx`（`W.02`） | 顶层 `Overlay layer='modal'` | `ui.center` 第一次非空时动态 `import()` |
| 首次引导 | `/welcome` 路由 | `AppShell mode='page'` 的 `page` | 动态 `import()` |
| 画布导览（引导第 5 步、"重新查看导览"） | `SessionRoute` | `canvasOverlay`（与空状态互斥：导览优先） | `ui.tour` 为真时动态 `import()` |
| 运行历史与回放 | `SessionRoute` | `cover`（盖住画布区域，主画布保持挂载） | `ui.history` 第一次非空时动态 `import()` |

- `canvasOverlay` 渲染在画布之上、浮动层之下，自身 `pointer-events: none`，只有卡片和按钮接收指针（对话框照常可用，`U.09-R2`）。
- `cover` 渲染在画布区域内、盖住画布和浮动层（`position: absolute; inset: 0`，`bg-1`）；主画布引擎不销毁（回来时不重建 DOM 池）；顶部条、侧栏照常可用。

### 6.2 数据怎么来
1. 页面挂载时调 `hub.load(kind)`（已加载且不到 60 秒不重拉）；列表在 `hubStore`，选择器只取当前页要的字段（`G.06.02-R3`）。
2. 改动一律调 `hubStore` / `catalog` / `session` 的 action，Promise 拒绝时按 §8 显示；成功后 store 自己更新列表（页面不手动改列表）。
3. 设置项的值从 `catalog.settings` 读（`settingOf`），改动调 `hub.patchSettings({path: value})`，它成功后调 `catalog.setSettings`。
4. 图相关的改动（档位挂载 `set_mandate`、插入子图引用、存入子图库后改为引用）经 `useOps()` 或引擎命令，不经 `hubStore`（`W-R3`）。

### 6.3 按声明生成控件（`U.21-R5`）
`center/FieldControl.tsx` 是本枝唯一的"声明 → 控件"映射，设置项（`SettingDef`，`C.15`）、连接字段（`ConnectionType.fields`，`C.16`）、模板输入（`Template.inputs`，`C.13.04`）都先转成 `FieldSpec` 再交给它：
```ts
// web/src/pages/center/FieldControl.tsx（W.09.02）
export type FieldSpec = {
  key: string; label: string; help?: string; placeholder?: string; required?: boolean;
  kind: 'text' | 'url' | 'number' | 'select' | 'segment' | 'switch' | 'secret' | 'textarea';
  options?: readonly { value: string; label: string }[];
  min?: number; max?: number; step?: number; unit?: string;
  default?: unknown;
};
export function fromSettingDef(d: SettingDef): FieldSpec;          // text/number/select/segment/switch
export function fromConnField(f: ConnectionTypeField): FieldSpec;  // text/secret/number/url/select
export function fromTemplateInput(i: TemplateInput): FieldSpec;    // C.13.04 inputs
type FieldControlProps = { spec: FieldSpec; value: unknown; onChange(v: unknown): void; onCommit?(v: unknown): void;
  error?: string; disabled?: boolean; disabledReason?: string; secretTail?: string };   // secretTail：已存密钥的末 4 位（只显示，不回填）
export function FieldControl(p: FieldControlProps): JSX.Element;
```
| `kind` | 控件 | 提交时机 |
|---|---|---|
| `text`、`url`、`textarea` | `TextInput` / `TextArea` | `onCommit`（Enter、失焦） |
| `number` | `NumberStepper` | `onEnd` |
| `select` | `Select`（选项 > 8 个时 `filterable`） | 选中即提交 |
| `segment` | `Segmented` | 选中即提交 |
| `switch` | `Switch` | 切换即提交 |
| `secret` | `TextInput type=password`，`autocomplete="off"`，下方一行"密钥只保存在本机系统密钥库里，不会出现在日志和导出文件中"（`U.19.07` §1 第 3 步）；已有值时占位文字为 `…{末 4 位}`、"留空表示不修改" | 只在侧拉表单的"保存"里提交 |

- 不按包 ID、连接类型 ID、设置键写分支（`U.21-R5`；同 `G.02.05-R9` 的精神）：新增一类东西只需要后端声明，页面不改。
- 不认识的 `type` → 按 `text` 显示并在 `console.debug` 记一次（`C.01-R18` 的前端对应）。

### 6.4 旧入口跳转（`U.21-R3`）
`openCenter` 收到旧的写法时，`CenterWindow` 先查 `LEGACY_ITEMS` 换成新目标再显示，并 `ui.openCenter` 写回新值（不新增历史，中心窗口本来不进 URL）：
| 旧 | 新 |
|---|---|
| `settings/models`（旧"模型与提供方"）、`settings/providers`、`settings/secrets` | `connections/group:模型` |
| `settings/tools` | `packages/core` |
| `settings/mcp` | `packages/mcp` |
| `settings/skills` | `packages/skills` |
| `settings/extensions`、`settings/exts` | `packages/extensions` |
注意：新的 `settings/models` 是"默认模型"页；旧调用方（demo 的 `models` 页 ID）只出现在 `LEGACY_ITEMS` 里，用 `legacy:` 前缀区分：`openCenter('settings', 'legacy:models')`。产品代码里不再产生旧写法，表只为命令面板的旧关键词和外部链接保留。

### 6.5 搜索（`U.21-R2`）
左上搜索框只在当前分区内搜：设置分区搜页名、分组标题、`SettingRow` 的标题与说明、包声明的设置项 `label`；资源库搜条目名与说明；包分区搜包名、包带来的节点与工具名；连接分区搜连接名、连接类型名。命中具体一行时切到那一页、滚动到那一行并用 `--hx-focus` 浅底高亮 1.6 秒（`U.10.05` §2 的"看这里"时长）。搜索索引由 `center/search.ts` 从 `CENTER_PAGES.keywords` 和 store 里的数据建立，不渲染页面也能搜到。

### 6.6 样式块名
`hx-home`、`hx-empty`（空状态卡片）、`hx-ctr`（中心窗口）、`hx-ctr__nav`、`hx-sheet`（侧拉表单）、`hx-sr`（设置行）、`hx-sc`（设置卡片）、`hx-pkg`、`hx-conn`、`hx-lib`、`hx-onb`（引导）、`hx-tour`、`hx-hist`（`G.04.06`、`W.07-R1`）。

### 6.7 规则
| 编号 | 规则 |
|---|---|
| W.09-R1 | 页面只组合 `W.07` 面板和 `W.08` 组件；不在 `pages/` 里自建通用控件（§4.4） |
| W.09-R2 | 页面不发请求、不 import `@/lib/protocol/client`：数据只经 store 的 action（`W.01-R13`、`W.07-R4`） |
| W.09-R3 | 包的贡献、连接类型的字段、包的设置、模板的输入都按声明生成（§6.3）；代码里不出现具体的包 ID、连接类型 ID、模板名（测试夹具除外）（`U.21-R5`） |
| W.09-R4 | 中心窗口里的修改即时生效、自动保存，不设"保存"按钮；只有侧拉表单（新建连接、编辑连接、接入 MCP、安装扩展包、编辑角色卡、价格表）有"保存 / 取消"（`U.21-R1`）。保存结果在行尾显示："已保存"（1.6 秒后淡出）、"重启后生效"（`restart_required`，常驻）、"下次运行生效"（`next_run`，常驻），来自 `PATCH /settings` 的响应（`G.11-R4`） |
| W.09-R5 | 输入密钥的控件提交后（成功或失败）立即清空；密钥不进任何 store、localStorage、URL、日志、`console`；界面只显示后端给的末 4 位，不提供"查看完整密钥"（`W-R10`、INV-22、`S.03-R5`、`B.04.07` §5） |
| W.09-R6 | 中心窗口、首次引导、画布导览、运行历史在首屏不加载，用动态 `import()`；中心窗口的每一页再各分一个 chunk（`W.02` §6，`U.17` §1） |
| W.09-R7 | 删除、卸载、断开、彻底删除这类不可撤销的操作用 `Dialog` 确认，确认框列出受影响的图和节点（来自后端的 `usages` 或 409 的 `details`）；彻底删除要求输入"删除"（`S.11-R6`、`U.11` §2、`U.19.07` §3） |
| W.09-R8 | 扩展包首次启用、权限变多的升级、MCP stdio 服务的首次启用和改命令，都先显示后端返回的完整信息（来源、版本、签名状态、权限清单；完整命令和参数），用户点确认后才调确认接口（`S.08-R2`、`R4`、`R8`）；未签名写"未签名，无法确认作者"（`S.08-R3`） |
| W.09-R9 | 左侧导航项右侧只在异常时显示标记（出错 `danger`、待确认 `wait`、未启用 `text-3` 字），正常不显示数字（`U.21-R4`） |
| W.09-R10 | 回放画布、子图库预览是只读画布实例：各自建 `persist:false` 的 view store 和只读 graph store，`CanvasStores.readonly = true`，`model = null`（`W-R11`、`W.06` §6.6、`G.06.02-R2`）；页面关闭时销毁 |
| W.09-R11 | 不做非目标：没有在线插件市场、没有"检查更新"的网络请求、没有定时任务入口；demo 里规范没有的设置项（界面密度、界面缩放、连线样式、启动时打开、新会话自动命名）不做（`P.02`、`W.01-R19`，`P.09` K151） |
| W.09-R12 | 急停：页面只显示急停状态，任何地方都不提供解除入口；解除只在顶部急停横幅里由 `W.07.10` 的 `ReleaseEstopDialog` 确认（`W-R6`、`W.07-R9`；`releaseEstop` 的 ESLint 限制同样覆盖 `pages/`） |

## 7. 不变量
- 页面没有直接改图数据、直接发请求的代码路径；图的改动只经 `useOps()` 和引擎命令。
- 任何时候页面里看不到完整密钥；输入过的密钥在表单关闭后不留在内存里的任何 store 中。
- 中心窗口关闭后，它打开过的只读画布（子图库预览）全部销毁；运行历史关闭后回放画布销毁，主画布未被重建。
- 页面代码里没有具体的包 ID、连接类型 ID、设置键分支（`center/settingDefs.ts` 里全局设置项的登记表除外，§6.3）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| action 以 `ApiError` 拒绝 | 字段级（400 带 `details.field`）→ 该字段下方红字；操作级 → `ui.notify({level:'error'})`（`U.14.03` §1） |
| 409（被图引用时删除、卸载） | 不报错提示，改为打开确认框列出 `details` 里的图和节点（`W.09-R7`） |
| 422 `extension_invalid` | 安装表单里显示后端给的文件和行号（`C.15` §7、`E.04` §7） |
| 423 `estopped` | 不单独报错（急停横幅已说明） |
| `NetError` / 断开 | 不单独提示（离线横幅已说明）；即时生效的控件置灰并在提示框说明"连接恢复后才能修改" |
| 页面 chunk 加载失败 | 中心窗口内容区显示"这一页没有加载出来 · 重试"（`ErrorBoundary`）；不影响其他分区 |
| 页面渲染抛错 | 每个页面外包 `ErrorBoundary`（`W.07` §8） |

## 9. 性能与资源
- 首屏不包含 `pages/center/`、`pages/welcome/`、`pages/history/` 的代码（`W0902-T1` 用构建产物检查）。
- 中心窗口打开到第一页可交互 ≤ 300ms（含 chunk 加载；`U.17` §1）；切换分区、切换页 ≤ 100ms（已加载时）。
- 列表超过 200 行（工具、连接、子图库、运行历史）只渲染可见部分加上下各 10 行（`W.07` §9 的做法）。
- 回放画布与主画布同时存在时，主画布引擎不做重绘之外的工作（它被盖住，`W.06.05` 视口裁剪仍有效）。

## 10. 验收标准
1. 5 个叶子的验收全部通过。
2. 首屏网络请求里没有中心窗口、引导、运行历史的 chunk；`Ctrl+,` 后才出现（`W.02` §6）。
3. 新装一个带设置项和连接类型的测试扩展包：不改前端代码，"设置 › 包的设置"、包详情、"新建连接"里都出现对应表单（`U.21-R5`、`C.15-R4`、`C.16` §8 验收 1）。
4. 全程在任一页面输入过密钥后：localStorage、sessionStorage、store 快照（测试钩子导出）、`console` 输出里搜不到密钥原文（`W.09-R5`）。
5. 1440、1180、900、640 四个宽度 × 浅色 / 深色截图：中心窗口导航与分区切换按 `U.21-R8`–`R11` 显示，没有重叠和截断。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版：目录与分工、挂载位置、中心窗口寻址、声明生成控件、旧入口跳转、上层新增接口表、`W.09-R1`–`R12` | 第 9 棒（B）；`P.09` K141–K157 |
