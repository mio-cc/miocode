# W.09.02 中心窗口：设置与资源库

| 项 | 内容 |
|---|---|
| 编号 | W.09.02 |
| 类型 | 实施 |
| 上级 | W.09 页面 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5（v0.5.11）`34_center.js`（中心窗口外壳、设置 15 页、资源库 5 页）、`12_center.css`、`33_config.js`（只作字段参考）；`U.21`；`G.11`；`P.09` K115、K141–K143、K145、K151–K155 |
| 最后修改 | 2026-11-23 |

## 1. 职责
中心窗口的外壳（`Ctrl+,` 打开的模态窗口：顶部分区切换、左侧导航与搜索、右侧内容、侧拉表单、声明生成的表单控件、即时保存的状态显示、寻址与旧入口跳转），以及其中两个分区的全部页面：**设置**（全局项 + 包的设置）、**资源库**（角色卡、上下文配方、数据类型、子图库、模板）。另外定下子图库条目的端口签名从哪里来（`P.09` K104 收尾，K145）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 包、连接两个分区的页面（包列表与详情、MCP / 扩展包确认、连接表单） | `W.09.04`（挂在本文的外壳里，共用 `SideSheet`、`PageHead`、`SettingRow`、`FieldControl`） |
| 主题切换的实现、配色清单 | `W.02.03`（外观页调 `themeController`） |
| 快捷键表与按键文字 | `W.02.04`（快捷键页读 `keys.list()`、`keys.label()`） |
| 急停的触发与解除 | `W.07.01`（触发）、`W.07.10`（唯一的解除确认）；授权与安全页只显示状态 |
| 档位胶囊、授权面板 | `W.07.01`（"在这一层单独设置…"跳到本文 `authz:<scope>`） |
| 价格表的计算、预算账户、设置的写盘与热更新 | 后端 `E.09.03`、`B.06.03` |
| 把画布上的子图存入子图库（右键"存入子图库"） | `W.07.11` + 后端 `POST /library`（本文只浏览、预览、插入） |
| 子图引用节点的绘制 | `W.06.10`（本文定数据来源，§6.9） |

## 3. 继承的上级约束
`W.09` §4–§6、`W.09-R1`–`R12`；`W.02` §6（动态 import）；`W.02.03` §4.2–§4.3；`W.02.04` §4.1（`center.open` = `Mod+,`）、§6.1（① modal 层）；`W.03.03`（`center`、`openCenter`、`closeCenter`、`setTour`）；`W.03` §4.5（`settings`、`models`、`setSettings`、`settingOf`、`libSigs`）、§4.6（`hubStore`）；`W.03.01`、`W.03.02`（只读画布的 store）；`W.06` §4.2（`CanvasKind='library'`）、§6.6；`W.07.11`（`SETTING_ITEMS` 与本文 §5.1 一致）；`G.11`（全部，特别是 R1、R3、R4）；`U.21`（R1–R12）；`U.03.05`；`U.13.04`；`U.14.03`；`U.19.07` §1 第 6–7 步；`U.22`（子图库条目）；`U.13.06-R4`；`C.09` §5、§6、R3；`C.13.02` §4（角色卡保存前检查）；`C.13.03`；`C.13.04`；`C.15-R4`；`E.09.03` §5（价格表版本化、整数 micros）；`S.03`；`S.06`；`S.07-R2`；`S.11-R4`、`R6`；`B.04.05`、`B.04.06`、`B.04.07`（`/pricing`）、`B.04.10`、`B.04.11`、`B.04.13`、`B.04.14`；INV-10、INV-16、INV-21、INV-22；`P.09` K35、Q6、Q9、Q15、K115、K141–K145、K151–K155。

