# W.07.07 底部对话框

| 项 | 内容 |
|---|---|
| 编号 | W.07.07 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5（v0.5.11）`36_composer.js`、`21_flow.css`（思考强度）、`23_tab.css`（输入框上的小尾巴）；`U.09.06`、`U.12` §2、§5、`U.14.01-R4`、`U.14.04` §3；`C.10` §3–§5；`P.09` K113、K115 |
| 最后修改 | 2026-11-23 |

## 1. 职责
画布底部居中的对话框：输入与发送（Enter / Ctrl+Enter、输入法组字、草稿保存）、自动附带画布选中、`+` 附件与上传、`@` 引用（节点、文件、其他会话、技能）、`/` 命令、上下文用量环与构成、编排者模型与思考强度、对话框上方的状态行、急停中的提示；以及给别处的"预填对话框"入口。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 对话框的位置、宽度、距底、玻璃层级 | `W.02.02` §6.2 |
| 浮动回复与回复标签（对话框右上角的小尾巴） | `W.07.08`（本文在框的右上角摆它的 `FloatReplyTail`） |
| 提议栏 | `W.07.09` |
| 消息的发送请求、上传、上下文估算、压缩 | `W.03.05` 的 action（本文只调用） |
| 对话历史 | `W.07.04` |
| 回复的生成、自动压缩较早的对话 | `B.06.02` |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`；`W.02.04` §4.1（`composer.send`、`composer.newline`、`composer.editLast`、`composer.blur`）、§6.1–§6.2（第 ④ 层、输入法组字）；`W.03` §6.4（`hx:draft:<会话 ID>`）；`W.03.03`（`selectionOf`、`attachable`）；`W.03.05` §4.1（`send`、`setOrchestratorModel`、`setEffort`、`effortFor`）、§6.2、§8（发送失败保留文字）；`W.06.11` §2（`/整理布局` 调 `cmd.tidy()`）；`C.10` §5（`Selection`）、`C.10-R4`、`R5`、`R6`；`C.16`（模型的 `effort` 字段）；`U.09-R2`；`U.09.04` §2（草稿随会话）、R8（新会话聚焦）；`U.09.06`（全部，R1–R8）；`U.12` §2（模型标签）、§5（状态行）；`U.13.04` §4、R6；`U.13.05-R3`（"让 AI …"预填）；`U.14.01-R4`；`U.14.04` §3；`U.23-R2`；`U.24` #17；`P.09` K113、K115。

## 4. 接口

### 4.1 组件
```tsx
// web/src/panels/composer/Composer.tsx —— FloatLayer 里底部居中
export function Composer(): JSX.Element;

type ComposerInputProps = { sessionId: Ulid; value: string; onChange(v: string): void; onSend(): void; inputRef: RefObject<HTMLTextAreaElement> };
export function ComposerInput(p: ComposerInputProps): JSX.Element;
type RefChipsProps = { refs: readonly DraftRef[]; onRemove(i: number): void; onRetry(i: number): void };
export function RefChips(p: RefChipsProps): JSX.Element;
export function AttachMenu(p: { anchor: HTMLElement; onPick(r: DraftRef | 'upload'): void; onClose(): void }): JSX.Element;
export function SlashMenu(p: { query: string; onPick(cmd: SlashCommand): void; onClose(): void }): JSX.Element;
export function MentionMenu(p: { query: string; onPick(r: DraftRef): void; onClose(): void }): JSX.Element;
export function ContextRing(p: { usage: ContextUsage | null; onOpen(): void }): JSX.Element;
export function ContextPopover(p: { anchor: HTMLElement; usage: ContextUsage; onCompact(): void; onClose(): void }): JSX.Element;
export function ModelButton(): JSX.Element;
type ModelPickerProps = { anchor: HTMLElement; onClose(): void };
export function ModelPicker(p: ModelPickerProps): JSX.Element;        // 也被 W.07.01 的模型胶囊打开
export function EffortSegment(p: { model: Model; value: Effort; onChange(e: Effort): void }): JSX.Element;
export function SendButton(p: { enabled: boolean; onSend(): void }): JSX.Element;
```
```ts
// web/src/panels/composer/slash.ts
export type SlashCommand = { id: 'run' | 'explain' | 'optimize' | 'approval' | 'tidy' | 'model' | 'skill' | 'template' | 'compact' | 'clear' | 'settings';
  label: string; desc: string; icon: string };                       // label、desc 是文案键（comp.slash.<id>）
