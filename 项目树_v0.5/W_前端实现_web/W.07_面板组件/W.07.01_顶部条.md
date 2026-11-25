# W.07.01 顶部条

| 项 | 内容 |
|---|---|
| 编号 | W.07.01 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.4 `10_body.html`、`08_layout.css`；demo v0.5（v0.5.11）`10_body.html`、`13_polish.css`、`17_fix.css`、`31_palette.js`；`U.09.01` ①、`U.12` §5–§6、`U.14.04`、`U.23-R10`、`R11`；`P.09` K111、K116、K118 |
| 最后修改 | 2026-11-25 |

## 1. 职责
会话页最上面一条：左栏开关、H 标识、会话名（点击改名）、保存状态、面包屑、AI 草稿分支与合并、编排者模型胶囊、档位胶囊与授权面板、运行按钮与运行状态、校验问题徽标、急停按钮、通知铃铛的位置、主题菜单、右栏开关；以及全枝共用的 `panels/shared/` 四个 hook（`W.07` §4.2）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 顶部条的高度、网格位置、`/welcome` 时整体 `inert` | `W.02.02`（§6.1、§6.5） |
| `[`、`]`、`I`、`F` 的处理函数 | `W.02.02`（本文只在按钮上调同一个 `ui` action） |
| 通知中心面板的内容 | `W.07.10`（本文只摆 `InboxButton`） |
| 急停横幅、离线横幅、子图库内容提示 | `W.07.10` |
| 浏览器标签页标题"（待审批）" | `W.02.01` §6.3 |
| 档位"在这一层单独设置"的页面、外观设置页 | `W.09.02` |
| 模型选择器的内容 | `W.07.07`（本文的模型胶囊打开它的 `ModelPicker`） |
| 主题的保存与生效 | `W.02.03` `themeController` |
| 运行的暂停、取消、从失败处继续 | `W.07.05` 监控页 |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`；`W.02.02` §6.1、§6.4、§6.5；`W.02.03` §4.2–§4.3；`W.02.04` §4.1（`run.start`、`estop.trigger`）、§6.4；`W.03.01` §4.3（`crumbs`、`isDeep`）、§6.2（`sync`）；`W.03.04` §4（`current`、`start`）；`W.03.05` §4.1（`rename`、`triggerEstop`、`estop`、`approvals`）；`W.03.06` §4（`levelBadge`、`activity`、`setSessionLevel`）；`U.09.01` ①、`U.09.02` §1–§3、R6、R8；`U.09.03` §1（< 1180 隐藏模型胶囊，< 900 面包屑折叠）；`U.12` §5、§6；`U.13.06` §3（面包屑）、R4、R5；`U.14.03` §1（图级）、§2；`U.14.04` §1–§3、R1；`U.19.04`；`U.23-R2`、`R10`、`R11`、`R14`；`U.03.02-R3`；`U.07.03`（呼吸点、急停底色不渐变）；`U.16-R5`；`E.05.06`（合并界面）、`E.06.04`（急停界面）；`C.05.04` §3、§5；INV-10；`P.09` K116、K118。

## 4. 接口

### 4.1 组件
```tsx
// web/src/panels/top-bar/TopBar.tsx —— 外壳 <TopBar/> 插槽里唯一的组件；不接收 props，数据全部从 store 读
export function TopBar(): JSX.Element;