## 4. 接口
### 4.1 外壳
```tsx
// web/src/pages/center/CenterHost.tsx —— App.tsx：const CenterHost = lazy(() => import('@/pages/center/CenterHost'))，ui.center 第一次非空后才渲染
export default function CenterHost(): JSX.Element | null;   // ui.center 为 null 时返回 null（chunk 已加载则保留）

// web/src/pages/center/CenterWindow.tsx
type CenterWindowProps = { target: CenterTarget; onClose(): void };
export function CenterWindow(p: CenterWindowProps): JSX.Element;   // Overlay layer='modal' trapFocus restoreFocus

// 分区切换（导航最上方一行，U.21-R8）
type SectionTabsProps = { value: CenterSection; onChange(s: CenterSection): void; vertical: boolean };   // ≤ 640 时竖排（U.21-R9）
export function SectionTabs(p: SectionTabsProps): JSX.Element;
// 左侧导航
type CenterNavProps = { section: CenterSection; pageId: string; compact: boolean;     // compact：≤ 640 时 56px 图标栏
  marks: ReadonlyMap<string, 'error' | 'pending' | 'off'>;                           // 只在异常时有（U.21-R4）
  footer?: ReactNode;                                                                  // 包 / 连接分区的"接入 MCP …""新建连接"（W.09.04 传入）
  onPick(pageId: string): void };
export function CenterNav(p: CenterNavProps): JSX.Element;
type CenterSearchProps = { section: CenterSection; value: string; onChange(q: string): void; onPickHit(h: SearchHit): void };
export function CenterSearch(p: CenterSearchProps): JSX.Element;

// 页面积木（W.09.04 共用）
type PageHeadProps = { title: string; desc?: string; actions?: ReactNode; status?: ReactNode };
export function PageHead(p: PageHeadProps): JSX.Element;
type SettingCardProps = { title?: string; desc?: string; anchor?: string; actions?: ReactNode; children: ReactNode };
export function SettingCard(p: SettingCardProps): JSX.Element;                 // hx-sc；anchor 供 §6.4 滚动定位
type SettingRowProps = { id: string; title: string; desc?: string; control: ReactNode;
  save?: SaveStatus; locked?: { reason: string }; highlight?: boolean };     // id：搜索命中定位用
export function SettingRow(p: SettingRowProps): JSX.Element;                   // hx-sr
export type SaveStatus = { state: 'saving' | 'saved' | 'error'; apply?: 'live' | 'restart' | 'next_run'; message?: string };
export function SaveState(p: { s: SaveStatus | undefined }): JSX.Element | null;   // 行尾："已保存"1.6 秒淡出；"重启后生效""下次运行生效"常驻（W.09-R4）
type SideSheetProps = { title: string; open: boolean; dirty: boolean; busy?: boolean; error?: string;
  onSave(): void; onCancel(): void; saveLabel?: string; extraActions?: ReactNode; children: ReactNode };
export function SideSheet(p: SideSheetProps): JSX.Element;   // 右侧滑出；有未保存修改时取消要确认（"放弃修改？"）

// web/src/pages/center/FieldControl.tsx —— 见 W.09 §6.3
export function FieldControl(p: FieldControlProps): JSX.Element;
export function fromSettingDef(d: SettingDef): FieldSpec;
export function fromConnField(f: ConnectionTypeField): FieldSpec;
export function fromTemplateInput(i: TemplateInput): FieldSpec;

// web/src/pages/center/useSettingField.ts —— 即时保存的一个设置项
export function useSettingField<T>(path: SettingPath, fallback: T): {
  value: T; set(v: T): void;            // 立即写本地显示值，300ms 内合并成一次 hub.patchSettings；失败回到服务端值
  save: SaveStatus | undefined;
};
```
### 4.2 寻址、页面登记、搜索
```ts
// web/src/pages/center/registry.ts —— 类型见 W.09 §4.2
export const CENTER_PAGES: readonly CenterPage[];                 // §5.1；W.09.04 的页面也在这里登记（leaf: 'W.09.04'）
export const LEGACY_ITEMS: Readonly<Record<string, { section: CenterSection; item?: string }>>;   // W.09 §6.4
export function parseItem(section: CenterSection, item?: string): CenterTarget;
export function toItem(t: CenterTarget): string | undefined;      // parseItem 的逆（openCenter 写回时用）
export function navOf(section: CenterSection, extra: NavExtra): readonly { group: string | null; pages: readonly CenterPage[] }[];
export type NavExtra = { packagesWithSettings: readonly { id: string; name: string }[] };   // "包的设置"下的子项由数据生成

// web/src/pages/center/search.ts
export type SearchHit = { section: CenterSection; pageId: string; rowId?: string; arg?: string; label: string; path: string };
export function buildIndex(src: { pages: readonly CenterPage[]; rows: readonly { pageId: string; rowId: string; label: string; desc?: string }[];
  packageSettings: readonly { packageId: string; name: string; defs: readonly SettingDef[] }[]; library: LibraryIndexSrc }): SearchIndex;
export function searchIn(ix: SearchIndex, section: CenterSection, q: string, limit?: number): readonly SearchHit[];   // 缺省 20 条；前缀 > 词首 > 包含
```
### 4.3 全局设置项登记
```ts
// web/src/pages/center/settingDefs.ts —— 设置分区里全局项的唯一登记处（§5.2；路径与 G.11 §3 一致）
export type SettingPath = string;                                  // 配置路径，snake_case，点分（G.11-R2）：'general.send_key'
export type GlobalSetting = {
  path: SettingPath; page: string; group: string; rowId: string;
  labelKey: string; helpKey?: string;
  spec: Omit<FieldSpec, 'key' | 'label' | 'help'>;
  apply: 'live' | 'restart' | 'next_run';                          // 与 G.11 "热更新"列一致；以 PATCH 响应为准，这里只用于说明文字
  locked?: { value: unknown; reasonKey: string };                  // 锁定显示（外部内容不可信、只允许本机访问）
};
export const GLOBAL_SETTINGS: readonly GlobalSetting[];
```
### 4.4 设置页面与资源库页面
每页一个组件，props 都是 `CenterPageProps`（`W.09` §4.2），默认导出，由 `CENTER_PAGES[i].load()` 动态加载：
```
settings/  GeneralPage  AppearancePage  KeysPage  DefaultModelsPage  AuthzPage（含 LayerMandate）  BudgetPage（含 PricingSheet）
           PoolsPage  DataPage（含 PurgeDialog）  AccessPage  AboutPage  PackageSettingsPage
library/   RoleCardsPage（含 RoleCardSheet）  RecipesPage  TypesPage  SubgraphsPage（含 SubgraphDetail、LibraryPreview）  TemplatesPage
```
```tsx
// settings/LayerMandate.tsx —— "这一层的授权"（W.07.01 的"在这一层单独设置…"打开 authz:<scope>）
type LayerMandateProps = { graphId: Ulid; scope: Scope };
export function LayerMandate(p: LayerMandateProps): JSX.Element;

// library/LibraryPreview.tsx —— 子图库某个版本的只读画布
type LibraryPreviewProps = { name: string; version: string; height: number };
export function LibraryPreview(p: LibraryPreviewProps): JSX.Element;    // 组装 CanvasStores（W.09-R10），渲染 <Canvas kind="library" />

// library/RoleCardSheet.tsx
type RoleCardSheetProps = { base: RoleCard | null; open: boolean; onClose(): void };   // base=null：新建；否则以它为底改出新版本
export function RoleCardSheet(p: RoleCardSheetProps): JSX.Element;
export function checkRoleCard(rc: RoleCardDraft, all: readonly RoleCard[]): { errors: readonly FieldIssue[]; warnings: readonly FieldIssue[] };   // C.13.02 §4 的前端提示（最终以后端为准）
export type FieldIssue = { field: string; textKey: string; at?: { start: number; end: number } };
```
### 4.5 依赖
`W.09` §4.6 全部；另：`W.02.03` 的 `themeController`、`THEMES`、`useTheme`；`W.02.04` 的 `keys.list()`、`keys.label()`、`keys.pushOverlay`；`W.03` §4.5 的 `settingOf`、`setSettings`、`models`、`loadModels`、`ensureLibSig`；`W.03` §4.6 的 `hubStore` 动作（`patchSettings`、`usage`、`pricing`、`savePricing`、`dataUsage`、`exportData`、`purgeData`、`rotateToken`、`secretsState`、`unlockSecrets`、`diagnostics`、`diagnosticsBundle`、`verifyAudit`、`effective`、`mandatesAt`、`saveMandate`、`load`、`saveRoleCard`、`libraryGraph`、`instantiateTemplate`、`templateDetail`）；`W.03.05` 的 `estop`；`W.05` 的 `useOps()`（`set_mandate`）；`W.06.01` 的 `<Canvas>`、`useCanvasCommands`（插入子图引用）；`W.07.04` 的 `Markdown`（模板 README）；`W.09.01` 的 `TemplateCards`、`startFromTemplate`；`@/lib/protocol` 的 `AUTHZ_MATRIX`（`schema/builtin/authz_matrix.yaml` 生成，`C.09` §7、`G.16`，K153）、`OpKind`。

