# W.09.01 会话首页与空状态

| 项 | 内容 |
|---|---|
| 编号 | W.09.01 |
| 类型 | 实施 |
| 上级 | W.09 页面 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设14；demo v0.5（v0.5.11）`32_sessions.js`（空白画布卡片、从模板新建）；`U.14.02`、`U.09.04-R8`、`R9`；`P.09` K60、K148 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`/` 在没有任何会话时的首页，以及会话页画布上的三种空状态（会话里没有图、当前层为空、没有可用模型）；从模板开始的卡片和"从模板创建"的流程（`startFromTemplate`），供首次引导和资源库模板页复用。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| `/` 什么时候跳到最近会话、`/welcome` | `W.02.01` |
| 监控页没有运行、节点库搜索无结果的空状态 | `W.07.05`、`W.07.02`（`U.14.02` 第 4、5 行） |
| 画布引擎的 `is-empty` 状态 | `W.06.01`（本文只叠加文案和按钮） |
| 模板实例化本身（ID 映射、挂会话、自动改名） | 后端 `B.04.13`、`B.06.05` |
| 首次引导里的模板选择页 | `W.09.03`（复用本文的 `TemplateCards`） |
| 模板的完整列表与详情 | `W.09.02` 资源库 › 模板 |

## 3. 继承的上级约束
`W.09` §4–§6、`W.09-R1`–`R6`；`W.02.01` §4.1（`/`、`/c/:sessionId`）；`W.02.02` §4.1（`canvasOverlay`，K148）、§7（对话框任何时候可用）；`W.06.01` §6 第 6 步（`unbound`）；`W.06.07` §4（`PRESET_MIME`、`cmd.addNode`）；`W.03.05`（`create`、会话列表、工作区 `canvas()`）；`W.03` §4.5（`models`、`settings`、`defs`）、§4.6（`templates`、`instantiateTemplate`、`newGraph`）；`U.14.02`（全部，含 R1、R2）；`U.09.04-R8`、`R9`；`U.09-R2`；`U.23-R2`（一屏一个实心按钮：空状态里不放 `primary` 按钮）、`R12`、`R13`；`U.11` §2；`P.09` K60、K148。

## 4. 接口
```tsx
// web/src/pages/home/HomePage.tsx —— `/` 且没有会话时由 W.02.01 渲染
export function HomePage(): JSX.Element;      // <AppShell mode="session" canvasOverlay={<CanvasEmpty kind="first" />} />

// web/src/pages/home/CanvasEmpty.tsx —— SessionRoute 把它作为 AppShell 的 canvasOverlay
export type EmptyKind = 'first' | 'nograph' | 'layer';
type CanvasEmptyProps = { kind?: EmptyKind };  // 缺省：按当前会话与当前层自动判断（§6.1）；HomePage 固定传 'first'
export function CanvasEmpty(p: CanvasEmptyProps): JSX.Element | null;

// web/src/pages/home/TemplateCards.tsx
type TemplateCardsProps = {
  templates: readonly Template[];               // 调用方选好的模板（首页、空白画布：starterTemplates()；引导：同；资源库：全部）
  blank?: boolean;                              // 末尾加"空白画布"卡片（只有 first 和引导里有）
  layout: 'row' | 'grid';                       // row：空状态里一行居中；grid：资源库
  busy?: string | null;                         // 正在创建的模板名：该卡片显示 Spinner，其他卡片禁用
  onPick(t: Template | 'blank', anchor: HTMLElement): void;
};
export function TemplateCards(p: TemplateCardsProps): JSX.Element;
export function starterTemplates(all: readonly Template[]): readonly Template[];   // tags 含 'starter' 的前 3 个，按接口返回顺序（K148）

// web/src/pages/home/startFromTemplate.ts
export type StartDeps = {
  session: SessionActions; hub: HubActions; nav: ReturnType<typeof useNav>;
  ui: UiActions; t: (k: string, v?: Record<string, string | number>) => string;
  undo: () => Promise<unknown>;                 // 新图就绪后当前 Op 队列的 undo（W.05）
};
export function needsInputs(t: Template): boolean;   // 有 required 且没有 default 的输入
export function defaultInputs(t: Template): Record<string, unknown>;
export async function startFromTemplate(d: StartDeps, t: Template, o: { sessionId: Ulid | null; inputs: Record<string, unknown> }): Promise<{ sessionId: Ulid; graphId: Ulid }>;
export async function startBlank(d: StartDeps): Promise<Ulid>;   // 新建会话并切过去（U.09.04-R8）

// web/src/pages/home/TemplateInputsPopover.tsx —— 模板有必填输入时，在卡片上弹出的填空表单
type TemplateInputsPopoverProps = { template: Template; anchor: HTMLElement; onStart(inputs: Record<string, unknown>): void; onClose(): void };
export function TemplateInputsPopover(p: TemplateInputsPopoverProps): JSX.Element;
```
### 4.1 依赖
`W.02.02` 的 `AppShell`（`canvasOverlay`）、`useCanvasAreaRect`；`W.02.01` 的 `useNav`；`W.03` §4.2 的 hook；`W.03.05` 的会话列表、`create`；`W.03` §4.5 的 `models`、`settings`、`settingOf`、`defs.summaries`；`W.03` §4.6 的 `templates`、`load('templates')`、`instantiateTemplate`、`newGraph`、`patchSettings`；`W.03.01` 的 `nodesIn`；`W.03.03` 的 `openCenter`、`notify`、`tour`；`W.05` 的 `useOps()`；`W.06.01` 的 `useCanvasCommands`；`W.06.07` 的 `PRESET_MIME`；`W.09.02` 的 `FieldControl`、`fromTemplateInput`；`W.08` 的 `Button`、`Popover`、`Spinner`、`Icon`、`EmptyState`；`W.10` 的 `useT`、`fmtCost`。

