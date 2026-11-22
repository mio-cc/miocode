# W.07.03 右侧栏：属性

| 项 | 内容 |
|---|---|
| 编号 | W.07.03 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设11；demo v0.4 `27_panels.js`（属性页）；demo v0.5（v0.5.11）`37_nodes.js`（参数两种填法、提示词预览）、`13_polish.css`；`C.03.02` §4、`C.03.05`、`U.10.07`、`U.12` §2、`U.16` §4；`P.09` K113、K119 |
| 最后修改 | 2026-11-23 |

## 1. 职责
右侧栏的容器（三个标签页：属性 / 对话 / 监控）和其中的"属性"页：按选中显示节点、多选、连线、便签、当前层的属性；参数表单完全由 NodeDef 的声明生成；参数接线、模型改过的参数、锁、诊断的显示；大编辑器与"预览最终提示词"；选中节点在当前运行里的执行情况与节点执行详情（按需加载大内容）；列表视图（读屏用户的替代编辑方式）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 右栏宽度、覆盖式右栏、点空白处关闭 | `W.02.02` §6.1 |
| 节点上的内联参数控件 | `W.06.03` |
| 对话页、监控页的内容 | `W.07.04`、`W.07.05` |
| 参数值的合法性最终校验 | 后端（属性页只做 `ops.check` 的提示性预检，`W-R4`） |
| 节点执行详情的数据获取、缓存 | `W.03.04` `nodeDetail`（本文按需调用） |
| 控件本身 | `W.08.02`、`W.08.03` |
| "让 AI 解释 / 优化这个节点" | `W.07.11` 右键菜单（本文不重复放） |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`；`W.02.02` §6.4（`I` 打开属性页；选中不打开右栏）；`W.03.01` §4.3（`diagsOf`、`editingByOthers`、`modelTouched`）；`W.03.03`（`selectionOf`、`canvasReadonly`、`listView`）；`W.03.04` §4（`live.stateOf`、`execsOf`、`nodeDetail`）；`W.03.06` §6.5（`activity.target` → "AI 等你改完这个节点"）；`W.05` §4.1（`dispatch`、`check`、`gesture`、`setEditing`、`revertOp`、`canConnect`）；`W.06` §4.2（`inspect`、`param.editLarge`、`prompt.preview`）；`C.03.02` §3–§5；`C.03.03`；`C.03.05`（全部）；`C.02.02`（`Origin`）；`B.04.03` §5（`NodeDetail` 大内容只给引用，前端按需加载）；`U.09.02-R1`、`R6`；`U.10.07` §2–§4；`U.11`；`U.12` §2；`U.14.03` §1；`U.14.05`；`U.16` §3–§4；`U.19.05`；`P.09` K113、K119。

## 4. 接口

### 4.1 组件
```tsx
// web/src/panels/inspector/RightSidebar.tsx —— 外壳 <RightSidebar/> 插槽里的唯一组件
export function RightSidebar(): JSX.Element;              // Tabs：属性 / 对话 / 监控；值 = ui.layout.rsTab；没有收起按钮（U.09.02-R6）

export function PropsPage(): JSX.Element;                 // 按选中分派到下面几种
type NodePropsProps = { nodeId: Ulid; focus: InspectFocus | null };
export function NodeProps(p: NodePropsProps): JSX.Element;
type ParamRowProps = { nodeId: Ulid; name: string; def: ParamDef; value: unknown; bound: BoundInfo | null;
                       touchedBy: Origin | null; locked: boolean; diags: readonly Diag[]; block: EditBlock; autoFocus?: boolean };
export function ParamRow(p: ParamRowProps): JSX.Element;
export function MultiProps(p: { nodeIds: readonly Ulid[] }): JSX.Element;
export function EdgeProps(p: { edgeId: Ulid }): JSX.Element;
export function NoteProps(p: { noteId: Ulid }): JSX.Element;
export function LayerProps(): JSX.Element;                // 没有选中：当前层名称、节点数、列表视图开关
export function ListView(): JSX.Element;                  // U.16 §4
type NodeRunDetailProps = { runId: Ulid; execKey: string; compact?: boolean };
export function NodeRunDetail(p: NodeRunDetailProps): JSX.Element;   // 也被 W.07.05 使用
type LargeEditorProps = { nodeId: Ulid; param: string; onClose(): void };
export function LargeEditor(p: LargeEditorProps): JSX.Element;
type PromptPreviewProps = { nodeId: Ulid; onClose(): void };
export function PromptPreview(p: PromptPreviewProps): JSX.Element;