## 5. 数据结构
### 5.1 导航与寻址（`CENTER_PAGES`，与 `W.07.11` 的 `SETTING_ITEMS` 一致）
| section | 分组 | 页 `id` | 名称 | 归属 |
|---|---|---|---|---|
| settings | 应用 | `general`（锚点 `notify`）· `appearance` · `keys` | 通用 · 外观 · 快捷键 | 本文 |
| settings | 模型 | `models` | 默认模型 | 本文 |
| settings | 安全与成本 | `authz` · `budget`（锚点 `pricing`）· `pools` | 授权与安全 · 预算与用量 · 并发与限流 | 本文 |
| settings | 系统 | `data` · `access` · `about`（锚点 `help`） | 数据与存储 · 本机访问与命令行 · 关于与诊断 | 本文 |
| settings | 包的设置 | `pkg:<包 id>`（每个启用且声明了 `settings` 的包一项，按包名排序） | 包名 | 本文 |
| library | 资源库 | `rolecards` · `recipes` · `types` · `subgraphs` · `templates` | 角色卡 · 上下文配方 · 数据类型 · 子图库 · 模板 | 本文 |
| packages | — | `core` · `mcp` · `extensions` · `skills` | Harness 核心 · MCP 服务 · 扩展包 · 技能 | `W.09.04` |
| connections | — | `all` · `group:<分组>` | 全部连接 · 各分组（模型、代码托管、办公协作、数据库、邮件、搜索，按连接类型的 `group` 生成） | `W.09.04` |
- `SETTING_ITEMS`（命令面板的"设置项"组）= 上表 settings、library 分区的固定页（不含 `pkg:`）加锚点 `notify`、`pricing`、`help`；`W0902-T3` 比对。
- 打开时没有 `item` → 该分区第一页；`ui.center` 关闭后再打开同一分区 → 回到上次的页（只在本次打开页面期间记住，存在 `CenterHost` 的组件状态里，不持久化，`W.03.03` §5.1）。

### 5.2 全局设置项（`GLOBAL_SETTINGS`；`P.09` K115 定稿为 K142）
| 页 › 分组 | 路径 | 控件 | 缺省 | 生效 | 依据 |
|---|---|---|---|---|---|
| 通用 › 发送消息 | `general.send_key` | 分段：Enter 发送 / Ctrl+Enter 发送（macOS 显示 ⌘） | `enter` | 即时 | `U.09.06-R3` |
| 通用 › 通知 | `notify.approval` · `notify.run` · `notify.connection` · `notify.budget` | 开关 ×4：有审批等你处理 · 运行完成或失败 · 连接或 MCP 服务出错 · 预算提醒 | 全开 | 即时 | `U.09.05-R3`、`W.07.10` |
| 通用 › 通知 | `notify.desktop` | 开关：系统桌面通知（另有授权按钮，§6.5） | 关 | 即时 | `W.07.10` §6 |
| 通用 › 隐私 | `telemetry.enabled` | 开关：匿名使用统计 | 关 | 即时 | `G.11` |
| 默认模型 | `models.orchestrator` | 下拉：编排者（对话框里的 AI）默认模型；首项"跟随 Agent 默认" = 空 | 空 | 即时 | `U.19.07` 第 6 步、`P.09` Q17 |
| 默认模型 | `models.default` | 下拉：新建 Agent 节点的默认模型 | 空 | 即时 | `G.11`、Q17 |
| 默认模型 | `models.default_effort` | 分段：七级强度（关闭 / 极低 / 低 / 中 / 高 / 超高 / 最高） | `medium` | 即时 | `U.09.06-R6`、`P.09` K67 |
| 默认模型 | `models.demo_mode` | 开关：演示模式（所有模型输出是示例数据） | 关 | 即时 | `B.06.04` §5、`U.18` |
| 授权与安全 › 默认 | `authz.default_level` | 下拉：新会话的默认档位 0–4 | `1` | 即时（只影响之后新建的会话） | `U.09.04-R8`、`S.04-R2` |
| 授权与安全 › 外部内容与审批 | `security.taint_guard` | 锁定开关：外部内容标记为不可信（始终开） | `true`（锁定） | — | INV-16、`U.21-R6` |
| 授权与安全 › 外部内容与审批 | `approval.merge_similar` | 开关：合并同类审批 | 开 | 即时 | `U.21-R6`、`W.07.09` |
| 授权与安全 › 外部内容与审批 | `approval.timeout_minutes` | 数字：审批等待时限（分钟，0 = 不限；到时按"驳回"处理，事件 `outcome: expired`） | `0` | 下次运行 | `U.21-R6`、`C.06.02` §7 |
| 授权与安全 › 代码执行沙箱 | `sandbox.backend` | 分段：wazero / Docker | `wazero` | 下次运行 | `P.09` Q6、`S.06` |
| 授权与安全 › 代码执行沙箱 | `sandbox.timeout_s` · `sandbox.memory_mb` | 数字：单次时限 1–30 秒 · 内存上限 64–512 MB | `10` · `256` | 下次运行 | `P.09` K35、`S.06` |
| 授权与安全 › 代码执行沙箱 | `sandbox.network` | 开关：沙箱内允许联网（只能访问出站白名单） | 关 | 下次运行 | `S.06` |
| 授权与安全 › 网络与文件 | `tools.allowed_hosts` | 列表：出站白名单（主机名或 `*.域名`，可带端口；不支持 IP 段） | `[]` | 即时 | `S.07-R2`、`G.11` |
| 授权与安全 › 网络与文件 | `tools.file_roots` | 列表：允许访问的文件目录（绝对路径，支持 `~`） | `[]` | 即时 | `E.11.05`、`G.11-R6` |
| 授权与安全 › 网络与文件 | `mcp.allow_local_http` | 开关：允许接入本机地址的 HTTP MCP 服务 | 关 | 即时 | `S.08-R9`、`W.09.04` §6.5 |
| 预算与用量 › 预算 | `budget.monthly_micros` | 金额：每月预算（0 = 不设；只用于进度和提醒，不拦截运行） | `0` | 即时 | `U.21-R7`、K152 |
| 预算与用量 › 预算 | `budget.run_default_micros` | 金额：单次运行默认预算（0 = 不设；启动运行时作为运行参数的预算） | `0` | 下次运行 | `E.09.03` §5（运行参数是预算来源之一） |
| 并发与限流 | `pools.global_concurrency` | 数字 1–64：同一时间最多执行的节点数 | `8` | 下次运行 | `G.11`、`P.09` Q16 |
| 数据与存储 › 保留期 | `data.retention.blob_days` | 数字 1–3650：工作区原文保留天数 | `30` | 即时 | `S.11-R3`、`P.09` Q8 |
| 数据与存储 › 日志 | `log.level` | 下拉：debug / info / warn / error | `info` | 即时 | `G.11` |
| 本机访问与命令行 | `server.port` | 数字 0–65535（0 = 自动） | `0` | 重启后 | `G.11` |
| 本机访问与命令行 | `server.local_only` | 锁定开关：只允许本机访问（始终开） | `true`（锁定） | — | INV-21 |
- 外观页的配色、明暗由 `themeController` 读写（它自己合并 `PATCH /settings` 的 `ui.theme.*`，`W.02.03` §6.2）；减少动效只存本地 `hx:motion`（`W.02.03` §5）。本表不重复登记这三项。
- 新路径已同步登记到 `G.11` §3（K142）；前端读值一律 `settingOf(catalog.settings, path, 缺省)`（`W.03` §4.5），因为 `Settings` 经字段映射后是 camelCase 嵌套对象，路径字符串本身是配置路径、不转换（`W.04.03`）。
- 包的设置：路径 `packages.<包 id>.<key>`；`Settings.packages` 以包 ID 为键的映射，键不转 camelCase（`W.04.03` 的 `MAP_KEYS`，由 schema 声明生成）；`C.15-R4`"两处同一份数据"由同一路径保证。