## 5. 数据结构
`Template`（`B.04.13`：`name`、`version`、`title`、`summary`、`tags`、`cost_hint`、`inputs`、`requires`）从 `@/lib/protocol` 导入。本文私有：`EmptyKind`。

## 6. 行为

### 6.1 显示哪一种（`CanvasEmpty` 自动判断）
| 条件（按顺序，命中即停） | 显示 |
|---|---|
| `ui.tour` 为真 | 不显示（导览占用 `canvasOverlay`，`W.09` §6.1） |
| `kind='first'`（首页） | §6.2 第一次打开 |
| 当前会话的工作区 `graphId === null` | §6.3 会话里没有图 |
| 当前层（URL 的 `scope`，缺省 `root`）里除子图端口和便签外没有节点 | §6.4 当前层为空 |
| 其他 | `null` |
- 当前层从 `useSearchParams().get('scope') ?? 'root'` 取：地址栏与画布正在显示的层一致（`W.02.01` §7），不订阅 view store（`W-R2`）。
- "子图端口"按节点类型的 `category`（`NodeDefSummary.category` 为子图端口所在的边界类，`C.03.01` §6）判断，不比较类型名（`G.02.05-R9`）。
- 卡片区之外 `pointer-events: none`：画布照常可平移、缩放，对话框照常可输入（`U.09-R2`）。

### 6.2 第一次打开（`U.14.02` 第 1 行）
- 居中一张卡片（`hx-empty`，玻璃材质以外的普通 `bg-2`、`shadow-pop`）：标题"搭一个会自己干活的 AI 系统"（20/600）、说明"从模板开始最快，也可以直接在下面告诉 AI 你想做什么"、`TemplateCards`（`starterTemplates` 三张 + 空白画布，`layout='row'`）。
- 上方加 §6.5 的"没有可用模型"行（条件满足时）。
- 点模板 → §6.6；点空白画布 → `startBlank`：`session.create()` → `nav.switchSession(id)`；切过去后显示 §6.3，对话框获得焦点（`U.09.04-R8`）。
- 首页时对话框照常显示：第一次发送由 `W.07.07` 先建会话再发送（`W.07.07` §8，K148）。
- 模板列表还没加载完（`hub.templates.status ≠ 'ready'`）：卡片位置显示三个同尺寸的骨架块（不用旋转弧，`U.14.01` 300ms 规则照常）；加载失败：一行"模板没有加载出来 · 重试"。

### 6.3 会话里没有图（`U.14.02` 第 2 行）
- 标题"空白画布"，说明"在下面的对话框里描述你想做的事，AI 会帮你搭图；也可以从模板开始，或从左侧节点库把节点拖进来"；`TemplateCards`（三张，不带空白画布）。
- 位置：画布区域水平居中，卡片底边在对话框（和浮动回复、提议栏）上方 `--hx-s-5`，不遮挡对话框（`U.09.04-R8`）；用 `fitInsets.bottom` 计算底边（`W.02.02` §6.3），不读 DOM。
- 节点库条目拖到这里（`dataTransfer` 带 `PRESET_MIME`）：`hub.newGraph(sid)`（新建空图、挂到会话、设为当前）→ 等工作区的 graph `status='ready'`、引擎 `ready` → `cmd.addNode(preset, {at: 放下点})`；整个过程中卡片显示 Spinner；任一步失败 → 错误提示，不留下空图以外的东西。
- 用户在对话框里让 AI 建图、或从模板创建后，`active_graph_id` 变化 → 工作区换图 → 本状态自然消失（`W.03.05` §6.4）。