// 以下是 TopBar 内部的子组件（各自一个文件）
type SessionTitleProps = { sessionId: Ulid };
export function SessionTitle(p: SessionTitleProps): JSX.Element;          // 点击变成输入框改名
type CrumbsProps = { compact: boolean };                                  // compact：bp ∈ {sm, xs}（< 900）
export function Crumbs(p: CrumbsProps): JSX.Element | null;               // 根图时返回 null（U.23-R11）
export function BranchChip(): JSX.Element | null;                         // 没有 AI 草稿分支时 null
type BranchMenuProps = { anchor: HTMLElement; branch: Branch; onClose(): void };
export function BranchMenu(p: BranchMenuProps): JSX.Element;
type MergeDialogProps = { branch: string; onClose(): void };
export function MergeDialog(p: MergeDialogProps): JSX.Element;
export function ModelPill(): JSX.Element | null;                          // bp ≠ xl 时 null（U.09.03）
export function LevelPill(): JSX.Element;
type LevelPanelProps = { anchor: HTMLElement; onClose(): void };
export function LevelPanel(p: LevelPanelProps): JSX.Element;
export function RunButton(): JSX.Element;
export function RunStatus(): JSX.Element | null;                          // 没有运行在进行、也没有问题时 null（U.23-R10）
export function EstopButton(): JSX.Element;
export function ThemeMenu(): JSX.Element;
export function RsToggle(): JSX.Element;
export function LsToggle(): JSX.Element;
```

### 4.2 本文实现的共用 hook
签名见 `W.07` §4.2（`useLocate`、`useShortcut`、`useEditBlock`、`describeOp`），文件在 `web/src/panels/shared/`，测试 `W0701-T14`–`T18`。

### 4.3 本文需要、由上层新增的 action（`P.09` K116）
```ts
// W.03.01 GraphActions 新增（AI 草稿分支与合并，B.04.02）
rebaseBranch(name: string): Promise<void>;                                 // POST /graphs/{id}/branches/{name}/rebase
mergePreview(name: string): Promise<MergePreview>;                         // POST …/merge/preview
mergeBranch(name: string, resolutions: readonly Resolution[]): Promise<void>;   // POST …/merge {into:'main', resolutions}
deleteBranch(name: string): Promise<void>;                                 // DELETE /graphs/{id}/branches/{name}
```

### 4.4 依赖
`W.03` §4.2 的 hook；`W.03.01` 的 `crumbs`、`isDeep`、`GraphActions`；`W.03.03` 的 `rsDot`、`UiActions`；`W.03.04` 的 `RunActions.start`；`W.03.05` 的 `SessionActions`、`sessionMeta`、`pendingCount`；`W.03.06` 的 `levelBadge`、`ModelActions.setSessionLevel`；`W.02.01` 的 `useNav`；`W.02.03` 的 `themeController`、`useTheme`、`THEMES`；`W.02.04` 的 `keys`；`W.07.07` 的 `ModelPicker`；`W.07.10` 的 `InboxButton`、`useAnnounce`；`W.08` 的 `IconButton`、`Button`、`TextInput`、`Popover`、`Menu`、`Dialog`、`Segmented`、`Switch`、`Badge`、`Tooltip`、`Icon`；`W.10` 的 `useT`、`fmtDuration`、`fmtCost`。生成类型 `Branch`、`MergePreview`、`Resolution`、`Effective`、`Diag`。

## 5. 数据结构
无协议以外的结构。组件内部状态：改名中的文字、各弹层的开关、运行计时的 `ref`。

## 6. 行为

### 6.1 排布（`U.09.01` ①、`U.23-R10`）
```
[左栏开关] [H] 会话名 · 正在保存…  │ 面包屑 ⚠ · 另一层有审批 │ AI 草稿 · 领先 3    ……    ●AI 正在编辑… 模型名 │ ▮▮▯▯▯ 2 本层 │ ⚠3 个问题 · ●运行中 1:24 │ [▶ 运行] │ [■] │ 🔔• │ ●●● │ [右栏开关•]
```
- 与左栏同一块底色 `bg-0`，不画分割线（`U.23-R4`、`W.02.02` §6.1）；左栏开关与收起后的图标栏同一中线：左内边距 = (56 − 30) / 2 = 13（`U.09.02-R8`，用 `calc((var(--hx-ls-w-min) - 30px) / 2)`）。
- 右侧图标默认 `text-3`、透明底，悬停才出现填充（`U.24` #3、#6）；实心主色只有 H 标识和运行按钮（`U.23-R2`、`R14`）。
- 急停生效时根元素加 `is-estop`：整条变为 `danger-weak` 底，立即生效，不做颜色过渡（`U.03.02-R3`、`U.07.03`）。

### 6.2 会话名与保存状态
- `SessionTitle`：显示 `sessionMeta(id).title`；点击变成 `TextInput`（最长 80 字，`C.10`），Enter 或失焦提交 `session.rename`，Esc 取消；空字符串不提交。失败时 store 已回退标题，本组件 `ui.notify({level:'error', text: t('top.rename.failed')})`。
- 保存状态（`graph.sync`）：`saving` 持续 ≥ 300ms 才在会话名后显示 `text-3` 小字"正在保存…"（`U.14.01`）；`conflict` 显示 `wait` 色"有冲突"（冲突框由 `W.07.10` 弹出，点这里重新打开它）；`offline` 不显示（离线横幅已说明）。

### 6.3 面包屑（`U.13.06` §3、`U.09.03`）
- 数据：`crumbs(model, scope)`。根图时整个面包屑和分支都不显示（`U.23-R11`）。
- 每一级是按钮，点击 → `useNav().leaveTo(那一级的 scope)`；当前层加粗、不可点（`aria-current="page"`）。
- `compact`（< 900）：只显示上一层和当前层，中间一个"…"按钮，点开 `Menu` 列出完整路径（`U.09.03` §1）。
- `isDeep(model, scope)`（层号 > 4）：最后一级旁显示警告图标，提示框"嵌套较深，建议存入子图库"（`U.13.06-R5`）。
- 另一层有审批（`U.14.04` §2）：`approvals.byId` 里属于当前图、且所在层（`Approval.loc` 按 `C.06.05` 取最内层容器节点 ID，没有容器为 `root`）不是当前层的条目数 > 0 → 面包屑后显示 `wait` 色小标"另一层有审批"；点击 → 进入第一条所在的层（`enterLayer`，所在层是当前层的上层时 `leaveTo`）。

### 6.4 AI 草稿分支与合并（`C.05.04` §3、§5，`E.05.06`，`P.09` K116）
- 前端只编辑 `main`（`W.03.05` §6.7）；模型在档位 1–3、或档位 4 冲突时写进 `draft/model-<id>` 分支。`BranchChip` 在 `graph.branches` 里有 `ahead > 0` 的 `draft/` 分支时出现："AI 草稿 · 领先 N"，`behind > 0` 时加"· 落后 M"；多个草稿分支时显示最近更新的那个和"等 K 个"。数据在面板挂载和收到 `branch.updated`（`W.03` §6.2）后由 `graph.loadBranches()` 刷新。根图以外的层也显示（分支属于整张图，只有面包屑受 `U.23-R11` 约束；根图时只显示分支、不显示面包屑）。
- 点击 → `BranchMenu`：
  | 项 | 动作 |
  |---|---|
  | 查看并合并到主线… | 打开 `MergeDialog` |
  | 更新到最新主线 | `graph.rebaseBranch(name)`；成功提示"已更新"，409 提示服务端原因 |
  | 丢弃这个草稿 | 确认框（不可撤销，`U.11-R1`）："丢弃 AI 草稿「name」？里面的修改都会丢掉" → `deleteBranch` |
- `MergeDialog`（`Dialog` 宽 560）：打开时 `mergePreview(name)`（300ms 以上显示旋转弧）。
  1. 顶部一行：自动合并 N 处 · 需要你选择 M 处 · 校验问题 K 个。
  2. 冲突逐条：对象（节点名、参数名，经 `describeOp` 同一套文案）、主线的值、草稿的值；每条一个 `Segmented`：保留主线 / 用草稿；参数类冲突另有"自己填"（`TextInput`，提交时按参数类型解析，解析失败行内红字）。坐标冲突不会出现（`E.05.06` §6）。
  3. 校验问题列出 `Diag` 文案，不阻止合并（服务端会再校验）。
  4. 按钮：取消 · 合并（所有冲突都选了才可用）→ `mergeBranch(name, resolutions)`；成功关闭并提示"已合并到主线"（带"撤销"→ `ops.undo()`，合并是用户的一组操作）；`ErrUnresolved` / 409 → 重新拉预览并保留已选的项。

### 6.5 编排者模型胶囊（`U.12` §5、`U.09.03`）
- 只在 `bp = 'xl'`（≥ 1180）显示。文字：当前会话的编排者模型名（`session.orchestrator_model`，缺省取设置里的默认模型，`P.09` Q17）。
- `model.activity.state ∈ {thinking, editing}`：左侧模型色呼吸点（透明度 0.4 ↔ 1，周期 `--hx-t-breath`（1.2 秒，`P.09` K124），减少动效时静态），文字换成"AI 正在编辑…"（`thinking` 时"AI 正在思考…"）；同时 `useAnnounce` 播报一次（polite），给看不到 AI 光标的读屏用户（`W.06.14` §6.5）。
- 点击 → 打开 `W.07.07` 的 `ModelPicker`（锚在胶囊下方）。

### 6.6 档位胶囊与授权面板（`U.12` §6、`U.14.04` §3）
- `levelBadge(model)` → 5 格刻度 + 数字（只有这两样，`U.23-R10`）：当前档位以内的格子实色；0–2 档 `text-2`、3 档 `wait`、4 档 `accent`；`isScopeOverride` 时数字后加 `text-3` 小字"本层"。急停时显示 0（`W.03.06` §6.6）。提示框："{n} {名称}：{一句话}"（如"1 建议：AI 只能提议，由你决定是否采纳"）。
- 点击 → `LevelPanel`（`Popover`，宽 320）：
  - 五档逐行：刻度、"0 只读"…"4 完全"、一句话说明；当前档有对勾。点某一档 → `model.setSessionLevel(n)`（不乐观，按钮显示旋转弧直到返回，`W.03.06` §6.6）；失败（403、423）在面板里一行红字写原因。
  - 当前生效：授权书名称、挂在哪（`Effective.anchor`：会话 / 图 / 容器节点名称，用 `crumbs` 的显示名）；"为什么是这一档"可展开，列出 `Effective.chain`。
  - "在这一层单独设置…"：`ui.openCenter('settings', 'authz:' + scope)`（`W.09.02`）。
  - 急停中：五档都置灰，提示"急停中，解除后再调整"（解除只在横幅，`W.07.10`）。

### 6.7 运行按钮与运行状态（`U.14.04` §1–§2、`U.14.03` §1）
- 演示模式标记：`settingOf(settings, 'models.demo_mode', false)` 为真时，会话名后显示 `Badge neutral`"演示模式"，提示框"所有模型输出是示例数据 · 点这里管理模型"，点击 → `ui.openCenter('settings', 'models')`（`U.18` §2 第 2 步、`B.06.04` §5，`P.09` K147）。
- `RunButton`：`Button variant="primary"`，图标 play + "运行"；根元素带 `data-tour="run"`（画布导览读取位置，`W.09.03`，K147）；`useShortcut('run.start', …)` 注册 `Mod+Enter`（焦点在对话框里时由 `composer` 层先处理成发送，`W.02.04` §6.1）。
  | 状态 | 外观 | 点击 |
  |---|---|---|
  | 没有图、急停中、离线 | 置灰，提示框写原因（`useEditBlock` + `estop.global`；急停："急停中不能运行"，`U.19.04` §3） | 无 |
  | 当前运行 `running` / `pending` | "运行中"、置灰 | 无 |
  | 其他 | 正常 | `run.start()` |
- `start` 失败：422 `invalid_graph` → 打开问题徽标的弹层并列出 `details.diags`；503 `provider_unavailable` → 提示"还没有可用的模型" + "去设置"（`ui.openCenter('connections')`）；423 不提示（横幅已说明）；其他 → 错误提示。
- `RunStatus`（运行时才出现，`U.23-R10`）：状态徽标 + 计时 + 等待审批数：
  - `running`：`accent` 弱色徽标"运行中"+ 计时（`m:ss`，从 `meta.created_at` 算起）；`paused`：`wait` 徽标"已暂停"；当前运行里有待审批：再加 `wait` 徽标"等待审批 · N"（`pendingCount` 只数当前运行的，`C.07-R2`）。
  - 计时每秒更新：用 `setInterval` 直接写 `ref.current.textContent`，**不**触发 React 提交（`U.17-R10`）；运行结束清除定时器。
  - 点击徽标 → `ui.setRs(true, 'mon')`（`U.09.02` §2、`U.09.07` §1）。
- 校验问题徽标（图级错误，`U.14.03` §1）：`graph.diags.items` 里 `level='error'` 的条数 > 0 → `danger` 弱色徽标"N 个问题"（不在运行时也显示）；点开 `Popover` 列出每条诊断文案和所在节点，点一条 → `useLocate({scope, nodes:[node]})`。

### 6.8 急停按钮（`U.14.04` §3、`U.23-R10`、`E.06.04`，`P.09` K118）
| 状态 | 外观 |
|---|---|
| 平时（没有运行在进行） | 灰色图标按钮（`IconButton`，图标 stop，`aria-label`"急停"，提示框"急停 · {keys.label('estop.trigger')}"） |
| 有运行在进行（`session.activity` 里任一会话 `runningRunIds` 非空，或当前运行在进行） | `Button variant="danger" size="sm"`：图标 + "急停"文字 |
| 急停中 | 顶部条 `is-estop`；按钮变为"已急停"，置灰（再按没有作用；解除只在横幅） |
- 点击或 `Mod+.`（`useShortcut('estop.trigger')`，任何焦点、任何界面都生效，模态里也继续往下传，`W.02.04` §6.1）→ `session.triggerEstop()`，**不弹确认**；同时 `useAnnounce(t('top.estop.on'), 'assertive')`（`U.16-R5`）。
- 请求失败（极少见，例如断开）：提示"急停请求没有送达，请重试"（`level:'error'`，不自动消失）；不做任何本地"假装已急停"。
- 平时只有图标是 `U.23-R10` 的要求；`U.08-R5`"危险操作的图标按钮另配文字"对急停的平时状态不适用——急停按下只会停止，不会造成不可恢复的后果，且提示框和 `aria-label` 都有文字（`P.09` K118，`U.08-R5` 已加注）。

### 6.9 主题菜单（`U.03.05`、`U.23-R10`）
- 按钮只显示当前配色的三粒色点（`THEMES[i].preview[resolved]` 的前三个，用 `style={{'--_c1': 'var(--hx-…)'}}` 引用令牌名，不写色值，`G.06.03-R9`）。
- 点开 `Popover`：四套配色逐行（名称、一句话、色点，当前项对勾）→ `themeController.setPalette`；明暗 `Segmented`（浅色 / 深色 / 跟随系统）→ `setMode`；"减少动效" `Switch` → `setMotion('reduce' | 'auto')`；底部"更多外观设置…" → `ui.openCenter('settings', 'appearance')`。

### 6.10 侧栏开关
- `LsToggle`：图标 panelL，`pressed = lsOpen`；点击 `ui.setLs(!lsOpen)`；提示框"左侧栏 · `[` · 专注模式 `F`"（`U.09.02-R6`）。
- `RsToggle`：图标 panelR，`pressed = rsOpen`，`dot = rsDot(ui, sessionId) ? 'focus' : undefined`（右栏收起且有选中，`U.09.02-R1`）；点击 `ui.setRs(!rsOpen)`；提示框"右侧栏 · `]` · 专注模式 `F`"。右栏里不再有收起按钮（`U.24` #10）。

### 6.11 共用 hook 的实现要点
- `useLocate`：按 `W.07` §4.2 的六步；等待都用一次性订阅 + 3 秒超时，组件卸载时取消；同一时刻只进行一次定位，新的调用取消旧的（旧的返回 `blocked`）。
- `useShortcut`：`useEffect(() => keys.on(id, handlerRef.current 包装, {when}), [id, enabled])`；处理函数用 ref 保存最新值，不因每次渲染重新注册。
- `useEditBlock`：`ui.net ≠ 'online'` → `offline`（"已断开，恢复后可以编辑"）；`useOps()` 为 null → `readonly`；会话没有图 → `no-graph`；否则 null。急停期间用户仍可编辑图（`P.09` K82），所以急停不在这里。
- `describeOp`：按 `OpKind` 取文案模板（`common.op.<kind>`），填节点显示名（`model` 里找不到时用"已删除的节点"）、参数的 `label`（`NodeDef`，没有时用键名）、数量；`group` / `apply_patch` 等复合 Op 写"打包为子图「X」""应用了 N 处修改"。

## 7. 不变量
- 顶部条在会话页任何时候都显示急停按钮且可用（`/welcome` 除外）；本文没有任何解除急停的入口（INV-10、`W-R6`）。
- 档位只显示服务端结果；没有任何本地推算或乐观修改（`W-R4`）。
- 实心主色只用在 H 标识和运行按钮（`U.23-R2`）。
- 运行计时不产生 React 提交。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 改名失败 | §6.2 |
| `start` 失败 | §6.7 |
| 设档位失败（403 / 423） | 授权面板里一行红字，档位不变 |
| 合并预览失败 | 对话框里"拉取失败 · 重试"；合并失败见 §6.4 第 4 步 |
| 急停请求失败 | §6.8 |
| `graph` 还在加载 | 面包屑、分支、问题徽标不显示；会话名照常 |

## 9. 性能与资源
- 顶部条订阅的字段：会话标题、`graph.sync.state`、`crumbs` 结果（按 model 缓存）、`branches`、`diags` 计数、当前运行的 `status` / `cancelRequested`、待审批计数、`estop`、`levelBadge`、`activity.state`、主题；`activity` 每秒多次变化时只有模型胶囊重渲染。
- 运行中顶部条的 React 提交只来自状态变化（开始、暂停、结束、待审批数变化），不来自计时。

## 10. 验收标准
1. 根图时不显示面包屑；进入第 3 层后面包屑"根图 / 闭环迭代 / 资料采集"，点"根图"回到根图；窗口 < 900 时中间折叠成"…"。
2. 运行中：运行按钮变"运行中"并置灰，旁边徽标计时每秒走；点徽标打开右栏监控页；有审批时出现"等待审批 · 1"。
3. 平时急停是灰色图标；运行中变为红底"急停"；按 `Ctrl+.`（焦点在对话框里也一样）立即急停，不弹确认，顶部条变为危险色底，档位胶囊显示 0。
4. 档位胶囊点开授权面板，选 3 档：返回后胶囊显示 3、第 4 格起不亮；进入单独设了授权书的子图显示"本层"。
5. 模型改图时模型胶囊出现呼吸点和"AI 正在编辑…"，读屏播报一次；窗口 < 1180 时模型胶囊不显示。
6. 有 AI 草稿分支时出现"AI 草稿 · 领先 3"；合并预览里两处冲突都选好后才能合并，合并后提示"已合并到主线"，撤销可以回去。
7. 主题菜单切换配色和明暗即时生效；打开"减少动效"后呼吸点静止。
8. 运行中 10 秒，React Profiler 里顶部条没有因计时产生的提交。

### 实施卡
- 要建 / 要改的文件：
  - `web/src/panels/top-bar/TopBar.tsx`、`TopBar.css`、`SessionTitle.tsx`、`Crumbs.tsx`、`BranchChip.tsx`、`BranchMenu.tsx`、`MergeDialog.tsx`、`ModelPill.tsx`、`LevelPill.tsx`、`LevelPanel.tsx`、`RunButton.tsx`、`RunStatus.tsx`、`EstopButton.tsx`、`ThemeMenu.tsx`、`RsToggle.tsx`、`LsToggle.tsx`，每个组件同名 `.css`、`.test.tsx`。
  - `web/src/panels/shared/useLocate.ts`、`useShortcut.ts`、`useEditBlock.ts`、`describeOp.ts` 及同名 `.test.ts`。
  - `web/tests/e2e/top-bar.spec.ts`；`web/tests/visual/top-bar.spec.ts`（五个宽度 × 浅色 / 深色 × 平时 / 运行中 / 急停）。
- 不许碰的文件：`web/src/shell/`（只调用 `keys`、`themeController`）、`web/src/state/`（新增的四个 graph action 由 `W.03.01` 实现，本叶子只调用）、`web/src/canvas/`、其他 `panels/` 目录、`design/tokens.css`、`schema/`。
- 函数签名：见 §4、`W.07` §4.2。
- 测试用例：
  - `W0701-T1 面包屑`：根图 → 不渲染；第 3 层 → 3 级、当前级 `aria-current`；点第 1 级 → `leaveTo('root')`；`compact` → 2 级 + "…"
  - `W0701-T2 深层与另一层审批`：层号 5 → 警告图标；一条审批在别的层 → "另一层有审批"，点击 → `enterLayer(那一层)`
  - `W0701-T3 改名`：Enter 提交、Esc 取消、空串不提交；`rename` 拒绝 → 提示一次
  - `W0701-T4 保存状态`：`saving` 200ms → 不显示；400ms → "正在保存…"
  - `W0701-T5 草稿分支`：`branches` 有 `draft/model-x{ahead:3, behind:2}` → "AI 草稿 · 领先 3 · 落后 2"；没有 `ahead>0` 的草稿 → 不渲染
  - `W0701-T6 合并对话框`：两处冲突未选完 → 合并置灰；选完 → `mergeBranch` 收到两条 `Resolution`；返回 409 → 重新 `mergePreview` 且保留已选
  - `W0701-T7 档位`：`levelBadge={level:3,isScopeOverride:true}` → 3 格亮、`wait` 色、"本层"；点 2 档 → `setSessionLevel(2)`，返回前不改显示；拒绝 → 面板红字
  - `W0701-T8 运行按钮`：没有图 / 急停 / 离线 → 置灰且提示框有原因；运行中 → "运行中"置灰；`start` 422 → 问题弹层列出 `diags`；503 → 提示带"去设置"
  - `W0701-T9 计时不提交`：运行中推进假时钟 5 秒 → `textContent` 变 5 次，组件渲染次数不变
  - `W0701-T10 急停`：平时 → `IconButton`；有运行 → 红底文字按钮；点击 → `triggerEstop` 1 次、`announce(…,'assertive')`；急停中 → 顶部条 `is-estop`、按钮置灰；全文件不出现 `releaseEstop`
  - `W0701-T11 急停快捷键`：焦点在 `textarea` 里按 `Mod+.` → `triggerEstop`
  - `W0701-T12 模型胶囊`：`bp='lg'` → 不渲染；`activity.state='editing'` → 呼吸点 + "AI 正在编辑…"；减少动效 → 无动画类
  - `W0701-T13 右栏开关小圆点`：右栏收起 + 有选中 → `dot`；打开右栏 → 无
  - `W0701-T14 useLocate 跨会话`：目标在会话 B → `switchSession(B)`；工作区就绪后 `cmd.locate`；view scope 到位后 `ui.select`
  - `W0701-T15 useLocate 异常`：节点不在 → `gone`；3 秒内工作区没就绪 → `timeout`；第二次调用取消第一次
  - `W0701-T16 useShortcut`：重新渲染不重复注册；卸载后注销
  - `W0701-T17 useEditBlock`：`net='reconnecting'` → `offline`；急停 → null（K82）
  - `W0701-T18 describeOp`：`set_param` → "把「验收者」的「超时」改为 120"；节点不存在 → "已删除的节点"
  - `W0701-T19 视觉回归`：§实施卡的截图组合
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`（`G.10` §3.3、§3.4）。
- 禁止事项：`G.02.05` 全部（特别是 R14、R23、R26）；另：不提供解除急停的按钮或快捷键；急停不弹确认；不乐观修改档位；运行计时不走 `setState`；不在面包屑里自己拼层路径（只用 `crumbs`）。
- 完成标志：`G.14` 全部条件（含浅色、深色截图、键盘走查、减少动效检查）；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 8 棒；`P.09` K111、K116、K118 |
| 2026-11-23 | 模型胶囊呼吸点的周期写成令牌 `--hx-t-breath` | 第 9 棒写 `W.08`；`P.09` K124 |
| 2026-11-23 | 加演示模式标记；运行按钮加 `data-tour="run"` | 第 9 棒写 `W.09.03`；`P.09` K147 |
| 2026-11-25 | 结构化 Diff、分支合并的引用由 `E.05.03` 改为 `E.05.06` | `P.09` K261 |