## 6. 行为
### 6.1 打开、关闭、切换
1. `ui.openCenter(section, item)` 任意来源（`Mod+,`、左栏底部一排、账户菜单、命令面板、"管理模型…"、通知中心齿轮、"去设置"）→ `ui.center` 变化 → `CenterHost` 首次时动态加载（加载 > 300ms 时窗口先出现、内容区显示 `Spinner`，`U.14.01`）→ `parseItem` 得到 `CenterTarget`；旧写法先经 `LEGACY_ITEMS`（`W.09` §6.4）。
2. `Mod+,` 在窗口已打开时关闭它；在模态里按 `Mod+,` 不处理（`W.02.04` §6.1 ① 只放行急停）。
3. 关闭：右上角关闭按钮（`IconButton`，提示"关闭 · Esc"）、`Esc`、点窗口外的遮罩。`Esc` 先关侧拉表单、再关窗口里的弹层、最后关窗口；侧拉表单有未保存修改时先问"放弃修改？"（`Dialog`，`U.11` §2）。关闭后焦点回到打开它的元素（`U.16-R6`）。
4. 切分区：顶部 `SectionTabs`（`Tabs variant='pill'`，独占导航最上方一行，`U.21-R8`）→ `ui.openCenter(新分区)`，回到该分区上次的页。切页：`CenterNav` 点击或 `↑` / `↓` + `Enter`。
5. 窗口内容随 `ui.center` 变化：外部再次 `openCenter` 到别的页时直接切过去（例如在窗口里点通知中心的齿轮）。

### 6.2 外壳布局（`U.21-R8`–`R11`、K154）
```
.hx-ctr__win   width: min(var(--hx-ctr-w), 100vw - 2×--hx-s-8)；height: min(var(--hx-ctr-h), 100vh - 2×--hx-s-8)
               grid-template-columns: var(--hx-ctr-nav-w) minmax(0, 1fr)；bg-1；--hx-r-xl；shadow-pop
  .hx-ctr__nav  bg-0：[分区切换] [搜索] [导航（ScrollArea + GlideGroup）] [底部入口（包 / 连接分区）]
  .hx-ctr__main 右上关闭按钮；PageHead；内容 ScrollArea；SideSheet 绝对定位在 main 右侧，宽 min(var(--hx-sheet-w), 92%)
```
- 窗口宽 ≤ 900：导航宽 `--hx-ctr-nav-w-md`（200）并保留文字；≤ 640：导航收成 `--hx-ctr-nav-w-min`（56）的图标栏，分区切换竖排（`U.21-R9`）。判断按 `ui.layout.bp` 和窗口自身宽度（`ResizeObserver`，写在组件状态里），不写宽度媒体查询（`W.02.02` §4.3）。
- 窗口里所有图标 14px；卡片标题里的图标不随卡片放大（`U.21-R10`）。资源库卡片网格：`repeat(auto-fill, minmax(var(--hx-card-min), 1fr))`、间距 `--hx-s-2`、内边距 `--hx-s-3` × `--hx-s-4`（`U.21-R11`）。
- 打开动画：遮罩淡入 `--hx-t-2`、窗口 `opacity` + `scale(.98→1)` `--hx-t-3`；减少动效时只淡入（`U.07.04`）。
- 控件不加边框，一屏一个实心按钮的规则在窗口里同样适用：中心窗口里没有 `primary` 按钮（侧拉表单的"保存"用 `secondary`；`U.23-R2`）。

### 6.3 即时保存（`U.21-R1`、`W.09-R4`）
`useSettingField(path)`：
1. `set(v)` → 本地显示值立即变；同一路径 300ms 内的多次修改合并；不同路径在同一 300ms 窗口里合成一个 `hub.patchSettings({p1: v1, p2: v2})`。
2. 成功：`catalog.setSettings(res.settings)`；该行 `save = {state:'saved', apply}`，`apply` 取 `res.restartRequired` 含该路径 → `restart`，`res.nextRun` 含 → `next_run`，否则 `live`。
3. 400（`details.path` 指向该项）：行内红字（服务端 `message`），显示值回到服务端值；其他失败：`ui.notify({level:'error'})`，回到服务端值。
4. 断开（`ui.net ≠ online`）：控件置灰，提示框"连接恢复后才能修改"，不排队。
5. 锁定项（`locked`）：显示固定值、控件 `disabled`，提示框写原因（"始终开启，不能关闭"），不发请求。
- 数字输入在 `onEnd`、文本在 `onCommit` 时才 `set`；列表（白名单、目录）每次增删一条就 `set` 整个数组。

### 6.4 寻址到行与搜索（`U.21-R2`）
- `CenterTarget.anchor`（`notify`、`pricing`、`help`）或搜索命中的 `rowId`：页面渲染后 `scrollIntoView({block: 'center'})`，该行 `highlight` 1.6 秒（`--hx-focus` 弱色底，`U.10.05` §2）；`pricing` 额外打开价格表侧拉表单。
- 搜索：`CenterSearch` 200ms 防抖调用 `searchIn`；结果以下拉列出（"页名 › 分组 › 行名"），`↑` / `↓` / `Enter` 选中 → 切页并定位；没有结果时一行"没有找到「xxx」"。设置分区的行来自 `GLOBAL_SETTINGS`、各页 `keywords` 和 `packageSettings`；资源库来自 `hubStore` 已加载的列表（未加载的分类在搜索框获得焦点时 `hub.load` 一次）。