type InspectFocus = 'first' | 'label' | { param: string };
type BoundInfo = { fromNodeId: Ulid; fromLabel: string; port: string };
```
```ts
// web/src/panels/inspector/paramView.ts —— 纯函数
export function paramRows(def: NodeDef, node: NodeRec, m: GraphModel): { common: ParamRowSpec[]; advanced: ParamRowSpec[] };
export type ParamRowSpec = { name: string; def: ParamDef; widget: WidgetKind; visible: boolean; bound: BoundInfo | null; locked: 'def' | 'kernel' | null };
export type WidgetKind = 'stepper' | 'slider' | 'segmented' | 'select' | 'input' | 'textarea' | 'switch' | 'picker' | 'code' | 'connection' | 'model' | 'rolecard' | 'object';
export function resolveWidget(def: ParamDef): WidgetKind;          // C.03.02 §4 表 + ParamUI.widget；表来自生成物 WIDGET_MAP（schema/builtin/widget_map.yaml）
export function evalShowIf(expr: string | undefined, params: Record<string, unknown>): boolean;   // 与 W.06.10 同一组用例（K119）
export function parseParamInput(def: ParamDef, text: string): { ok: true; value: unknown } | { ok: false; textKey: string };
```

### 4.2 本文需要、由上层新增的（`P.09` K113、K114）
```ts
// W.03.01 GraphActions 新增
promptPreview(nodeId: Ulid): Promise<PromptPreview>;   // POST /graphs/{id}/nodes/{node_id}/prompt-preview {branch}（B.04.01）
// W.03.04 RunActions 新增
blob(ref: string, o?: { maxBytes?: number }): Promise<{ text: string; truncated: boolean }>;   // GET /blobs/{ref}，带 Range，缺省最多 256KB
// W.03 §4.5 CatalogActions 新增
countTokens(text: string, model?: string): Promise<number>;   // POST /models/count-tokens（B.04.07）
```
`PromptPreview = { segments: { kind: 'rolecard' | 'instruction' | 'context' | 'tools' | 'output'; text: string; tokens: number; placeholders: { name: string; from?: { nodeId: Ulid; port: string } }[] }[] }`（`U.10.07` §3 的 ①–⑤），结构登记在 `W.04.04` §3.5。

### 4.3 依赖
`W.03` §4.2 的 hook；`W.03.01` 的选择器与 `GraphActions`；`W.03.03` 的 `selectionOf`、`UiActions`；`W.03.04` 的 `live`、`RunActions`；`W.03.06` 的 `ModelState.activity`；`W.03` §4.5 目录 store 的 `nodeDef()`、`defs`、`countTokens`；`W.05` 的 `useOps()`；`W.06.01` 的 `useCanvasEvent`；`W.07` §4.2 的 `useEditBlock`、`describeOp`、`useLocate`；`W.08` 的输入类、选择类、`Tabs`、`Badge`、`Tooltip`、`ScrollArea`、`Button`、`IconButton`、`Switch`、`EmptyState`、`Spinner`；`W.10` 的 `useT`、`fmtDuration`、`fmtCost`、`fmtTokens`、`fmtRelTime`；生成常量 `WIDGET_MAP`。

## 5. 数据结构
- 本文私有：`ParamRowSpec`、`BoundInfo`、`InspectFocus`、`WidgetKind`（§4.1）。
- 组件内部：每个参数正在编辑的文字（失焦或 Enter 才提交）、大编辑器 / 提示词预览的开关、节点执行详情各段的展开状态。

## 6. 行为

### 6.1 右侧栏容器
- 浮起的圆角卡片，与画布同级（`U.23-R4`）；顶部 `Tabs variant="underline"`：属性 · 对话 · 监控；切换 → `ui.setRs(true, tab)`（写 `hx:rs-tab`）。没有收起按钮，只有顶部条的开关（`U.09.02-R6`、`U.24` #10）。
- 三个页面各自一个 `ScrollArea`；切换标签页时保留各页的滚动位置（各页组件不卸载，用 `hidden` 隐藏）。

### 6.2 属性页按选中分派
| 选中（`selectionOf(ui, sessionId)`） | 显示 |
|---|---|
| 没有 | `LayerProps`：当前层名称（根图写"根图"）、节点数、连线数、"列表视图"开关（`ui.setListView`）；开关打开时下方是 `ListView` |
| 恰好一个节点 | `NodeProps` |
| 多个节点（可混有连线、便签） | `MultiProps` |
| 只有一条连线 | `EdgeProps` |
| 只有一个便签 | `NoteProps` |
- 不显示"没有选中节点"之类的说明文字（`U.23-R12`）。
- 选中变化时如果正在编辑某个参数，先提交它（失焦语义），再切换。

### 6.3 节点属性（`NodeProps`）
1. **头部**：类别图标（`text-2`，`U.08-R3`）· 显示名（`TextInput`，提交 `set_label`，空值恢复为类型名，最长按 `C.02.02`）· 类型名（`text-3`）· AI 角标（`modelTouched(node)`，`model-weak` 底 `model` 字）。AI 角标悬停：理由（`origin.reason`）、档位（来自那条 Op 的记录，有就显示）、"撤销"→ `ops.revertOp(origin.op_id)`，成功后 `useLocate`（`U.12` §2、`U.13.03-R3`）。
2. **状态行**（按需出现）：
   - `editingByOthers(graph, nodeId)` 有模型 → `model` 色小字"AI 也在看这个节点"；`model.activity.target.node === nodeId` 且本页正在编辑这个节点 → "AI 等你改完这个节点"（`U.12` §5、`W.03.06` §6.5）。
   - 节点 `lock`：`user` → "只有你能改"、`frozen` → "已冻结，谁都不能改"，旁边"解锁"（`dispatch(set_lock{none})`）。`frozen` 时下面所有控件只读。
   - 诊断：`diagsOf(graph, nodeId)` 逐条红字（`U.14.03` §1 节点级）。
3. **参数表单**（`paramRows`）：
   - 分组：常用（`ui.group='常用'`，与节点上相同的顺序）在前；其余按声明顺序；`advanced=true` 的折叠在"高级"里（`C.03.02` §3）。`show_if` 为假的不显示（`evalShowIf`）。
   - 每行：参数名（`ParamDef.label`，悬停 `help`；内部名只在提示框里，`U.15-R3`）+ 控件（`resolveWidget`）。
   - 接线（`ui.bind` 端口上有连线，或参数被提升且有连线）：控件换成斜纹底只读块"由上游「X」提供"，点它 → `useLocate` 选中上游节点；断开后恢复原值（`U.10.07` §2、`U.11` §2）。
   - 模型改过的参数（这个参数最后一次 `set_param` 的操作者是模型：`origin.actor.kind='model'` 且 `origin.op_id` 对应的 Op 改了这个键；不能确定是哪个参数时只在头部显示角标）：行左侧 2px 模型色竖线，悬停同 AI 角标（`U.12` §2）。
   - 锁（`ParamDef.lock`）：`def` → 只读 + 锁图标，提示"由节点类型定义"；`kernel` → 只读 + 锁图标，提示"由内核规则 {规则编号} 固定"（`U.11` §1、`C.03.03`）。
   - `secret: true`：输入框只接受密钥名，不显示值以外的任何东西；粘贴看起来像密钥值的内容（以 `sk-`、`AIza` 开头，或长度 > 40 且无空格）→ 行内红字"这里只填密钥名，密钥请在「连接」里保存"，不提交（`C.03.02-R3`、`W-R10`）。
4. **提交**：
   | 控件 | 何时提交 | Op |
   |---|---|---|
   | 单行、代码 | Enter 或失焦；值没变不提交；Esc 恢复 | `set_param` |
   | 多行 | 失焦（Esc 也是失焦）；提示词节点的文本编辑中变量集合变了时下方显示"失焦后更新变量端口"（`U.10.07-R3`） | `set_param` |
   | 数字步进、滑块 | 拖动 / 连续步进用 `ops.gesture('step' / 'slide', revert)`：`onStart` 建手势、`onChange` → `update`、`onEnd` → `end`；单击步进一次直接 `dispatch` | `set_param` |
   | 开关、分段、下拉、选择器 | 选中即提交 | `set_param` |
   | 对象（`object`） | 按 `schema` 生成子表单，任一子字段提交时整个对象一次 `set_param` | `set_param` |
   - 提交前 `ops.check(op, scope)`：不通过 → 行内红字 `t(textKey)`，不提交（`W.05` §4.1）。`dispatch` 结果 `rejected` 的提示由 `W.05` 负责；本文只恢复控件显示的值。
   - 聚焦任一参数控件 → `ops.setEditing(scope, [nodeId])`；失焦且焦点离开本节点的所有控件 → `setEditing(scope, [])`（`W.05` §6.10）。
5. **本次运行**（当前运行里有这个节点的执行时显示，`run.live.execsOf(nodeId)`；订阅 `tick`）：最新一次的状态、用时、尝试次数；多次执行（循环、扇出）时一个下拉选第几次；下方 `NodeRunDetail`（折叠，点开才加载）。按钮："从这里重跑"（确认后 `run.fork({nodeId, scopes})`，`U.19.05` 第 4 步）、"在监控页查看"（`ui.setRs(true, 'mon')`，并把这次执行交给监控页定位）。
6. **聚焦**（`inspect` 事件，`W.06` §4.2）：`ui.setRs(true, 'insp')`；`focus='label'` → 显示名输入框选中全部文字；`'first'` → 第一个可编辑参数；`{param}` → 那个参数（在"高级"里时先展开）。读屏播报"属性：{类型} {名称}"。

### 6.4 多选、连线、便签、当前层
- `MultiProps`：标题"已选中 N 个节点"（含连线、便签时另计）；按钮（与右键菜单同一套动作，`cmd.exec`）：打包为子图（`group`）、整理布局（`layout.tidy`）、删除（`sel.delete`）；对齐（左 / 右 / 顶 / 水平居中 / 等距）用一次 `move_nodes` 提交（`U.13.05` §1"多选"）。下面列出选中的节点（点一个 → 只选中它）。
- `EdgeProps`："{源节点}.{端口} → {目标节点}.{端口}"、数据类型（显示数据类型名，不是显示类别，`U.03.03-R4`）、`multi`、模型改过时 AI 角标；按钮：删除（`dispatch(disconnect)`）、插入节点（`cmd.exec('node.quickAdd')` 带 `target: {kind:'edge', id}`）。
- `NoteProps`：便签文字（`TextArea`，失焦 `update_note`）、标记色（`ui.color` 的 6 种，`U.03.01`）。
- `LayerProps`：见 §6.2；子图层另显示"进 / 出"连接数（`boundaryLinks` 的条数）。

### 6.5 大编辑器（`param.editLarge`，`U.10.07-R1`）
- 在属性页里展开为占满页面高度的编辑区（不另开窗口）：多行编辑框（等宽字体按参数 `code` 与否）；`{{变量}}` 以 `model` 弱色底高亮（覆盖层渲染，文本框本身不改）；底部一行：字数 · 约 N tokens（`catalog.countTokens(text, 当前会话的编排者模型)`，输入停止 500ms 后请求一次，失败时只显示字数）。
- 示例值预览：变量对应的上游端口在当前运行里有输出时，悬停变量显示那个输出的前 200 字（`run.nodeDetail` + `blob`），没有时显示"运行后可以看到示例值"。
- 历史版本：从操作历史（`graph.history`，`W.03.01`）里筛出这个节点这个参数的 `set_param`，列出时间、操作者、前 40 字；点一条 → 预览；"恢复这一版" → `dispatch(set_param)`。
- 提交：点"完成"或失焦提交（同 §6.3 第 4 步）；Esc 关闭（先提交）。

### 6.6 预览最终提示词（`prompt.preview`，`U.10.07` §3）
- 属性页里展开为一个只读区：按 ① 角色卡 ② 指令 ③ 上下文 ④ 可用工具 ⑤ 输出格式分段（`graph.promptPreview(nodeId)`），每段标题后 `text-3` 写"约 N tokens"；变量占位显示为"‹公司 ← 「报价表」运行时的输出›"（占位用 `model` 弱色底），点占位 → `useLocate` 选中来源节点。
- 节点参数有改动后（`graph.change` 涉及这个节点）显示"内容已过期 · 刷新"，不自动重拉。

### 6.7 节点执行详情（`NodeRunDetail`，`B.04.03` §5）
- 挂载时 `run.nodeDetail(execKey)`（store 有 20 条缓存）。分段折叠显示：输入 · 输出 · 上下文包 · 提示词 · 模型调用（每次：模型、用量、费用、用时、是否回退）· 工具调用（名称、风险等级、结果摘要）· 错误（`class`、`code`、`message`、可重试与否）· 费用合计。
- 大内容只给了引用（`ctx_ref`、`prompt_ref`、输入输出里的 `WsRef`）：段落标题旁"展开"，点了才 `run.blob(ref)`；超过 256KB 的显示前 256KB 和"内容很长，已截断 · 下载完整内容"（`client.download` 经 run store 的同一 action 带 `maxBytes: Infinity` 时改为下载）。
- 文本内容用等宽字体、保留换行，只作为文本节点渲染（`W.07-R3`）；JSON 内容缩进显示。
- `compact`（监控页里用）：只显示错误、输出摘要和"在属性页打开"。

### 6.8 列表视图（`U.16` §4、`W.06.09` K105）
- 当前层的所有节点、连线一张表（`role="grid"`）：节点行（名称、类型、状态、N 个输入 / M 个输出）、连线行（"{源}.{端口} 连到 {目标}.{端口}"，与 `U.16` §3 读屏名称一致）。
- 键盘完整操作：方向键在单元格间移动；节点行 Enter → 打开它的属性（选中它）、`F2` 改名、`Delete` 删除；连线行 `Delete` 删除；表头上方三个按钮："添加节点"（`cmd.exec('node.quickAdd')`，快速添加面板在可见区域中心打开）、"新建连线"（一行表单：源节点、输出端口、目标节点、输入端口四个 `Select`；目标端口选项按 `ops.canConnect` 过滤并在不可用项上写原因；提交 `dispatch(connect)`）。
- 画布只读时表格只读（同 §6.3 的规则）。

### 6.9 只读与断开
`useEditBlock()` 不为 null，或 `stores.readonly`，或节点 `frozen`：全部控件 `disabled`，每个控件的提示框写原因（`U.11` §1）；页面顶部不额外放横幅（离线横幅已在顶部，`U.14-R3`）。

## 7. 不变量
- 参数界面完全由 NodeDef 声明生成，没有按节点类型写死的表单（`C.03.05` §6、`U.11-R2`）。
- 选中变化不会打开右侧栏（`U.09.02-R1`）；只有 `inspect`、`I`、`param.editLarge`、`prompt.preview`、按钮点击会打开它。
- 属性页显示的参数值任何时候都等于 graph store 里的值（正在编辑的那一格除外）。
- 密钥值不会出现在属性页的任何输入框、提示框或日志里（INV-22）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `nodeDef(type)` 加载中 / 失败 | 显示头部和"正在加载节点类型…"；失败时"这个节点类型不可用"（与画布上的占位一致，`W.06` §8） |
| 预检不通过 | 行内红字（字段级），不提交 |
| `dispatch` 被拒绝 | `W.05` 提示；控件回到 store 里的值 |
| `nodeDetail` / `blob` 失败 | 该段落"没能加载 · 重试" |
| `promptPreview` 失败 | 预览区"没能生成预览 · 重试"，附服务端说明 |
| `countTokens` 失败 | 只显示字数 |
| 节点在编辑中被删除 | 关闭表单，属性页回到 `LayerProps`；不提示（画布已经看得到） |

## 9. 性能与资源
- 单节点属性页首次渲染（20 个参数）≤ 16ms；参数控件每个是 `memo` 组件，graph `change` 只重渲染值变了的行。
- 本次运行区只订阅 `tick`（≥ 400ms 一次）。
- `NodeRunDetail` 的大内容按需加载，单段最多 256KB 进内存。

## 10. 验收标准
1. 选中 Agent 节点按 `I`：属性页显示角色卡、指令、输出类型（常用）和"高级"折叠；改"超时"为 120 → 画布节点上和服务端都是 120，操作历史 1 条。
2. 把提示词节点的输出接到 Agent 的"指令"：属性页"指令"变为"由上游「提示词」提供"、只读；断开后恢复原来的文字（`U.10.07` §2）。
3. 拖动数字步进 3 秒：服务端只收到 ≤ 13 次 `set_param`，撤销一次回到原值（`U.11` §2）。
4. 模型改过的参数左侧有模型色竖线；悬停点"撤销"后值恢复，画布定位到这个节点。
5. 双击节点上的多行文本：属性页展开大编辑器，显示字数和约多少 tokens，变量高亮；点指令框的眼睛按钮显示 ①–⑤ 分段预览。
6. 失败节点的"本次运行"显示错误；展开"上下文包"后才发出 `GET /blobs/{ref}`。
7. 打开列表视图，只用键盘完成：新建一条连线、删除一个节点（`U.16` §4）。
8. 断开服务 3 秒以上：所有控件置灰、提示框写"已断开，恢复后可以编辑"；恢复后可以编辑（`U.14.05`）。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/inspector/RightSidebar.tsx`、`PropsPage.tsx`、`NodeProps.tsx`、`ParamRow.tsx`、`MultiProps.tsx`、`EdgeProps.tsx`、`NoteProps.tsx`、`LayerProps.tsx`、`ListView.tsx`、`NodeRunDetail.tsx`、`LargeEditor.tsx`、`PromptPreview.tsx`，每个同名 `.css`、`.test.tsx`；`web/src/panels/inspector/paramView.ts`、`paramView.test.ts`；`schema/examples/show_if_vectors.json`（`evalShowIf` 的共用用例，K119；本叶子唯一允许新建的 `schema/` 文件）；`web/tests/e2e/inspector.spec.ts`。
- 不许碰的文件：`web/src/canvas/`（`W.06.10` 的 `evalShowIf` 不改实现，只改为读同一份用例文件，由 `W.06.10` 的实施者做）、`web/src/state/`（新增的 action 由 `W.03` 实现）、`web/src/ops/`、其他 `panels/` 目录、`design/tokens.css`。
- 函数签名：见 §4。
- 测试用例：
  - `W0703-T1 控件映射`：`C.03.02` §4 每一行一条（与 `C0302-T1`…`T10` 同输入）；`ui.widget='connection'` → `connection`
  - `W0703-T2 show_if`：读 `show_if_vectors.json` 全部通过（与 `W0610-T8` 同一份）
  - `W0703-T3 分组排序`：常用按 `ui.order`，高级折叠，`show_if` 为假不出现
  - `W0703-T4 接线`：`bind` 端口有连线 → 只读块 + 上游名；点它 → `useLocate`
  - `W0703-T5 提交`：单行 Enter 提交 1 次、值没变不提交、Esc 恢复；多行失焦提交
  - `W0703-T6 手势`：步进拖动 → `gesture('step')` 的 `update` 多次、`end` 1 次；单击 → `dispatch` 1 次
  - `W0703-T7 预检`：`check` 返回 `param_locked` → 行内红字，不 `dispatch`
  - `W0703-T8 锁`：`def` / `kernel` 只读且提示框文案不同；节点 `frozen` → 全部只读 + "解锁"
  - `W0703-T9 secret`：粘贴 `sk-abc…` → 红字、不提交
  - `W0703-T10 模型改过`：`origin.actor.kind='model'` → 竖线；"撤销"→ `revertOp(origin.op_id)`
  - `W0703-T11 presence`：聚焦 → `setEditing(scope,[id])`；焦点离开节点 → `setEditing(scope,[])`
  - `W0703-T12 AI 等你`：`activity.target.node = id` 且正在编辑 → 提示出现
  - `W0703-T13 inspect 聚焦`：`{param:'timeout'}`（在高级里）→ 高级展开、该输入获得焦点；`'label'` → 显示名全选
  - `W0703-T14 本次运行`：`execsOf` 3 次 → 下拉 3 项；"从这里重跑"确认后 `fork`
  - `W0703-T15 按需加载`：展开前没有 `blob` 调用；展开后 1 次；300KB 内容 → 截断提示
  - `W0703-T16 大编辑器`：输入停止 500ms → `countTokens` 1 次；失败 → 只显示字数；历史版本列出 3 条，"恢复这一版"→ `dispatch(set_param)`
  - `W0703-T17 提示词预览`：5 段、每段 tokens；参数改动后显示"已过期"
  - `W0703-T18 列表视图`：键盘新建连线：选项按 `canConnect` 过滤；`Delete` 删除节点 → `dispatch(remove_nodes)`
  - `W0703-T19 只读`：`net='down'` → 所有控件 `disabled` 且提示框有原因
  - `W0703-T20 选中不开右栏`：选中节点后 `rsOpen` 不变
  - `W0703-T21 端到端`：§10 验收 1、2、3、6（Playwright，`--fake-llm`）
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R2、R6、R20）；另：不为某个节点类型手写表单；不在选中变化时打开右栏；不把密钥值放进任何状态；不一次性加载节点执行详情的全部大内容；不用 `dangerouslySetInnerHTML` 显示节点输出。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 8 棒；`P.09` K113、K114、K119 |