### 6.4 当前层为空（`U.14.02` 第 3 行）
画布中央一行淡色提示（`text-3`、13px，没有卡片、没有按钮）："从左边的节点库拖一个节点进来，或者按 A 搜索"，其中 `A` 用 `keys.label('node.quickAdd')`（`W.07-R7`）。第一个节点出现后消失。只读画布（`canvasReadonly`、急停不影响）时改为"现在不能修改这一层"（`useEditBlock` 的文案）。

### 6.5 没有可用模型（`U.14.02` 第 6 行）
条件：`catalog.models.length === 0` 且 `settingOf(settings, 'models.demo_mode', false) === false`。在 §6.2、§6.3 的卡片里、标题上方显示一行（`wait` 弱色底）："还没有可用的模型 · 先添加一个模型提供方，才能运行和让 AI 改图；不配置也可以用演示模式体验" + 两个 `ghost` 按钮："去设置"→ `ui.openCenter('connections', 'group:模型')`（`U.19.07` 第 1 步）；"用演示模式"→ `hub.patchSettings({'models.demo_mode': true})`（`B.06.04` §5），成功后 `catalog.loadModels()`。

### 6.6 从模板开始（`startFromTemplate`）
1. 点模板卡片：`needsInputs(t)` 为真 → 在卡片上打开 `TemplateInputsPopover`（字段按 `fromTemplateInput` 生成、默认值预填、"开始"按钮；Enter 开始、Esc 关闭）；否则直接用 `defaultInputs(t)`。
2. 没有会话（`sessionId=null`）：`session.create()`。
3. `hub.instantiateTemplate(t.name, {sessionId, inputs})`（`POST /templates/{name}/instantiate`，带 `session_id`：后端挂图、设为当前图、插入图卡片消息、会话还叫默认名时改名为模板标题，`B.04.13`、`B.06.05`、`U.09.04-R9`）。
4. 不是当前会话 → `nav.switchSession(sessionId)`；会话流的 `session.graph_attached` 带来新的当前图，路由 `replaceLocation`（`W.03.05` §6.4、`W.02.01`）。
5. 新图就绪后 `ui.notify({level: 'ok', text: t('home.fromTemplate', {title}), action: {label: t('common.undo'), run: undo}})`；"撤销"撤掉这次 `import_apply`（`U.09.04-R9`）。
6. `ui.tour` 为真（引导里选的模板）时不弹这条提示，由导览接手（`W.09.03`）。

| 失败 | 处理 |
|---|---|
| 422 缺依赖（`C.13.04-R3`） | 卡片下方红字列出缺失项（"需要扩展包：飞书连接器"），给"去包管理"→ `openCenter('packages')`；第 2 步新建的会话保留（空白画布） |
| 503 没有可用模型 | 不会出现（实例化不调用模型）；照常 |
| 其他 `ApiError` | 错误提示；卡片恢复 |
| 同时点第二张卡片 | `busy` 期间其他卡片禁用，不排队 |

### 6.7 视觉
- 卡片：宽 `min(640, 100cqw - 2×--hx-float-inset)`；模板卡片三张等宽，间距 `--hx-s-2`，每张：图标 16px `text-3`（`U.22-R12` 同规则，不加底板）、标题 13/600、说明 12/`text-2` 两行截断、底部一行 `fmtCost` 的预计花费（`cost_hint`，没有时不显示）；悬停只加深底色（`U.23-R5`）。
- 没有实心主色按钮（`U.23-R2`：一屏一个实心按钮留给运行和发送）。
- 不放插画；图标 ≤ 32px（`U.14.02-R2`）。
- 文案温和具体，不用"暂无数据"（`U.14.02-R1`）。

## 7. 不变量
- 空状态卡片任何时候不遮挡对话框；对话框在首页和空状态下都可输入。
- 从模板创建只发一次实例化请求；失败不留下半张图。
- 空状态的显示只由数据决定（会话、当前图、当前层节点、模型、设置），不依赖组件内部的"看过一次"之类的状态。

## 8. 错误处理
见 §6.6 的表；模板列表加载失败见 §6.2；`newGraph` 失败 → 错误提示，画布保持空白画布；拖入时网络断开 → 不发请求，提示框说明"连接恢复后才能修改"（`useEditBlock`）。