### 6.5 设置分区各页
| 页 | 内容（`SettingCard` 从上到下） | 动作 |
|---|---|---|
| 通用 | 发送消息；通知（5 个开关 + 桌面通知授权）；隐私 | 桌面通知：`Notification.permission === 'default'` 时行尾"允许桌面通知"按钮 → `Notification.requestPermission()`；`'denied'` 时说明"浏览器已拒绝通知，请在浏览器的网站设置里允许"，开关置灰 |
| 外观 | 主题：四张配色卡（`THEMES` 的名称、一句话、色块，当前项对勾）→ `themeController.setPalette`；明暗 `Segmented` → `setMode`；减少动效 `Switch` → `setMotion`；`themeController` 报告"没有保存到配置文件"时卡片下方一行 `wait` 字（`W.02.03` §6.2 第 4 步） | — |
| 快捷键 | `keys.list()` 按 `group` 分四组（全局、画布、嵌套导航、对话框，与 `U.13.04` 同序），每行：`Kbd`（`keys.label`）+ 说明；只读（v1 不支持改键）；顶部说明"单字母快捷键在输入框里不生效"（`U.13.04-R6`） | — |
| 默认模型 | 三个下拉 + 演示模式开关；下拉选项来自 `catalog.models`（`{连接名} · {模型}`，不可用的模型不列），没有模型时下拉置灰并给"管理模型连接…"→ `openCenter('connections', 'group:模型')` | 演示模式从开到关时，若没有任何模型连接，先提示"关闭后没有可用的模型"（不阻止） |
| 授权与安全 | ① 各档位能做什么：`AUTHZ_MATRIX` 渲染成表（行：动作分组，列：0–4 档；格内 允许 / 提议 / 需审核 / 拒绝 的弱色徽标，`Badge`），只读，表下脚注照 `C.09` §5 的 4 条；② 默认档位；③ 外部内容与审批；④ 代码执行沙箱；⑤ 网络与文件；⑥ 密钥存储位置（§6.6）；⑦ 急停：当前状态（"没有急停" / "已急停 · {时间}"），说明"按 Ctrl+. 或顶部的急停按钮立即停止所有运行；解除只能在顶部横幅里由你确认"——本页没有解除按钮（`W.09-R12`）；⑧ 有 `arg`（`authz:<scope>`）时最上方加 `LayerMandate`（§6.7） | 列表项：`TextInput` + 回车添加，每项右侧删除按钮；主机名格式不合法（`S.07-R2`）→ 行内红字，不提交 |
| 预算与用量 | ① 本月：费用 / 预算进度（`ProgressBar`，没设预算时只显示费用）、今天、tokens、运行次数；② 最近 14 天柱状图（14 根 `transform: scaleY` 的条，悬停 `Tooltip` 显示日期和金额）；③ 按模型占比（横条 + 金额 + 百分比，前 6 个，其余合为"其他"）；④ 预算：两项金额设置 + 说明"提醒阈值 50% / 80% / 100%（`E.09.03`）"；⑤ 价格表：版本号、更新时间、"编辑价格表"→ `PricingSheet`；⑥ 最近运行（5 条：会话名 · #编号 · 费用 · 多久前，点击 → `switchSession` + `run.focus` + `setRs(true,'mon')`，关闭窗口） | 数据：`hub.usage({days: 14})`（`GET /usage`，K152）；"未计价"的模型在占比里标"未计价"（`E.09.03` §5） |
| 并发与限流 | 全局并发上限；说明"触发限流时节点排队，不会失败；修改在下一次运行生效" | — |
| 数据与存储 | ① 存储位置：数据目录、各部分占用（`hub.dataUsage()`，`fmtBytes`）、"复制路径"；② 保留期；③ 日志级别；④ 导出：开关"包含工作区原文"+"导出全部数据"→ `hub.exportData({includeBlobs})` 得到 `Blob` → `URL.createObjectURL` 下载 `harness-export-{日期}.zip`，说明"导出文件不包含密钥"（`S.11-R4`）；⑤ 彻底删除（§6.8） | 导出进行中按钮 `loading`，不可重复点 |
| 本机访问与命令行 | ① 本机地址（`location.origin`，复制按钮）、只允许本机访问（锁定）、端口；② 本机令牌："重新生成"→ 确认框（"之前打开的标签页和命令行会话都要重新登录"）→ `hub.rotateToken()` → 显示新地址（复制按钮）并提示本页将在 3 秒后用新地址重新打开；③ 命令行 `harnessctl`：几条常用命令（文案表里的静态文本，等宽字体）；④ 接口文档：链接 `/api/v1/openapi.json`（新标签页打开） | — |
| 关于与诊断 | ① 版本：`hub.diagnostics()` 的版本、启动时长、数据库状态、迁移版本、注册表哈希、扩展包与 MCP 状态、最近错误（不含密钥和正文，`B.04.14`）；② 诊断包："生成诊断包"→ 下载 zip（说明"已脱敏，不含密钥和对话正文"）；③ 审计："校验审计日志"→ `hub.verifyAudit()` → "已校验 N 条，完整" / "第 N 条之后不完整"（`danger`）；④ 帮助（锚点 `help`）："重新查看导览"→ `ui.setTour(true)`、关闭窗口（`U.18-R1`、`W.09.03`） | — |
| 包的设置 › 某包 | 包名、类型徽标、"打开包详情"→ `openCenter('packages', id)`；该包 `contributes.settings` 每项一行，控件由 `fromSettingDef` 生成，路径 `packages.<id>.<key>`，即时保存（同 §6.3） | 包停用时整页置灰并说明"包已停用，设置保留" |

### 6.5a 价格表（`PricingSheet`，`E.09.03` §2、§5，`U.19.07` 第 7 步）
- 打开时 `hub.pricing()`（`GET /pricing`）；侧拉表单里一张表：模型（`provider/model`，支持 `local/*` 通配）· 输入价 · 缓存输入价 · 输出价 · 思考价（都是"元 / 百万 tokens"）；下方一张工具表：工具 ID · 每次调用的价格（元）。`catalog.models` 里还没有价格的模型列在表尾、价格为空，行首标"未计价"。
- 金额输入用 `TextInput`，失焦时 `parseCostInput`（`W.10`）转成整数 micros；不能解析或为负 → 该格红字，"保存"置灰（`C.01-R9`：全程整数）。
- "保存"→ `hub.savePricing(table)`（`PUT /pricing`）：后端生成新版本，表头显示新版本号；说明"改价只影响之后的调用，历史运行的费用不变"（价格表版本化，`E.09.03` §5）。409 见 §8。
- 币种按 `P.09` Q9 默认人民币，表头写"¥"。

