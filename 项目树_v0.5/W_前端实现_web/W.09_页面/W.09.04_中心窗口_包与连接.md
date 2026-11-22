# W.09.04 中心窗口：包与连接

| 项 | 内容 |
|---|---|
| 编号 | W.09.04 |
| 类型 | 实施 |
| 上级 | W.09 页面 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5（v0.5.11）`38_hub.js`（包管理、连接、新建连接、包的设置）、`34_center.js`（MCP、扩展包、技能旧页）、`12_center.css`；`U.21` §2、§3；`C.15`、`C.16`；`U.19.07`；`S.08`；`P.09` K41、K144、K149、K150、K156 |
| 最后修改 | 2026-11-23 |

## 1. 职责
中心窗口的**包**和**连接**两个分区：包列表与包详情（核心 / MCP 服务 / 扩展包 / 技能）、工具逐个开关与调高风险等级、接入 MCP 服务与它的首次启用确认、安装扩展包 / 导入技能与权限确认、连接列表与连接详情、新建连接（选类型 → 按字段自动生成的表单 → 保存并测试）、谁在用、删除与断开。另外为节点参数上的"新建连接…"提供"创建后就地选中"的回传（`C.16` §8 验收 2）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 中心窗口外壳、导航、搜索、侧拉表单、`FieldControl`、即时保存 | `W.09.02`（本文挂在它的外壳里、复用它的积木） |
| "设置 › 包的设置"那一页 | `W.09.02`（与包详情里的"这个包的设置"共用 `useSettingField` 和同一路径，`C.15-R4`） |
| 默认模型的选择、价格表 | `W.09.02`（设置 › 默认模型、预算与用量） |
| 首次引导里的"连接模型"一步 | `W.09.03`（复用本文的 `ConnectionForm`） |
| 包清单校验、签名校验、权限计算、MCP 连接与工具列表、密钥写入密钥库 | 后端 `E.04`、`E.12`、`C.15`、`C.16`、`B.07.02` |
| 节点库里条目的灰显与原因 | `W.07.02`（读同一份 `/node-presets`） |
| 在线插件市场、检查更新 | 非目标（`P.02`、`W.09-R11`，`P.09` K150） |

## 3. 继承的上级约束
`W.09` §4–§6、`W.09-R1`–`R12`；`W.09.02` §4.1（外壳积木）、§6.1–§6.4；`W.03` §4.5（`ensureDefs`、`loadPresets`、`loadSkills`）、§4.6（`hubStore`）；`W.03.03`（`openCenter`、`revealInLibrary`，K149）；`W.06.01` §6.8（连接下拉的"新建连接…"）；`W.07` §4.2（`useLocate`）；`U.21` §1–§3、R1–R5、R10；`U.19.07`（全部）；`U.22-R4`、`R6`；`C.15`（全部，R1–R5）；`C.16`（全部，R1–R5）；`S.03`（R2、R4、R5、R10）；`S.04` §3（风险下限）、`S.04-R7`；`S.08`（全部）；`B.04.07` §5（密钥只在请求体里出现一次）；`B.04.08`；`B.04.12`；`E.04` §2、§7；`E.12` §2、§5；INV-22；`P.09` Q18、K41、K144、K149、K150、K156。