export const SLASH_COMMANDS: readonly SlashCommand[];                // U.09.06 §2 的顺序
export function matchSlash(text: string): { query: string } | null;   // 整个输入是 /xxx（不含空格）时
export function matchMention(text: string, caret: number): { query: string; start: number } | null;   // 光标前的 @xxx

// web/src/panels/composer/draft.ts
export type DraftRef =
  | { kind: 'node'; id: Ulid; label: string; scope: Scope }
  | { kind: 'session'; id: Ulid; label: string }
  | { kind: 'skill'; id: string; label: string }
  | { kind: 'file'; ref?: string; label: string; size?: number; state: 'uploading' | 'ready' | 'failed'; file?: File; path?: string };
export function loadDraft(sid: Ulid, storage?: Storage): string;
export function saveDraft(sid: Ulid, text: string, storage?: Storage): void;   // 空串删除键
export function buildSelection(sel: CanvasSelection | null, graph: { id: Ulid; version: number } | null, scope: Scope, runId?: Ulid): { selection: Selection | undefined; truncatedFrom?: number };
export function toMessageRefs(refs: readonly DraftRef[]): MessageRef[];      // 只取 ready 的；node / session / skill / file
```

### 4.2 本文需要、由上层新增的（`P.09` K113–K115）
```ts
// C.10 Message 新增 refs（C.10-R7）：用户消息可以带最多 20 个引用
// MessageRef = { kind: 'node', graph_id, scope, node_id } | { kind: 'file', ref?: WsRef, path?: string } | { kind: 'session', session_id } | { kind: 'skill', package_id }
// W.03.05 SessionActions 变化与新增（接口在 B.04.09）
send(sid: Ulid, content: string, o?: { selection?: Selection; refs?: readonly MessageRef[] }): Promise<void>;   // 原 selection 参数并入 o
upload(sid: Ulid, file: File, onProgress?: (p: number) => void): Promise<{ ref: string; name: string; size: number }>;   // POST /sessions/{sid}/uploads
listFiles(sid: Ulid, q: string): Promise<readonly { path: string; name: string; size: number; source: 'session' | 'allowed' }[]>;   // GET /sessions/{sid}/files?q=
contextUsage(sid: Ulid, draft: { chars: number; selection: number; refs: readonly MessageRef[] }): Promise<ContextUsage>;   // GET /sessions/{sid}/context
compact(sid: Ulid): Promise<void>;                                   // POST /sessions/{sid}/compact
clearMessages(sid: Ulid): Promise<void>;                             // POST /sessions/{sid}/messages/clear
// W.03 §4.5 CatalogActions 新增
loadSkills(): Promise<void>;  CatalogState.skills: readonly { packageId: string; name: string; desc?: string; enabled: boolean }[];   // GET /packages?kind=skill（C.15 §5）
// W.03.03 UiState.composerPrefill、UiActions.prefillComposer（W.07.02 §4.2 已列）
```
`ContextUsage = { window: number; used: number; parts: { kind: 'system' | 'graph' | 'history' | 'selection' | 'refs' | 'draft'; tokens: number }[]; auto_compact_at: number }`；`Model` 前端读取的字段加 `effort`（`C.16`）。都登记在 `W.04.04` §3.5。

### 4.3 设置项（`P.09` K115）
用 `settingOf(catalog.settings, path, 缺省)`（`W.03` §4.5）读：`general.send_key`（`'enter'` | `'mod'`，缺省 `'enter'`，`U.09.06-R3`）、`models.orchestrator`（编排者默认模型；空时用 `models.default`）、`models.default_effort`（缺省 `'medium'`，`U.09.06-R6`）。字段名已在 `W.09.02` §5.2 定稿并登记 `G.11` §3（`P.09` K142；原暂定名 `models.default_model` 改为 `models.orchestrator`）。

### 4.4 依赖
`W.03` §4.2 的 hook；`W.03.03` 的 `selectionOf`、`attachable`、`composerPrefill`；`W.03.05` 的 `SessionActions`、`effortFor`、`sessionMeta`、`lastAssistant`；`W.03.01` 的 `nodesIn`、`crumbs`（`@` 节点的路径）；`W.03` §4.5 目录 store 的 `models`、`skills`、`settings`；`W.03.04` 的 `RunActions.start`、`currentId`；`W.06.01` 的 `useCanvasCommands`（`tidy`）；`W.07` §4.2 的 `useShortcut`、`useEditBlock`；`W.07.04` 的 `ChatStatusLine`；`W.07.08` 的 `FloatReplyTail`、`useFloatReply`；`W.08` 的 `TextArea`、`Picker`、`Popover`、`Segmented`、`IconButton`、`Button`、`Badge`、`Dialog`、`Tooltip`、`Icon`、`Overlay`；`W.02.04` 的 `keys.pushOverlay`；`W.10` 的 `useT`、`fmtTokens`。

## 5. 数据结构
- 本文私有：`DraftRef`、`SlashCommand`（§4.1）。
- 组件内部：输入文字、`refs: DraftRef[]`（不持久化）、`excludeSelection: boolean`（用户点了附带标签上的 ×，只对这一次发送有效）、当前弹层（`attach` / `slash` / `mention` / `context` / `model` / null）、上下文估算结果。
- localStorage：`hx:draft:<会话 ID>`（只存文字，不存引用和附件，`W.03` §6.4）。

## 6. 行为

### 6.1 结构（`U.09.06` §1）
```
┌ 状态行（有活动时）：● AI 正在思考… / 正在读取图          [回复标签 ▴ 在右上角边框上，W.07.08]
├ 引用标签行（有引用时）：[▣ 验收者 ×] [📄 竞品价格表.xlsx ×] …
├ 输入框（1–8 行自适应）：让 AI 搭图、改图或运行……   / 命令 · @ 引用
└ [+] [附带 1 个节点 ×]                          ◔ 5%   ✦ 模型名 · 中 ▾   (↑)
```
- 不放常驻快捷指令和说明文字（`U.09.06-R1`、`U.23-R5`）；占位文字是唯一的提示。
- 控件不加边框；整个对话框是玻璃材质、`r-xl`、`shadow-float`（`U.09.01` ④、`U.23-R6`）。

- 根元素带 `data-tour="composer"`：画布导览只读取它的位置（`W.09.03` §6.7，`P.09` K147），不改它。

### 6.2 输入与发送（`U.09.06-R3`、`U.13.04` §4、R6）
- 快捷键（`useShortcut`，`composer` 层只在焦点在输入框里时生效，`W.02.04` §6.1 ④）：
  | id | 键 | 处理 |
  |---|---|---|
  | `composer.send` | `send_key='enter'` 时 `Enter`；`'mod'` 时 `Mod+Enter` | §6.2 发送 |
  | `composer.newline` | `Shift+Enter`；`send_key='mod'` 时 `Enter` 也换行 | 插入换行（返回 false 交给浏览器默认行为） |
  | `composer.editLast` | `↑`（输入框为空时） | 把本会话最后一条用户消息的文字放进输入框，光标在末尾（只是取回文字再编辑，不改历史，`P.09` K113） |
  | `composer.blur` | `Esc` | 有弹层时先关弹层（弹层在 ② 层）；浮动回复展开时先调 `useFloatReply().collapse()`，返回 true 就到此为止（`W.07.08` §6.2）；否则输入框失焦，焦点回到 `document.body`（画布快捷键随即可用，`W.06.09` §6.1） |
- 输入法组字中不发送（`W.02.04` §6.2 第 1 步已拦）。
- 草稿：输入变化 500ms 后 `saveDraft(sid, text)`；切换会话时先保存当前的，再 `loadDraft` 新会话的（`U.09.04` §2）。
- 发送（`text.trim()` 非空，且没有上传中的附件——有则按钮置灰、提示框"附件还在上传"）：
  1. 整段是 `/命令`（`matchSlash`）→ 按 §6.5 执行，不发给编排者。
  2. 组 `Selection`：`excludeSelection` 为假时 `buildSelection(attachable(selectionOf(ui, sid)), {id: graphId, version: graph.serverVersion}, scope, run.currentId 在监控页被点开时)`；没有选中也带 `scope`（`C.10-R4`）。截断时内容前加 `t('comp.truncated', {n})`（"（已选中 N 个节点，只附带前 50 个）"，`C.10-R5`）。
  3. `session.send(sid, content, {selection, refs: toMessageRefs(refs)})`；发送中按钮显示旋转弧、输入框只读。
  4. 成功 → 清空输入、引用、`excludeSelection`，`saveDraft(sid, '')`。失败 → 保留全部内容（`W.03.05` §8）：409（已有回复在生成）"上一条回复还没结束"；其他按服务端说明提示。
- 发送键（`SendButton`）：圆形箭头；没有文字时灰色不可用，有文字时实心主色（`U.23-R2`，全界面三处实心之一）。
- 断开（`ui.net ≠ 'online'`）：可以输入，发送键置灰，提示框"已断开，恢复后可以发送"。
- 急停中（`session.estop.global`）：输入框上方 `wait` 弱色一行"急停中，AI 只能回答问题，不能修改图和运行"（`U.14.04` §3）；照常可以发送。

### 6.3 附带选中（`U.09.06` §2）
- 画布有选中时，底部一行出现小标"附带 N 个节点"（含连线时"附带 N 个节点、M 条连线"）；没有选中时什么都不显示。
- 小标上的 × → 这一次不附带（`excludeSelection = true`）；选中变化时重置为附带。
- 悬停小标：列出前 5 个节点名和所在层。

### 6.4 `+` 附件与 `@` 引用（`U.09.06` §2）
- `+`（提示框"附件与引用 · @"）→ `AttachMenu`（`Picker`，锚在按钮上方）：
  - 添加：上传文件…（隐藏的 `<input type=file multiple>`；每个文件一个 `file` 引用标签，`state='uploading'` 带进度，`session.upload` 完成后 `ready`，失败 `failed` 可重试）· 附带画布上选中的节点（没有选中时置灰"先在画布上选中节点"；有选中时把它们作为 `node` 引用加入，与自动附带的选中不重复）。
  - 下面是与 `@` 相同的四组（`MentionMenu` 的内容）。
- 输入里光标前出现 `@xxx`（`matchMention`）→ `MentionMenu`（`Picker`，锚在对话框上方，宽 360）：
  | 组 | 来源 | 选中后 |
  |---|---|---|
  | 当前图里的节点 | `model` 里所有层的节点，按名称匹配，最多 8 个；每项第二行是层路径 | `node` 引用 |
  | 文件（允许目录） | `session.listFiles(sid, q)`（200ms 防抖） | `file` 引用（`path`，不上传） |
  | 其他会话 | 会话列表（不含当前），最多 5 个 | `session` 引用 |
  | 技能 | `catalog.skills` 里启用的 | `skill` 引用 |
  - 选中一项：删掉输入里的 `@xxx`，加一个引用标签，焦点回到输入框。
- 弹层打开期间按键：用 `keys.pushOverlay('popover', h)` 接管 `↑` `↓` `Enter` `Tab` `Esc`（`W.02.04` §6.1 ②，在 ④ `composer` 之前），其他键照常输入。
- 上限：引用最多 20 个（`C.10-R7`）；单个上传文件 ≤ 20MB（超过时标签直接 `failed`，提示"文件太大，最多 20MB"）。

### 6.5 `/` 命令（`U.09.06` §2）
输入框里只有 `/xxx` 时打开 `SlashMenu`（按 `matchSlash` 的 `query` 过滤名称和说明）：
| 命令 | 动作 |
|---|---|
| 运行 | 清空输入，`run.start()` |
| 解释 / 优化 / 加审批 | 把输入换成对应的一句话（`comp.slash.say.<id>`，如"解释一下选中的节点在做什么"），光标在末尾，等用户确认后发送 |
| 整理布局 | 清空输入，`cmd.tidy()`（`W.06.11` §2：不发给编排者） |
| 模型 | 清空输入，打开 `ModelPicker` |
| 技能 | 输入换成 `@`，打开 `MentionMenu` 并只显示技能组 |
| 模板 | 清空输入，`ui.openCenter('library', 'templates')` |
| 压缩 | 清空输入，`session.compact(sid)`；成功后对话里出现系统消息"已压缩较早的对话"（由会话流带来） |
| 清空 | 确认框"清空这个会话的对话记录？图和运行记录不受影响，清空后不能恢复"→ `session.clearMessages(sid)` |
| 设置 | 清空输入，`ui.openCenter('settings')` |
- 菜单底部一行 `text-3`："↑ ↓ 选择 · ↵ 执行 · Esc 关闭"（按键文字用 `Kbd`）。

### 6.6 上下文用量环（`U.09.06` §2）
- 估算时机：输入停止 800ms、选中变化、引用变化、切换模型后，`session.contextUsage(sid, {chars, selection, refs})`；同一时刻只有一个请求（新的取消旧的）。
- 环：16px 圆环按 `used / window` 填充，旁边百分比（< 1% 写"<1%"）；> 80% 环变 `wait` 色（`auto_compact_at` 是服务端的自动压缩阈值，`U.09.06` §2）。
- 点开 `ContextPopover`（宽 320）：标题"上下文用量 · {used} / {window} tokens"；一条分段条 + 图例（系统提示与角色卡、当前图、对话记录、选中附带、附件与引用、正在输入），分段颜色用中性灰阶（`text-1` 以 `color-mix` 调出的 4 级）加 `model` 弱色（对话记录里 AI 的部分不区分，`U.03.03-R3` 不允许借用端口类型色）；底部"超过 80% 时自动压缩较早的对话"+ 按钮"立即压缩"→ `session.compact`。
- 估算失败：环显示"–"，提示框"暂时无法估算"。

### 6.7 编排者模型与思考强度（`U.09.06-R2`、`R5`–`R8`、`U.12` §2）
- `ModelButton`：`model-weak` 底 `model` 字："✦ {模型名} · {强度}"（不支持调节时只有模型名）；没有可用模型时 `danger` 字"没有可用模型"。
- `ModelPicker`（`Popover` 宽 380）：标题"编排者模型 · 只影响当前会话"；按提供方分组列出 `catalog.models`，每项第二行"{窗口} 上下文 · {能力} · {价格或免费}"；当前项对勾。选一个 → `session.setOrchestratorModel(sid, ref)`，提示"已切换编排者模型 · 只影响「{会话名}」"。
- 底部"思考"`EffortSegment`：只列这个模型支持的强度（`model.effort`，`U.09.06-R5`）；每一级的提示框写适用场景（`U.09.06-R8`：关闭"不思考，最快最省"、极低"几乎不思考，适合简单改写和分类"、低"简单任务"、中"日常任务（推荐）"、高"复杂调试与设计"、超高"困难、含糊的任务"、最高"质量优先，最慢最贵"）；当前值 = `effortFor(session, model, settings.models.default_effort)`，模型没有这一级时取最接近的一级（`U.09.06-R6`）；选择 → `session.setEffort(sid, model, e)`（按会话 × 模型记住，`U.09.06-R7`）。模型不支持调节 → 一行"这个模型不支持调节思考"。右侧"管理模型…"→ `ui.openCenter('connections')`（`U.15` §5）。
- 用词：每一级叫"强度"（`P.06` 不叫列、`U.24` #17）。

### 6.8 状态行（`U.14.01-R4`、`U.12` §5）
- 对话框上沿内侧，`W.07.04` 的 `ChatStatusLine`（同一组件、同一文案），只在有活动时出现；不占输入区域的高度变化之外的空间。

### 6.9 预填与自动聚焦
- `ui.composerPrefill` 的 `seq` 变化 → 输入框换成 `text`、光标在末尾、获得焦点；`attachSelection` 为真时保证附带选中（`excludeSelection=false`）。来源：右键菜单"让 AI 解释 / 优化这个节点"（`U.13.05-R3`，用户确认后才发送）、节点库搜索无结果的"让 AI 帮我做"、提议过期的"让 AI 重新生成"以外的场景（那个直接发送，`W.07.09`）。
- 当前会话没有消息且没有图（新建会话，`U.09.04-R8`）→ 进入会话时输入框获得焦点。

## 7. 不变量
- 对话框任何时候可见、可输入（`U.09-R2`；`mode='page'` 除外）。
- 发送失败时用户输入的文字、引用都不丢（`W.03.05` §8）。
- 草稿只存文字，不存附件和引用；不存任何密钥（`W-R10`）。
- `/整理布局` 不发给编排者；其余命令要么在本地执行、要么只预填文字由用户确认。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `send` 失败 | §6.2 第 4 步 |
| 上传失败 / 超过 20MB | 标签 `failed`，可重试 / 移除；发送时忽略失败的附件并提示"有 N 个附件没有上传成功" |
| `listFiles` 失败 | 文件组显示"没能列出文件" |
| `contextUsage` 失败 | §6.6 最后一条 |
| `compact` / `clearMessages` 失败 | 提示服务端说明 |
| 切换模型 / 强度失败 | store 已回退；提示一次 |
| 没有可用模型 | 模型按钮 `danger` 字；发送照常（服务端会回复"还没有可用的模型"，由 `U.14.02` 的空状态和 `W.09` 引导配置） |
| 没有当前会话（首页 `/`，`W.09.01` §6.2） | 第一次发送时先 `session.create()`、`useNav().switchSession(新 ID)`，等工作区就绪后再发送；输入的文字和附件不丢（`P.09` K148） |

## 9. 性能与资源
- 输入时每次按键只更新本组件状态；上下文估算 800ms 防抖、草稿 500ms 防抖。
- `@` 节点匹配在 500 节点的图上 ≤ 2ms（按显示名预先规范化后缓存）。
- 对话框高度变化（自适应行数、引用标签行出现）会被 `W.02.02` 量到并更新 `fitInsets`；本文不做额外通知。

## 10. 验收标准
1. 选中 1 个节点：底部出现"附带 1 个节点"；发出的请求带 `selection.node_ids` 和 `scope`；取消选中后标签消失，发出的请求仍带 `scope`（`C.10-R4`）。
2. 选中 60 个节点发送：附带 50 个，内容前有"（已选中 60 个节点，只附带前 50 个）"（`C.10-R5`）。
3. 用中文输入法输入拼音时按 Enter 选词：不发送；组字结束后 Enter 才发送（`U.13.04-R6`）。设置改为 Ctrl+Enter 后，Enter 换行。
4. 输入 `@验` 选中"验收者"：出现引用标签，发出的消息带 `refs`；上传一个文件后发送，消息带它的 `ref`。
5. 输入 `/整理布局` 回车：画布整理布局，对话里没有新消息；`/清空` 先弹确认。
6. 模型 X 设为"高"，换成 Y 再换回 X：仍是"高"；不支持调节的模型显示"这个模型不支持调节思考"（`U.09.06-R5`–`R7`）。
7. 写一半的文字切到别的会话再切回：文字还在；刷新页面后还在。
8. 发送失败（模拟 409）：文字和引用都还在，提示"上一条回复还没结束"。
9. 上下文环在输入停止约 0.8 秒后更新；超过 80% 变为警示色；点开能看到构成和"立即压缩"。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/composer/Composer.tsx`、`ComposerInput.tsx`、`RefChips.tsx`、`AttachMenu.tsx`、`SlashMenu.tsx`、`MentionMenu.tsx`、`ContextRing.tsx`、`ContextPopover.tsx`、`ModelButton.tsx`、`ModelPicker.tsx`、`EffortSegment.tsx`、`SendButton.tsx`，每个同名 `.css`、`.test.tsx`；`web/src/panels/composer/slash.ts`、`draft.ts` 及同名 `.test.ts`；`web/tests/e2e/composer.spec.ts`。
- 不许碰的文件：`web/src/state/`（新增 action 由 `W.03.05`、`W.03` §4.5 实现）、`web/src/shell/`（快捷键表在 `schema/builtin/shortcuts.yaml`，本叶子不改）、`web/src/canvas/`、其他 `panels/` 目录、`design/tokens.css`、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0707-T1 matchSlash / matchMention`：`/整理` → `{query:'整理'}`；`/整理 布局` → null；`你好 @验` 光标在末尾 → `{query:'验', start:3}`；邮箱 `a@b` → null
  - `W0707-T2 buildSelection`：没有选中 → 只有 `scope`；60 个 → 50 个 + `truncatedFrom=60`
  - `W0707-T3 发送键`：`send_key='enter'`：Enter 发送、Shift+Enter 换行；`'mod'`：Enter 换行、Mod+Enter 发送
  - `W0707-T4 组字`：`isComposing` 的 Enter 不发送（与 `W0204-T4` 联合）
  - `W0707-T5 发送成功 / 失败`：成功清空并删草稿键；409 → 保留文字和引用、提示
  - `W0707-T6 草稿`：输入后 500ms 写 `hx:draft:A`；切到 B 再回 A → 恢复；发送成功 → 键被删除
  - `W0707-T7 编辑上一条`：输入为空按 ↑ → 填入最后一条用户消息；输入不为空 ↑ 不处理
  - `W0707-T8 附带标签`：有选中显示；× 后本次不附带；选中变化后恢复
  - `W0707-T9 引用`：`@` 选节点 → `node` 引用；`toMessageRefs` 跳过 `uploading` / `failed`；第 21 个引用被拒绝
  - `W0707-T10 上传`：进度回调更新标签；25MB → 直接 `failed`；有上传中时发送置灰
  - `W0707-T11 弹层按键`：`MentionMenu` 打开时 ↓ 移动、Enter 选中且不发送消息、Esc 只关弹层
  - `W0707-T12 斜杠命令`：`/整理布局` → `cmd.tidy()` 且不 `send`；`/解释` → 输入被替换、不 `send`；`/清空` → 确认后 `clearMessages`
  - `W0707-T13 上下文环`：800ms 防抖、并发时取消旧请求；`used/window=0.85` → 警示色；失败 → "–"
  - `W0707-T14 模型与强度`：只列 `model.effort` 里的强度；`effortFor` 无记录 → 默认"中"；模型只支持 low/high、默认 medium → 取 high 或 low 中较近的（并列取较高）；选择 → `setEffort`
  - `W0707-T15 预填`：`composerPrefill.seq` 变化 → 文字替换、获得焦点
  - `W0707-T16 急停与断开`：急停 → 提示行出现、发送可用；断开 → 发送置灰
  - `W0707-T17 端到端`：§10 验收 1、4、5、7（Playwright，`--fake-llm`）
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R20、R26）；另：不在 `window` 上监听键盘；不放常驻快捷指令；不把附件内容或密钥写进 localStorage；`/整理布局` 不发给编排者；思考强度的用词按 `P.06`（每一级叫"强度"）。
- 完成标志：`G.14` 全部条件；§10 九条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 8 棒；`P.09` K113–K115 |
| 2026-11-23 | §4.3 设置项名定稿（`models.default_model` → `models.orchestrator`，用 `settingOf` 读）；§6.1 根元素加 `data-tour`；§8 补"没有当前会话时先建会话再发送" | 第 9 棒写 `W.09`；`P.09` K142、K147、K148 |