### 6.6 密钥存储位置
`hub.secretsState()`（`GET /settings/secrets`）：显示"系统密钥库"或"本地加密文件（每次启动输入主密码）"；加密文件且未解锁时显示主密码输入框（`TextInput type=password`）和"解锁"→ `hub.unlockSecrets(pw)`；无论结果如何输入框立即清空（`W.09-R5`）；失败行内"主密码不对"。本页不显示任何密钥名以外的信息，不提供"查看完整密钥"（`S.03-R5`）。

### 6.7 这一层的授权（`authz:<scope>`，K153）
1. `hub.effective(graphId, scope)`（`GET /authz/effective?graph_id=&scope=&actor=model:*`）：显示当前生效档位、命中的授权书和挂载点、解释链（"来自「会话」的授权书 · 1 建议"）。
2. "这一层单独设置"：`Segmented` 0–4。选择后：这一层已有自己挂载的授权书（`hub.mandatesAt({graphId, scope})` 非空）→ `hub.saveMandate({...m, level})`（`PUT /mandates/{mid}`）；否则 `hub.saveMandate({anchor, level})`（`POST /mandates`）后 `ops.dispatch({kind: OpKind.SetMandate, …})`（载荷按 `C.05.02` 的 `set_mandate`）把它挂到这一层的容器节点（`C.09-R3`）。成功后 `model.refreshLevel()`（档位胶囊更新）。
3. "恢复继承"：`ops.dispatch` 去掉这一层的挂载（`set_mandate` 置空），授权书本身不删除。
4. 急停中：整块置灰，"急停中，解除后再调整"（与 `W.07.01` §6.6 一致）。离线、只读同 §6.3 第 4 步。
5. 只能由用户修改：请求本来就以 `user` 发出（`W-R5`）；本组件不提供任何把档位升到超过"当前档位"的快捷方式之外的入口。

### 6.8 彻底删除（`S.11-R6`）
`PurgeDialog`（`Dialog width=400`，危险按钮在右）：说明删除范围（整个数据目录、系统密钥库里的 Harness 条目）、不可恢复、之后程序退出；输入框要求输入"删除"（`TextInput`，完全相等才启用"彻底删除"按钮）→ `hub.purgeData('删除')`（`POST /settings/data/purge {"confirm":"删除"}`）→ 202 后整个应用替换为一页静态说明"所有数据已删除，Harness 已退出。可以关闭这个页面。"（不再发任何请求）。

### 6.9 资源库分区
| 页 | 内容 | 动作 |
|---|---|---|
| 角色卡 | 卡片网格（`U.21-R11`）：名称 `@版本`、身份一句话（`identity` 首行）、继承自谁、状态（`draft` / `archived` 的弱色徽标）；顶部"新建角色卡" | 点卡片 → `RoleCardSheet`（以它为底改出新版本）；"新建" → `RoleCardSheet base=null` |
| 上下文配方 | 列表：名称、说明、总预算比例；点开详情：各段（取什么、怎么取、预算、溢出处理 `on_overflow`）按 `Recipe` 的结构只读展示 | v1 只读（没有写接口，`B.04.06`）；说明"配方由包和模板提供" |
| 数据类型 | 分两组：业务类型、系统类型；每行：名称 `@major.minor`、说明；点开：字段表（名称、类型、标签、必填、继承）、继承链、产出方（系统类型） | 只读（`res.define_type` 由模型走授权，用户界面 v1 不提供编辑） |
| 子图库 | 列表：名称、最新版本、说明、端口摘要（"2 进 1 出"）、更新时间；点开 `SubgraphDetail`：版本列表（切换版本）、`LibraryPreview`（高 320）、输入 / 输出端口表（名称 · 数据类型 · 可接多根，`U.10.03` §1 的写法）、"插入到画布"（下拉：锁定这个版本 `snapshot`（缺省） / 跟随最新 `link`，`C.02.04` §7） | 插入：关闭窗口 → `cmd.addNode({type: 子图引用的类型, params: {ref: name, version, pin}}, {at: 'center'})`；会话没有图或画布只读时按钮置灰并说明原因（`useEditBlock`） |
| 模板 | `TemplateCards layout='grid'`（全部模板）；点卡片 → 侧拉详情：标题、版本、说明、README（`Markdown`，`W.07.04`）、需要的扩展包 / 子图 / 模型能力、预计花费 | "用这个模板新建会话"→ 关闭窗口 → `startFromTemplate(sessionId=null)`（`W.09.01` §6.6）；"在当前会话里创建"（当前会话没有图时才显示）→ `sessionId=当前会话` |
- `RoleCardSheet`：字段按 `C.13.02` §2：名称（新建时可填，改版时只读）、继承（`Select`，列出其他角色卡 `名@版本`，不能选自己和自己的后代）、身份、使命、方法（逐条，最多 12 条，第一条可写 `!replace`）、好结果、边界（逐条，最多 12 条）、卡住时、变量（逐个，格式 `^[a-z_][a-z0-9_]*$`）、这一版改了什么（`reason`）。保存前 `checkRoleCard`：身份、使命为空 → 拒绝；正文 `{{变量}}` 与变量列表不一致 → 拒绝；边界为空、出现"尽量""适当""可能的话" → 警告（标出位置，仍可保存）；继承深度 > 4 或成环 → 拒绝（`C.13.02-R1`）。"保存"→ `hub.saveRoleCard(rc)`（`POST /rolecards`，生成新版本）→ 后端检查结果为准：400 的 `details` 映射到字段。说明"修改会生成新版本，已经在用的节点不受影响"。
- `LibraryPreview`（`W.09-R10`）：`useLibraryStores(name, version)`：`hub.libraryGraph(name, version)`（`GET /library/{name}/{version}?as=graph`，K145）→ `createGraphStore({readonly})` 的 `writer.load` → `createViewStore({persist:false, scope:'root'})` → `CanvasStores {graph, view, run:null, model:null, selectionKey:null, readonly:true}` → `<CanvasStoresProvider><Canvas kind="library" /></CanvasStoresProvider>`；挂载后 `cmd.fit()`；可以平移、缩放、双击进入子图（只读）；卸载时销毁这些 store。同一时间只有一个预览（切换版本时先销毁旧的）。