## 4. 接口
```tsx
// web/src/pages/center/packages/ —— 每页默认导出，props 为 CenterPageProps（W.09 §4.2），由 CENTER_PAGES 动态加载
export default function PackagesPage(p: CenterPageProps): JSX.Element;        // page ∈ core | mcp | extensions | skills；有 arg（包 id）时显示 PackageDetail

type PackageDetailProps = { id: string };
export function PackageDetail(p: PackageDetailProps): JSX.Element;
type ContribListProps = { pkg: Package };                                       // 带来的节点预设与工具
export function ContribList(p: ContribListProps): JSX.Element;
type ToolRowProps = { tool: ToolDef; floor: Risk; isNew: boolean };            // floor：风险下限（S.04 §3 / S.08-R11，后端给出）
export function ToolRow(p: ToolRowProps): JSX.Element;
type McpConfirmDialogProps = { server: McpServer; open: boolean; onClose(): void };   // S.08-R8：完整命令与参数
export function McpConfirmDialog(p: McpConfirmDialogProps): JSX.Element;
type ExtConfirmDialogProps = { install: ExtensionInstall; open: boolean; onClose(): void };   // S.08-R2–R4
export function ExtConfirmDialog(p: ExtConfirmDialogProps): JSX.Element;
type AddMcpSheetProps = { edit?: McpServer; open: boolean; onClose(): void };
export function AddMcpSheet(p: AddMcpSheetProps): JSX.Element;
type InstallSheetProps = { kind: 'extension' | 'skill'; upgradeOf?: string; open: boolean; onClose(): void };
export function InstallSheet(p: InstallSheetProps): JSX.Element;
type PackageMoreMenuProps = { pkg: Package; at: { x: number; y: number }; onClose(): void };
export function PackageMoreMenu(p: PackageMoreMenuProps): JSX.Element;
export function packageMarks(s: HubState): ReadonlyMap<string, 'error' | 'pending' | 'off'>;   // 导航异常标记（U.21-R4）

// web/src/pages/center/connections/
export default function ConnectionsPage(p: CenterPageProps): JSX.Element;      // page ∈ all | group:<分组>；arg = 连接 id → ConnectionDetail；sheet = new / new:<类型>
type ConnectionDetailProps = { id: string };
export function ConnectionDetail(p: ConnectionDetailProps): JSX.Element;
type NewConnectionSheetProps = { typeId?: string; edit?: Connection; open: boolean; onClose(): void };
export function NewConnectionSheet(p: NewConnectionSheetProps): JSX.Element;
type TypePickerProps = { types: readonly ConnectionType[]; packages: ReadonlyMap<string, string>; onPick(t: ConnectionType): void };
export function TypePicker(p: TypePickerProps): JSX.Element;

// ConnectionForm：首次引导也用（W.09.03）
type ConnectionFormProps = {
  type: ConnectionType;
  edit?: Connection;                                     // 编辑：非密钥字段预填，密钥字段只显示末 4 位
  compact?: boolean;                                     // 引导里：不显示"名称"以外的说明块
  submitLabel: string;                                   // "保存并测试"
  onDone(c: Connection, test: ConnectionTest): void;     // 保存成功且测试结束（无论测试成败）
};
export function ConnectionForm(p: ConnectionFormProps): JSX.Element;
type SecretFieldProps = { spec: FieldSpec; tail?: string; value: string; onChange(v: string): void; error?: string };
export function SecretField(p: SecretFieldProps): JSX.Element;   // type=password、autocomplete=off；tail 存在时占位 "…{tail} · 留空表示不修改"
type TestResultProps = { test: ConnectionTest | null; busy: boolean };
export function TestResult(p: TestResultProps): JSX.Element;     // 成功：可用模型与能力；失败：原因
type UsagesListProps = { usages: ConnectionUsages; onLocate(t: LocateTarget): void };
export function UsagesList(p: UsagesListProps): JSX.Element;
export function connectionMarks(s: HubState): ReadonlyMap<string, 'error' | 'pending' | 'off'>;

// 表单状态（组件内部；密钥只在这里，提交后清空，W.09-R5）
export type ConnFormState = { name: string; values: Record<string, string | number>; secrets: Record<string, string>; touched: ReadonlySet<string> };
export function toRequest(type: ConnectionType, s: ConnFormState, edit?: Connection):
  { type: string; name: string; values: Record<string, unknown>; secrets: Record<string, string | null> };   // 编辑时空密钥不发送；"清除密钥"发送 null（K144）
export function validate(type: ConnectionType, s: ConnFormState, edit?: Connection): Record<string, string>;   // 必填、url 格式、number；返回 字段 → 文案键
```
### 4.1 依赖
`W.09` §4.6；`W.09.02` 的 `PageHead`、`SettingCard`、`SettingRow`、`SideSheet`、`FieldControl`、`fromConnField`、`fromSettingDef`、`useSettingField`、`SaveState`；`W.03` §4.6 的 `hubStore`（`packages`、`packageDetail`、`mcpServers`、`extensions`、`tools`、`connectionTypes`、`connections`、`lastCreatedConnection` 与动作 `load`、`loadPackage`、`setPackageEnabled`、`setToolEnabled`、`setToolRisk`、`addMcpServer`、`updateMcpServer`、`confirmMcpServer`、`reconnectMcpServer`、`removeMcpServer`、`installPackage`、`confirmExtension`、`removeExtension`、`createConnection`、`updateConnection`、`testConnection`、`connectionUsages`、`removeConnection`）；`W.03.03` 的 `openCenter`、`closeCenter`、`revealInLibrary`、`notify`；`W.07` §4.2 的 `useLocate`；`W.07.04` 的 `Markdown`（SKILL.md）；`W.08` 的 `Switch`、`Select`、`Segmented`、`Menu`、`Dialog`、`Badge`、`Button`、`IconButton`、`TextInput`、`Spinner`、`EmptyState`、`Tooltip`；`W.10` 的 `useT`、`fmtRelTime`、`fmtTokens`。