## 9. 性能与资源
- `HomePage`、`CanvasEmpty`、`TemplateCards` 进首屏 chunk（它们就是首屏），总计 ≤ 8KB gzip；`TemplateInputsPopover` 与 `FieldControl` 动态加载。
- `CanvasEmpty` 只订阅：工作区 `graphId`、当前层的非端口节点数（选择器返回数字）、`models.length`、`demo_mode`、`tour`、`templates.status`；画布平移缩放时不重渲染（`W-R2`）。

## 10. 验收标准
1. 新数据目录、引导已完成、没有会话：打开 `/` 看到第一次打开的空状态；点"闭环迭代"→ 新会话、画布上是模板图、会话名为模板标题；点提示里的"撤销"→ 图被撤掉、画布回到空白画布。
2. 新建会话：画布显示"空白画布"和三张模板卡片，卡片在对话框上方、不遮挡；对话框有焦点。
3. 从节点库拖一个"Agent"到空白画布：会话得到一张新图，节点出现在放下的位置。
4. 进入一个只有入口、出口的新子图：中央出现"从左边的节点库拖一个节点进来，或者按 A 搜索"；加一个节点后消失。
5. 没有模型连接、没开演示模式：空状态里出现"还没有可用的模型"；点"用演示模式"后这一行消失。
6. 模板缺少扩展包：卡片下方列出缺什么，不创建图。
7. 平移、缩放画布时 `CanvasEmpty` 的 React 提交次数为 0。

### 实施卡
- 要建 / 要改的文件：`web/src/pages/home/HomePage.tsx`、`CanvasEmpty.tsx`、`TemplateCards.tsx`、`TemplateInputsPopover.tsx`，各自同名 `.css`、`.test.tsx`；`web/src/pages/home/startFromTemplate.ts`、`startFromTemplate.test.ts`；`web/tests/e2e/home-empty.spec.ts`。
- 不许碰的文件：`web/src/routes/`（`W.02.01` 引用 `HomePage`、`CanvasEmpty`，由它的实施任务接入）、`web/src/shell/`、`web/src/state/`、`web/src/ops/`、`web/src/canvas/`、`web/src/panels/`、`web/src/components/`、`web/src/lib/protocol/`、`design/tokens.css`、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0901-T1 判断顺序`：`tour=true` → null；`kind='first'` → first；`graphId=null` → nograph；当前层只有入口、出口、便签 → layer；有一个 Agent → null
  - `W0901-T2 端口按类别判断`：把子图端口类型改名（夹具里 `category` 不变）结果不变；源码里没有子图端口的类型名字面量
  - `W0901-T3 starterTemplates`：5 个模板里 2 个带 `starter` → 返回 2 个；4 个带 → 返回前 3 个，顺序同输入
  - `W0901-T4 needsInputs / defaultInputs`：必填无默认 → true；全部有默认 → false 且 `defaultInputs` 取默认值
  - `W0901-T5 从模板开始（无会话）`：依次调用 `create`、`instantiateTemplate(name, {sessionId: 新 ID, inputs})`、`switchSession`；提示带"撤销"，点它调 `undo` 一次
  - `W0901-T6 从模板开始（已有会话）`：不调 `create`、不调 `switchSession`；`instantiateTemplate` 的 `sessionId` 为当前会话
  - `W0901-T7 缺依赖`：422 `details.missing=[…]` → 卡片下方列出、`busy` 复位；没有第二次请求
  - `W0901-T8 拖入建图`：放下 `PRESET_MIME` → `newGraph` → 引擎 `ready` 后 `cmd.addNode` 收到放下点；`newGraph` 失败 → 不调 `addNode`
  - `W0901-T9 没有可用模型`：`models=[]`、`demo_mode=false` → 显示；点"用演示模式"→ `patchSettings({'models.demo_mode': true})` 一次；`demo_mode=true` → 不显示
  - `W0901-T10 不遮挡对话框`：`fitInsets.bottom=180` → 卡片底边 ≤ 画布高 − 180 − `--hx-s-5`
  - `W0901-T11 当前层提示的快捷键`：文案里的按键来自 `keys.label('node.quickAdd')`
  - `W0901-T12 平移不重渲染`：React Profiler 下平移 2 秒，`CanvasEmpty` 提交 0 次
  - `W0901-T13 端到端`：§10 验收 1–3（Playwright，`--fake-llm`）
- 允许使用的依赖：`react`、`react-router`、`zustand`（`G.10` §3.3）；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R9、R23、R26、R32）；另：不在空状态里放实心主色按钮；不写具体模板名；不在组件里发请求；不读画布 DOM 计算卡片位置。
- 完成标志：`G.14` 全部条件；§10 七条验收通过；浅色、深色截图（首页、空白画布、当前层为空）进视觉回归。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 9 棒（B）；`P.09` K148 |