### 6.10 子图库条目的端口签名（K145，`P.09` K104 收尾）
- 数据来源：`LibraryItem.ports = {in: PortSig[], out: PortSig[]}`（`PortSig = {name, type, multi, role}`，`role` ∈ `entry` / `exit` / `summary` / `escalation`），由后端按该版本子图里的子图端口算出（`B.04.06`，K145）。
- 前端缓存：目录 store `libSigs: Map<'名@版本', LibrarySig>` 与 `ensureLibSig(name, version)`（`W.03` §4.5）。画布引擎在算只有 `ref` 的子图引用节点的形状时读 `deps.catalog.getState().libSigs`；没有时调 `ensureLibSig` 并先按连线推出端口（原临时做法保留为加载前的过渡），签名到达后目录 store 的变化触发这些节点重算（`W.06.10` §6.2 第 3 步、`W.06` §6.3 已改）。
- 本文的子图库页直接用列表里的 `ports`，不另请求。

## 7. 不变量
- 中心窗口里没有"保存"按钮，侧拉表单除外；所有即时保存都有可见的结果状态（已保存 / 重启后生效 / 下次运行生效 / 错误）。
- 设置分区显示的全局项与 `GLOBAL_SETTINGS`、`G.11` §3 一一对应；没有登记的项不出现，登记的项不缺。
- 页面里没有解除急停的入口；没有读取完整密钥的入口。
- 子图库预览关闭后没有残留的画布引擎和 store（`W0601-T8` 的同类检查）。
- `SETTING_ITEMS` ⊆ `CENTER_PAGES`（含锚点）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `PATCH /settings` 400 | 该行红字，值回到服务端（§6.3） |
| `PATCH /settings` 其他失败 | 错误提示；值回到服务端 |
| 页面 chunk 加载失败 | 内容区"这一页没有加载出来 · 重试"，导航照常 |
| `GET /usage`、`/settings/data`、`/diagnostics` 失败 | 对应卡片内一行"没有加载出来 · 重试"；其他卡片照常 |
| 价格表保存 409（别处改过） | 侧拉表单顶部"价格表已被修改 · 重新载入"，不覆盖 |
| `POST /rolecards` 400 | `details` 的字段错误显示在对应字段下；其余显示在表单顶部 |
| `GET /library/{name}/{version}` 404 | 预览区"这个版本已经不存在了"；列表刷新 |
| 断开 | 即时控件置灰；侧拉表单"保存"置灰并说明 |
| `purge` 失败 | 确认框里红字，窗口不关 |

## 9. 性能与资源
- `CenterHost` chunk ≤ 30KB gzip（外壳 + 登记表 + 搜索 + `FieldControl`）；每页单独 chunk，最大的（预算与用量、子图库）≤ 25KB gzip。
- 打开窗口到第一页可交互 ≤ 300ms（`U.17` §1）；切页 ≤ 100ms（chunk 已加载）。
- 搜索索引建立 ≤ 20ms（1000 行）；输入时不重建，只在数据变化时重建。
- 即时保存每 300ms 最多一个 `PATCH`。
- 子图库预览：200 节点的子图 `fit` 后首帧 ≤ 200ms；同时只存在一个预览引擎。

## 10. 验收标准
1. `Ctrl+,` 打开设置 › 通用；`Esc` 关闭；焦点回到原处；首屏没有加载本页代码（`W.09` §10 验收 2）。
2. 改"发送消息"为 Ctrl+Enter：行尾出现"已保存"；对话框立即改用 Ctrl+Enter 发送（`W0707-T3`）；刷新后保持。
3. 改端口：行尾常驻"重启后生效"；改并发上限：常驻"下次运行生效"。
4. 命令面板选"设置 › 通知"：窗口打开到通用页并滚到通知组、高亮 1.6 秒。
5. 左上搜索"白名单"：命中"出站白名单"，选中后切到授权与安全并定位。
6. 打开旧入口 `openCenter('settings', 'legacy:models')`：落到连接 › 模型。
7. 安装一个声明了两个设置项的测试扩展包：导航"包的设置"下出现它；在这里改一项，包详情里的同一项同时变化（`C.15` §8 验收 3）。
8. 在档位胶囊里点"在这一层单独设置…"：打开授权与安全并显示这一层；选 3 档后档位胶囊显示"3 本层"；"恢复继承"后回到继承的档位。
9. 预算与用量显示本月费用、14 天柱状图、按模型占比；编辑价格表保存后版本号加 1，历史运行费用不变（`E.09.03` §5）。
10. 彻底删除：不输入"删除"时按钮不可用；输入后执行，页面变为静态说明。
11. 子图库：预览可平移缩放、不能编辑；插入到画布得到一个只有 `ref` 的子图引用节点，节点上的端口与子图库条目的端口一致（不需要先连线）。
12. 角色卡：使命为空时不能保存；正文用了未声明的 `{{x}}` 时不能保存；保存后版本号加 1。
13. 宽 900 / 640 截图：导航 200 带文字 / 56 图标栏且分区切换竖排（`U.21-R9`）。

### 实施卡
- 要建 / 要改的文件：
  - `web/src/pages/center/`：`CenterHost.tsx`、`CenterWindow.tsx`、`SectionTabs.tsx`、`CenterNav.tsx`、`CenterSearch.tsx`、`PageHead.tsx`、`SettingCard.tsx`、`SettingRow.tsx`、`SaveState.tsx`、`SideSheet.tsx`、`FieldControl.tsx`，各自同名 `.css`、`.test.tsx`；`registry.ts`、`search.ts`、`settingDefs.ts`、`useSettingField.ts`，各自 `.test.ts`。
  - `web/src/pages/center/settings/`：`GeneralPage.tsx`、`AppearancePage.tsx`、`KeysPage.tsx`、`DefaultModelsPage.tsx`、`AuthzPage.tsx`、`LayerMandate.tsx`、`BudgetPage.tsx`、`PricingSheet.tsx`、`PoolsPage.tsx`、`DataPage.tsx`、`PurgeDialog.tsx`、`AccessPage.tsx`、`AboutPage.tsx`、`PackageSettingsPage.tsx`，各自 `.css`、`.test.tsx`。
  - `web/src/pages/center/library/`：`RoleCardsPage.tsx`、`RoleCardSheet.tsx`、`RecipesPage.tsx`、`TypesPage.tsx`、`SubgraphsPage.tsx`、`SubgraphDetail.tsx`、`LibraryPreview.tsx`、`TemplatesPage.tsx`，各自 `.css`、`.test.tsx`；`checkRoleCard.ts`、`useLibraryStores.ts`，各自 `.test.ts`。
  - `web/tests/e2e/center-settings.spec.ts`、`web/tests/e2e/center-library.spec.ts`；`web/tests/visual/center.spec.ts`（四个宽度 × 浅色 / 深色 × 设置 / 资源库）。