## 5. 数据结构
`Package`、`NodePreset`、`SettingDef`（`C.15`），`ConnectionType`、`Connection`（`C.16`，含 K144 新增的 `secret_tails`、`models`、字段 `suggestions`），`ToolDef`、`McpServer`（`B.04.08`），`Extension`、`ExtensionInstall`（`B.04.12`），`ConnectionTest = {ok, state, error?, models?}`、`ConnectionUsages = {graphs[{graph_id, title, session_id?, nodes[{id, label, scope}]}], packages[{id, name}]}`（`C.16` §4，K144）从 `@/lib/protocol` 导入。本文私有：`ConnFormState`。

## 6. 行为
### 6.1 包分区的导航与列表
- 导航四项：Harness 核心 · MCP 服务 · 扩展包 · 技能（`U.21` §1）；底部三个入口："接入 MCP 服务"（`AddMcpSheet`）、"安装扩展包"（`InstallSheet kind=extension`）、"导入技能"（`InstallSheet kind=skill`）。
- 导航标记（`packageMarks`，`U.21-R4`）：组里有 MCP 服务 `state=error` → `error`；有待确认（MCP `pending`、扩展包 `pending_confirm`）→ `pending`；只有停用的包时不标（停用是用户自己的选择）。
- 列表每行：名称、类型徽标（`Badge neutral`：核心 / MCP / 扩展包 / 技能）、版本、"N 个节点 · M 个工具"、状态（只在异常时：出错 `danger`、待确认 `wait`、已停用 `text-3` 字）；点击 → `ui.openCenter('packages', id)`。核心组只有一项，直接显示它的详情。
- 列表为空：`EmptyState`："还没有接入 MCP 服务"+"接入 MCP 服务"（扩展包、技能同理）。

### 6.2 包详情（`U.21` §2 的顺序）
| 块 | 内容 |
|---|---|
| 头部 | 名称、类型、版本；右上：启用 `Switch`（核心包 `locked`：置灰，提示"内置 · 不能停用"，`C.15`）、"更多"`IconButton` → `PackageMoreMenu` |
| 基本信息 | 状态（已启用 / 已停用 / 待确认 / 出错）、来源（随程序内置 / 本地安装的文件名 / MCP stdio 命令首段 / MCP http 地址）、签名（已签名 / 未签名 · 无法确认作者 / 签名无效）（`S.08-R3`） |
| 待确认 / 出错 | MCP 待确认："新添加的服务，确认命令后才会启动" + "查看命令并确认"→ `McpConfirmDialog`；扩展包待确认："确认权限后才会启用" + "查看权限并确认"→ `ExtConfirmDialog`；MCP 出错：最近错误原文（`McpServer.last_error`）+ "重新连接"→ `hub.reconnectMcpServer`；有新工具（`S.08-R12`）："这个服务新增了 N 个工具，默认停用"+ 跳到工具列表 |
| 带来的内容 | `ContribList`：节点预设（名称、分类路径、原子节点类型）与工具（`ToolRow`）；"在节点库中显示"→ `ui.revealInLibrary(包名)` 并关闭窗口（K149） |
| 带来的连接类型 | 每个：名称、分组、说明；"新建连接"→ `openCenter('connections', 'new:' + 类型 id)` |
| 需要的连接 | `requires_connections` 的每个类型：已有这个类型的连接 → 列出名称和状态；没有 → `wait` 字"还没有这个类型的连接"+"新建连接" |
| 这个包的设置 | `contributes.settings` 每项一行（`fromSettingDef` + `useSettingField('packages.<id>.<key>')`，即时保存，与"设置 › 包的设置"同一份，`C.15-R4`） |
| SKILL.md | 技能包：`pkg.skill_md`（`GET /packages/{id}`，K150）经 `Markdown` 渲染；超过 64KB 时只显示开头并注明 |
| 权限 | `permissions` 原样逐行（主机名、密钥名、工具及风险） |
- 打开详情时 `hub.loadPackage(id)`（`GET /packages/{id}`）；列表里已有的字段先显示，详情到达后补齐。

### 6.3 启用与停用
- `Switch` → `hub.setPackageEnabled(id, on)`（`POST /packages/{id}/enable|disable`，响应带 `registry_hash`，K150）；成功后 hub 调 `catalog.ensureDefs(registryHash)`、`catalog.loadPresets()`、技能包另调 `catalog.loadSkills()`（`W.03` §4.5）。
- 停用：不弹确认（可恢复）；提示"已停用「X」，画布上用到它的节点会显示"缺少：X""（`C.15-R3`）。
- 首次启用待确认的扩展包、MCP 服务：`Switch` 不直接启用，改为打开对应确认框（`W.09-R8`）。

### 6.4 工具（`ToolRow`）
- 一行：工具名、来源、风险徽标（L0–L3，`Badge`：L0 `neutral`、L1 `neutral`、L2 `wait`、L3 `danger`）、启用 `Switch`、风险 `Select`（只列 ≥ `floor` 的等级，`S.04-R7`、`S.08-R11`）；新工具带"新"`Badge model`（`S.08-R12`）。
- 开关 → `hub.setToolEnabled(id, on)`；风险 → `hub.setToolRisk(id, risk)`（`PUT /tools/{id}`），即时保存（`SaveState`）；调低到下限以下的请求不会发出（选项里没有）。

### 6.5 接入与编辑 MCP 服务（`AddMcpSheet`）
1. 字段：名称（`^[a-z0-9_-]{1,40}$`，编辑时只读）；传输 `Segmented`：本机命令（stdio）/ 网络地址（http）。
2. stdio：命令、参数（逐个）、环境变量（逐行：变量名 + 值；值的写法 `Segmented`："文本"或"引用连接"——引用连接时选一个连接和它的一个密钥字段，生成 `C.16-R3` 的密钥引用写法；不允许把密钥明文写成"文本"，后端保存时扫描，`C.16-R3`）。
3. http：地址（只允许 `https://`；本机地址需要"设置 › 授权与安全 › 允许接入本机 HTTP 的 MCP 服务"打开，`S.08-R9`，否则行内红字并给跳转）、请求头（逐行，值同样只能"文本"或"引用连接"）。
4. "保存"→ 新增 `hub.addMcpServer(spec)` / 编辑 `hub.updateMcpServer(name, spec)`；成功后服务处于待确认（`B.04.08` §5：新增和改命令都要重新确认）→ 立即打开 `McpConfirmDialog`。
5. 校验：必填、名称格式、地址协议；后端 400 的 `details.field` 映射到字段。

### 6.6 MCP 首次启用确认（`McpConfirmDialog`，`S.08-R8`，K156）
- `Dialog width=560`：标题"启动这个 MCP 服务？"；stdio：**完整的启动命令和参数**（等宽字体，每个参数一行，不截断，可横向滚动）、工作目录（`<DataDir>/mcp/<名>/`）、要注入的环境变量**名**（值不显示；引用写成"引用连接「GitHub（个人）」的「访问令牌」"）；http：完整地址、请求头名；说明"它会以你的账户权限在本机运行"（stdio）、"它的工具返回内容一律按外部内容处理"（`S.08-R10`）。
- 按钮："取消"（服务保持待确认）、"确认并启动"→ `hub.confirmMcpServer(name)`；成功后关闭，详情刷新（工具列表、默认停用的新工具）。
- 首次启用确认界面归本文（`E.12` §2 原写 `W.09.02`，已改，K156）。