- 不许碰的文件：`web/src/pages/center/packages/`、`web/src/pages/center/connections/`（`W.09.04`）；`web/src/App.tsx`（接入 `CenterHost` 由 `W.02` 的实施任务做）；`web/src/state/`、`web/src/ops/`、`web/src/canvas/`、`web/src/panels/`、`web/src/components/`、`web/src/shell/`、`web/src/lib/protocol/`、`design/tokens.css`（新令牌按 `U.21-R12` 由令牌维护方加，缺失时上报）、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0902-T1 首屏不含中心窗口`：构建产物的入口 chunk 里没有 `pages/center/` 的模块；`openCenter` 后才请求 `CenterHost` chunk
  - `W0902-T2 parseItem`：`settings` + 缺省 → `general`；`notify` → `{page:'general', anchor:'notify'}`；`authz:01J…` → `{page:'authz', arg:'01J…'}`；`pricing` → `{page:'budget', anchor:'pricing', sheet:'pricing'}`；`pkg:mcp:github` → `{page:'pkg:mcp:github'}`；`library`+`subgraph:资料采集` → `{page:'subgraphs', arg:'资料采集'}`；不认识 → 第一页；`toItem(parseItem(x)) === x`
  - `W0902-T3 与命令面板一致`：import `W.07.11` 的 `SETTING_ITEMS`，每项都能被 `parseItem` 解析到 `CENTER_PAGES` 里存在的页（含锚点）
  - `W0902-T4 旧入口`：`legacy:models`、`legacy:providers`、`legacy:secrets` → `connections/group:模型`；`legacy:tools` → `packages/core`；`legacy:mcp` → `packages/mcp`；并 `openCenter` 写回新值 1 次
  - `W0902-T5 设置登记完整`：`GLOBAL_SETTINGS` 的路径集合 = 夹具里的 `G.11` §3 设置页路径集合（排除 `ui.theme.*`、`data.dir`、`models.providers`、`mcp.servers`、`server.open_browser`）；每项有 `labelKey` 且文案存在
  - `W0902-T6 即时保存合并`：300ms 内改 3 次同一项 + 1 次另一项 → 1 次 `patchSettings`，内容为最后值；响应 `restartRequired` 含该路径 → 行尾"重启后生效"常驻
  - `W0902-T7 保存失败回退`：400 `details.path` 指向 → 行内红字、值回到服务端；500 → `notify` 一次、值回到服务端
  - `W0902-T8 锁定项`：`security.taint_guard`、`server.local_only` 控件 `disabled`，点击不发请求，提示框有原因
  - `W0902-T9 搜索`：`searchIn('settings','白名单')` 第一条为出站白名单行；`'飞书'` 命中包的设置里的项；选中后切页、`scrollIntoView` 调用、`highlight` 1.6 秒后消失
  - `W0902-T10 FieldControl`：五种 `SettingDef.type` 与五种 `ConnectionType` 字段类型各得到对应控件；未知类型按 `text`；`secret` 有 `autocomplete="off"`，显示 `secretTail` 为占位而不是值
  - `W0902-T11 桌面通知授权`：`permission='default'` → 有按钮，点击调 `requestPermission`；`'denied'` → 开关置灰并有说明
  - `W0902-T12 主密码清空`：解锁成功、失败两种情况下输入框都清空；store 快照里没有输入的字符串
  - `W0902-T13 这一层的授权`：没有本层授权书 → `saveMandate(POST)` 后 `dispatch(set_mandate)` 各 1 次；已有 → 只 `saveMandate(PUT)`；急停中整块置灰
  - `W0902-T14 档位矩阵`：表格的格数 = `AUTHZ_MATRIX` 的行 × 5；`estop.release` 行全部"拒绝"
  - `W0902-T15 彻底删除`：输入"删 除"或"delete"按钮不可用；"删除"可用；202 后渲染静态说明且之后没有新请求
  - `W0902-T16 导出`：开关"包含工作区原文"→ `exportData({includeBlobs:true})`；产生一次下载
  - `W0902-T17 角色卡检查`：使命为空 → 错误；`{{x}}` 未声明 → 错误；边界为空 → 警告可保存；"尽量"→ 警告带位置；继承成环 → 错误
  - `W0902-T18 子图库预览`：打开 → 建 1 个 `kind='library'` 引擎、view store `persist=false`；切版本 → 旧引擎 `destroy` 后才建新的；关闭窗口 → 0 个残留
  - `W0902-T19 插入子图引用`：`pin` 缺省 `snapshot`；`cmd.addNode` 收到 `{params:{ref, version, pin}}`、`{at:'center'}`；没有图 → 按钮置灰
  - `W0902-T20 端口签名来源`：目录 store 有 `libSigs['资料采集@1.2.0']` 时，`W.06.10` 的 `shape` 用它（与连线无关）；没有时调 `ensureLibSig` 1 次（共用夹具，与 `W0610` 用例一起跑）
  - `W0902-T21 没有保存按钮`：设置、资源库各页（侧拉表单除外）里没有文案为"保存"的按钮
  - `W0902-T22 Esc 顺序`：侧拉表单有修改 → `Esc` 先弹"放弃修改？"；确认后再 `Esc` 关窗口
  - `W0902-T23 端到端`：§10 验收 1、2、4、8、11（Playwright，`--fake-llm`）
- 允许使用的依赖：`react`、`react-router`、`zustand`（`G.10` §3.3）；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R1–R3、R20、R23、R26、R32）；另：不设"保存"按钮（侧拉表单除外）；不提供解除急停的入口；不显示完整密钥；不把密钥、主密码写进任何 store；不写宽度媒体查询；不按包 ID、连接类型 ID 写分支；不做 demo 里规范没有的设置项（`W.09-R11`）。
- 完成标志：`G.14` 全部条件；§10 十三条验收通过；视觉回归截图入库。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版；设置字段名定稿（K115 → K142）；子图库端口签名的数据来源（K104 收尾 → K145） | 第 9 棒（B）；`P.09` K141–K145、K151–K155 |