### 6.7 安装扩展包 / 导入技能（`InstallSheet`、`ExtConfirmDialog`）
1. 选择文件：`Button`"选择 .zip 文件"触发隐藏的 `<input type="file" accept=".zip">`；> 50MB 直接提示，不上传（`B.04.12`）。技能：zip 根目录有 `SKILL.md`（K150）。
2. `hub.installPackage(file, kind)`（`POST /extensions/install`，multipart）→ 201 `{name, version, sign_state, perms, status: pending_confirm, perms_added?}`；422 `extension_invalid` → 表单里列出后端给的文件和行号（`E.04` §7）。
3. 立即打开 `ExtConfirmDialog`：来源（文件名）、名称与版本、签名状态（未签名：`wait` 字"未签名，无法确认作者"；签名无效：后端拒绝安装，不会到这里）、权限清单分组：要访问的主机、要用的密钥名、要注册的工具及风险等级、是否包含编程式节点（v1 恒为"否"，`S.08-R1`）；升级且权限变多时，新增的权限行用 `wait` 弱色底标"新增"（`S.08-R4`）。
4. "确认并启用"→ `hub.confirmExtension(name)`；成功后按 §6.3 刷新目录；"取消"→ 包留在列表里显示待确认（可以之后确认或移除）。
5. 升级：包详情"更多 › 从文件升级…"→ `InstallSheet upgradeOf=name`，同名新版本走同一流程。

### 6.8 "更多"菜单（`PackageMoreMenu`，K150）
| 包类型 | 菜单项 |
|---|---|
| 核心 | （没有"更多"按钮） |
| MCP 服务 | 编辑命令… / 编辑地址…（`AddMcpSheet edit`）· 重新连接 · 移除服务… |
| 扩展包 | 从文件升级… · 卸载… |
| 技能 | 从文件更新… · 移除… |
- 移除 / 卸载：`Dialog` 确认；扩展包被图引用时后端 409 → 确认框改为列出受影响的图（`details.graphs`）并说明"这些图里用到它的节点会显示缺少"（`B.04.12`、`W.09-R7`），再次确认才 `DELETE`（带 `?force=1`，K150）。
- 没有"检查更新"（不做在线更新源，`P.02`）；"日志"即详情里的最近错误，不另开日志页（K150）。

### 6.9 连接分区的导航与列表（`U.21` §1、§3）
- 导航：全部连接 · 各分组（来自 `connectionTypes` 的 `group` 去重，顺序：模型、代码托管、办公协作、数据库、邮件、搜索，其余按名称追加；只列有连接类型的分组）；底部"新建连接"。
- 导航标记（`connectionMarks`）：分组里有 `state=error` 的连接 → `error`。
- 列表每行：名称、连接类型名、"由「包名」提供"（`text-3`）、状态（`ok` 不显示、`untested` `text-3` 字"未测试"、`error` `danger` 字 + 原因第一行）、更新时间；点击 → `openCenter('connections', id)`。
- 空：`EmptyState`："还没有{分组}连接" + "新建连接"（预选这个分组）。

### 6.10 连接详情
| 块 | 内容 |
|---|---|
| 头部 | 名称（`TextInput`，`onCommit` → `hub.updateConnection(id, {name})`，即时保存）、类型、"由「包名」提供"；右上："编辑"（`NewConnectionSheet edit`）、"测试"（`hub.testConnection(id)`，结果在状态块里） |
| 状态 | `ok` / `error`（原因原文，如"401 · API Key 无效"，`C.16` §7）/ `untested`；最近一次测试时间 |
| 字段 | 非密钥字段：标签 + 值（只读显示，编辑走侧拉表单）；密钥字段：标签 + `…{末 4 位}`（`secret_tails`），"存于系统密钥库"（或"本地加密文件"）（`S.03-R5`；`U.21` §3 原写"首尾"，以 INV-22 为准改为末 4 位，K144） |
| 模型列表（模型连接） | `connection.models[]`：模型名、上下文长度（`fmtTokens`）、能力徽标（结构化输出、工具调用、图片）、支持的思考强度（`effort`，`C.16-R5`）、是否已计价（未计价时"填写价格"→ `openCenter('settings', 'pricing')`，`U.19.07` 第 7 步）；"重新读取模型列表"= 测试一次 |
| 谁在用 | `hub.connectionUsages(id)`（`C.16-R4`）：按图分组的节点列表，点节点 → 关闭窗口 → `useLocate({sessionId, graphId, scope, nodes:[id]})`；包（MCP 服务的环境变量引用了它）→ 跳包详情；没有 → "还没有节点在用" |
| 断开 / 删除 | "断开…"：`Dialog`："删除这个连接保存的密钥，连接本身和引用它的节点保留；下次运行用到时会报缺少凭据" → `hub.updateConnection(id, {secrets: {每个密钥字段: null}})`；"删除…"：`Dialog` 列出谁在用（先 `connectionUsages`）："删除后这些节点会显示"缺少连接"，它的密钥会从系统密钥库删除"（`C.16-R2`、`S.03-R10`、`U.19.07` §3）→ `hub.removeConnection(id)` |

### 6.11 新建与编辑连接（`NewConnectionSheet`）
1. 没有 `typeId`：第一步 `TypePicker`——搜索框 + 按分组列出的连接类型卡片（名称、说明、"由「包名」提供"，`U.21` §3）；分组由导航当前分组预选。来自停用包的类型不列。
2. 第二步 `ConnectionForm`：名称（缺省 = 类型名；同类型已有同名时加序号）、字段按 `type.fields` 顺序由 `fromConnField` 生成；`url` 字段有 `suggestions`（如 OpenAI 兼容的常见厂商地址，K144）时输入框下方列出可点的预设；`secret` 字段用 `SecretField`，下方说明"密钥只保存在本机系统密钥库里，不会出现在日志和导出文件中"（`U.19.07` 第 3 步）。
3. 主按钮"保存并测试"（`secondary`）：`validate` 通过后 → 新建 `hub.createConnection(toRequest(...))` / 编辑 `hub.updateConnection(id, toRequest(...))`；**请求发出后立即清空表单里的全部密钥**（无论成败，`W.09-R5`）；成功后 `hub.testConnection(id)`，`TestResult` 显示：成功 → 可用模型和能力（结构化输出、工具调用、上下文长度）；失败 → 具体原因（地址不通、密钥无效、余额不足，`U.19.07` 第 4 步）。
4. 测试结束后按钮变为"完成"（关闭表单，列表出现该连接，密钥只显示末 4 位）；测试失败时也已保存（状态 `error`），用户可改字段后再"保存并测试"（编辑模式，密钥留空表示不改）。模型连接测试成功且 `models.demo_mode` 为开时，另弹提示"已有可用的模型 · 关闭演示模式"（按钮 → `hub.patchSettings({'models.demo_mode': false})`，`B.06.04` §5）。
5. 编辑模式：非密钥字段预填；密钥字段空，占位 `…{末 4 位}` · "留空表示不修改"；每个密钥字段旁"清除"→ 发送 `null`（K144）。
6. 校验错误：必填为空、`url` 不合法、数字越界 → 字段下方红字；后端 400 `details.field` 同样映射；表单顶部只放与字段无关的错误。
7. 侧拉表单有未保存修改时取消要确认（`W.09.02` §6.1 第 3 步）；关闭表单时组件卸载，密钥随组件状态一起丢弃。

### 6.12 节点参数上的"新建连接…"（`C.16` §8 验收 2）
`W.06.01` 的 `CanvasOverlays` 在连接下拉里选"新建连接…"时：`ui.openCenter('connections', 'new:' + 参数声明的连接类型)`，并记下 `hub.lastCreatedConnection.seq`；本文在新建成功时 `hubStore` 写 `lastCreatedConnection = {id, type, seq + 1}`；`CanvasOverlays` 订阅到 `seq` 增加且 `type` 相同 → 调 `pick(id)` 把它设为这个参数的值（经 `W.06.01` 原有的 `pick`，走 Op）。中心窗口关闭前没有新建 → 不做任何事（K144；`W.06.01` §6.8 已改）。

## 7. 不变量
- 任何时候页面上看不到完整密钥；表单提交后组件状态里没有密钥；`hubStore` 里的 `Connection` 只有 `secret_tails`。
- 没有经过确认框就启用的扩展包或启动的 MCP 服务：确认接口只在两个确认框的确认按钮里调用。
- 工具的风险选择里没有低于下限的等级。
- 页面代码里没有具体的包 ID、连接类型 ID、分组名分支（分组排序表除外，它只是顺序）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 400（字段） | 字段下方红字 |
| 409 卸载 / 删除被引用 | 确认框列出 `details` 里的图和节点，再次确认 |
| 422 `extension_invalid` | 安装表单列出文件和行号 |
| 测试失败 | 状态块显示原因；连接 `state=error`；导航分组标 `error` |
| MCP 确认后启动失败 | 详情"出错"块显示后端原因，"重新连接"可用 |
| `lastCreatedConnection` 的类型和参数要求不一致 | 不回填（用户可能新建了别的类型） |
| 断开 | 即时控件置灰；侧拉表单"保存并测试"置灰 |

## 9. 性能与资源
- 包、连接两个分区各一个 chunk，≤ 25KB gzip。
- 工具列表 > 200 行（大型 MCP 服务）时只渲染可见部分（`W.09` §9）。
- 进入连接详情时只请求一次 `usages`；"测试"同时只有一个在进行（按钮 `loading`）。

## 10. 验收标准
1. 接入一个 stdio 测试 MCP 服务：保存后弹出确认框，显示完整命令和每个参数；取消后列表显示"待确认"、导航有 `pending` 标记；确认后工具出现、全部默认停用（`S.08-R8`、`R12`；`E.12` §8 验收 1、2）。
2. 修改这个服务的参数：再次弹出确认框（`B.04.08` §5）。
3. 安装未签名的测试扩展包：确认框显示"未签名，无法确认作者"和权限清单；确认后节点库出现它的节点；停用后节点库灰显、画布上已有节点显示"缺少"（`C.15` §8 验收 1）。
4. 升级同名扩展包且权限变多：新增的权限标"新增"并要求再次确认（`S.08-R4`）。
5. 新建 OpenAI 兼容连接：表单按字段生成，地址有预设可点；保存并测试成功后显示模型列表；列表里密钥只显示末 4 位；在 localStorage、store 快照、`console` 里搜不到密钥（`U.19.07` §2）。
6. 删除被节点使用的连接：确认框列出图和节点；删除后节点显示"缺少连接"（`C.16` §8 验收 3）。
7. 新装"飞书连接器"测试扩展包后，新建连接的类型里出现"飞书应用"，表单按它的字段生成（`C.16` §8 验收 1）。
8. 在节点的连接参数里选"新建连接…"，创建成功后回到画布，参数已是新连接（`C.16` §8 验收 2）。
9. 包详情里改一个包的设置，"设置 › 包的设置"里同一项同步变化（`C.15` §8 验收 3）。
10. 工具风险下拉里没有低于下限的等级；调高后 `PUT /tools/{id}` 带新等级。

### 实施卡
- 要建 / 要改的文件：
  - `web/src/pages/center/packages/`：`PackagesPage.tsx`、`PackageDetail.tsx`、`ContribList.tsx`、`ToolRow.tsx`、`McpConfirmDialog.tsx`、`ExtConfirmDialog.tsx`、`AddMcpSheet.tsx`、`InstallSheet.tsx`、`PackageMoreMenu.tsx`，各自 `.css`、`.test.tsx`；`marks.ts`、`marks.test.ts`。
  - `web/src/pages/center/connections/`：`ConnectionsPage.tsx`、`ConnectionDetail.tsx`、`NewConnectionSheet.tsx`、`TypePicker.tsx`、`ConnectionForm.tsx`、`SecretField.tsx`、`TestResult.tsx`、`UsagesList.tsx`，各自 `.css`、`.test.tsx`；`connForm.ts`（`toRequest`、`validate`）、`connForm.test.ts`、`marks.ts`、`marks.test.ts`。
  - `web/tests/e2e/center-packages.spec.ts`、`web/tests/e2e/center-connections.spec.ts`（用 `testdata/mcp/echo-server`、`testdata/ext/*` 测试包，`E.12`、`E.04`）。
- 不许碰的文件：`web/src/pages/center/` 下本文目录以外的文件（`W.09.02`；`CENTER_PAGES` 里本文两个分区的登记由 `W.09.02` 写好）；`web/src/state/`、`web/src/ops/`、`web/src/canvas/`、`web/src/panels/`、`web/src/components/`、`web/src/lib/protocol/`、`design/tokens.css`、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0904-T1 导航标记`：MCP `error` → `error`；扩展包 `pending_confirm` → `pending`；只有停用 → 无标记；全部正常 → 无标记
  - `W0904-T2 核心包锁定`：核心包的启用开关 `disabled`、提示"内置 · 不能停用"；没有"更多"按钮
  - `W0904-T3 启用后刷新目录`：`setPackageEnabled` 成功 → `ensureDefs(registryHash)`、`loadPresets` 各 1 次；技能包另 `loadSkills`
  - `W0904-T4 待确认不直接启用`：对 `pending` 的 MCP 点启用 → 打开确认框，不调 `setPackageEnabled`
  - `W0904-T5 MCP 确认框`：stdio 显示命令和 5 个参数各一行（含空格、引号原样）；环境变量只显示名；引用显示连接名与字段标签；确认 → `confirmMcpServer` 1 次；取消 → 0 次
  - `W0904-T6 改命令要重新确认`：`updateMcpServer` 成功 → 确认框打开
  - `W0904-T7 http 地址`：`http://example.com` → 红字；`http://127.0.0.1:8000` 且设置未允许 → 红字带跳转；允许后通过
  - `W0904-T8 扩展包确认`：`sign_state='unsigned'` → 显示"未签名，无法确认作者"；`perms_added` 里的行标"新增"；确认 → `confirmExtension` 1 次
  - `W0904-T9 安装失败`：422 `details.errors=[{file, line, message}]` → 表单逐条列出；> 50MB → 不发请求
  - `W0904-T10 卸载被引用`：`DELETE` 409 → 确认框列出图；再次确认发送 `?force=1`
  - `W0904-T11 风险下限`：`floor='L2'` → 选项只有 L2、L3；新工具有"新"徽标
  - `W0904-T12 表单生成`：夹具连接类型（text、secret、number、url、select 五种字段）→ 五种控件；`required` 空 → 红字不提交
  - `W0904-T13 密钥只发一次并清空`：保存 → 请求体 `secrets.api_key='sk-test-1234'`；请求发出后 `SecretField` 的值为空；测试请求体里没有密钥；store 快照、localStorage、`console` 调用参数里都没有 `sk-test-1234`
  - `W0904-T14 编辑时留空不改`：编辑只改名称 → 请求体没有 `secrets` 键；点"清除"→ `secrets.api_key=null`
  - `W0904-T15 末 4 位`：详情密钥字段显示 `…1234`；没有"查看"按钮
  - `W0904-T16 保存并测试`：创建成功后调 `testConnection` 1 次；测试失败 → 显示原因、连接已在列表里、按钮回到"保存并测试"
  - `W0904-T17 谁在用与定位`：点节点 → `closeCenter` 后 `useLocate` 收到 `{sessionId, graphId, scope, nodes}`
  - `W0904-T18 删除确认列出使用者`：先 `connectionUsages` 再弹框；确认 → `removeConnection` 1 次
  - `W0904-T19 新建后回填`：`lastCreatedConnection` 的 `seq` 加 1 且类型一致 → `pick(id)`；类型不同 → 不调用（与 `W.06.01` 的 `CanvasOverlays` 测试共用夹具）
  - `W0904-T20 在节点库中显示`：→ `revealInLibrary(包名)`、`closeCenter` 各 1 次
  - `W0904-T21 包设置同一份`：包详情里改 `packages.ext:sheets.enc` → `patchSettings` 的路径与设置页相同；两处显示同一个值
  - `W0904-T22 端到端`：§10 验收 1、3、5、6、8（Playwright，`--fake-llm`、测试包）
- 允许使用的依赖：`react`、`zustand`（`G.10` §3.3）；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R3、R20、R26、R32）；另：不在任何 store、localStorage、URL、`console` 里放密钥；不提供"查看完整密钥"；不绕过确认框调用确认接口；不做在线检查更新；不按包 ID、连接类型 ID 写分支；不在本文里写设置项的路径常量以外的包设置逻辑（统一用 `useSettingField`）。
- 完成标志：`G.14` 全部条件；§10 十条验收通过；浅色 / 深色截图（包详情、MCP 确认框、新建连接）进视觉回归。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 9 棒（B）；`P.09` K144、K149、K150、K156 |
