# W.07.04 右侧栏：对话

| 项 | 内容 |
|---|---|
| 编号 | W.07.04 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.4 `27_panels.js`（对话页）；demo v0.5（v0.5.11）`36_composer.js`（消息渲染）、`13_polish.css`；`C.10` §3–§5；`B.06.02.02`、`B.06.02.03`；`U.09.04` §2、`U.12` §2–§5、`U.14.01-R4` |
| 最后修改 | 2026-11-23 |

## 1. 职责
右侧栏"对话"页：当前会话的完整对话历史；Markdown 的安全渲染（全前端唯一的 Markdown 组件，`G.06.01-R10`）；回复的流式显示、停止、失败重试；按 `kind` 渲染消息里的卡片块（图、提议、已修改、审批、运行、看这里、错误）；对话 Agent 的状态行；向上滚动加载更早的消息。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 消息的获取、`message.delta` 的按帧合并、续传 | `W.03.05` §6.2 |
| 输入和发送 | `W.07.07` |
| 对话框上方的浮动回复 | `W.07.08`（它复用本文的 `MessageView`） |
| 提议卡片、审批卡片的内容与动作 | `W.07.09`（本文按 `kind` 把块交给它们） |
| 画布上的幽灵节点、AI 光标 | `W.06.14` |
| 后端的流式写入 | `B.06.02.03` |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`；`W.03.05` §4.1（`Conversation`、`ChatStatus`、`stop`、`retry`、`loadOlder`）、§6.2、§9（每会话最多 500 条在内存）；`C.10` §3（`Message`）、§4（`MessageBlock` 七种 `kind`）、§5（`Selection`）、`C.10-R5`；`C.06.04`（会话流）；`C.01-R18`（未知枚举值不崩溃）；`B.06.02.02` §4（卡片块与画布联动）、§6（画布上的每一处 AI 修改，对话里都有卡片）；`B.06.02.03` §5（中止时末尾"（已中止）"、失败显示"重试"）；`G.06.01-R10`；`G.10` §3.3（`react-markdown` + `rehype-sanitize`）；`U.09.04` §2（对话随会话切换）；`U.10.05` §2（"看这里"）；`U.12` §2（模型标签）、§3（对话里的提议卡片）；`U.13.03-R3`（已修改卡片的撤销是 `revert_op`）；`U.14.01-R4`；`U.15`；`U.16-R5`；INV-24。

## 4. 接口

### 4.1 组件
```tsx
// web/src/panels/chat/ChatPage.tsx —— RightSidebar 在 rsTab='chat' 时渲染
export function ChatPage(): JSX.Element;

type MessageListProps = { sessionId: Ulid };
export function MessageList(p: MessageListProps): JSX.Element;
type MessageViewProps = { message: Message; variant: 'full' | 'float'; sessionId: Ulid };
export function MessageView(p: MessageViewProps): JSX.Element;       // float：只渲染正文，最多 2 行（W.07.08 用）
type MarkdownProps = { source: string; streaming?: boolean; clampLines?: number };
export function Markdown(p: MarkdownProps): JSX.Element;               // 全前端唯一的 Markdown 渲染（G.06.01-R10）
type BlockViewProps = { block: MessageBlock; message: Message; sessionId: Ulid };
export function BlockView(p: BlockViewProps): JSX.Element | null;      // 按 kind 分派；不认识的 kind 返回 null
export function GraphCard(p: { block: GraphBlock }): JSX.Element;
export function AppliedCard(p: { block: AppliedBlock }): JSX.Element;
export function RunCard(p: { block: RunBlock }): JSX.Element;
export function FocusCard(p: { block: FocusBlock }): JSX.Element;
export function ErrorCard(p: { block: ErrorBlock }): JSX.Element;
export function ChatStatusLine(p: { sessionId: Ulid }): JSX.Element | null;
```
`GraphBlock`、`AppliedBlock` 等是 `MessageBlock` 按 `kind` 收窄后的生成类型（`Extract<MessageBlock, {kind: 'applied'}>`），不另声明（`G.02.05-R2`）。

### 4.2 Markdown 的安全规则（`G.06.01-R10`）
```tsx
// web/src/panels/chat/Markdown.tsx 的配置（写死在组件里，调用方不能改）
<ReactMarkdown
  skipHtml                                   // 原始 HTML 一律不渲染
  rehypePlugins={[[rehypeSanitize, SANITIZE_SCHEMA]]}   // 默认 schema 去掉 img、iframe、style；code 只保留 language-* 类名
  urlTransform={safeUrl}                     // 只放行 http:、https:、mailto:，其余（javascript:、data:、file:、相对路径）替换为空
  components={{ a: SafeLink, img: ImageAsLink, pre: CodeBlock }}
/>
```
- `SafeLink`：`target="_blank" rel="noopener noreferrer nofollow"`；链接文字后加外链图标；悬停显示完整地址。
- `ImageAsLink`：不加载图片，渲染为链接"图片：{alt}"（本机应用不向外部地址发请求，CSP 也不允许）。
- `CodeBlock`：等宽字体、横向滚动、右上角"复制"；不做语法高亮（不引入依赖，`G.10-R3`）。
- 不使用 GFM 扩展（表格、删除线）：`remark-gfm` 不在 `G.10` 清单里；模型输出的表格按普通文本显示。需要时按 `G.10-R2` 申请。

### 4.3 依赖
`W.03` §4.2 的 hook；`W.03.05` 的 `SessionActions`、`lastAssistant`；`W.03.04` 的 `RunActions.focus`、`RunState.list`；`W.03.01` 的 `GraphActions.loadHistory`、`history`；`W.05` 的 `useOps().revertOp`；`W.02.01` 的 `useNav().switchGraph`；`W.07` §4.2 的 `useLocate`、`describeOp`；`W.07.09` 的 `ProposalCard`、`ApprovalCard`；`W.07.10` 的 `useAnnounce`；`W.08` 的 `Button`、`IconButton`、`Badge`、`Spinner`、`ScrollArea`、`Tooltip`、`Icon`；`W.10` 的 `useT`、`fmtRelTime`、`fmtAbsTime`、`fmtDuration`、`fmtCost`；依赖 `react-markdown`、`rehype-sanitize`（`G.10` §3.3）。

## 5. 数据结构
- 本文私有：`SANITIZE_SCHEMA`（`rehype-sanitize` 默认 schema 的收紧版）、`safeUrl`。
- 组件内部：`stickToBottom: boolean`（用户是否停在底部）、加载更早消息前的 `scrollHeight`（恢复滚动位置用）、流式消息的节流渲染缓存。

## 6. 行为

### 6.1 列表与滚动
- 数据：`useSessionStore(s => s.conversations.get(sid))`；`status='loading'` 超过 300ms 显示旋转弧；`status='error'` → "没能加载对话 · 重试"（`session.reloadConversation(sid)`，§8）。
- 消息按 `created_at` 升序；同一分钟内同一角色的连续消息合并头部（只第一条显示角色和时间）。
- 自动滚动：用户离底部 ≤ 48px 时视为"停在底部"，新消息和流式增长都保持在底部；否则不动，底部出现"↓ 新消息"小按钮，点它滚到底。
- 向上加载：滚动到距顶部 ≤ 120px 且 `hasOlder` → `session.loadOlder(sid)`；加载前记下 `scrollHeight`，插入后 `scrollTop += 新 scrollHeight − 旧值`，画面不跳。
- 切换会话：整页换成那个会话的对话（`U.09.04` §2）；回到一个会话时停在底部。
- 空对话：什么都不显示（`U.23-R12`；对话框始终在画布底部）。

### 6.2 一条消息（`MessageView variant="full"`）
| 角色 | 渲染 |
|---|---|
| `user` | 正文按**纯文本**显示（保留换行，不解析 Markdown——用户输入的星号、井号原样显示）；有 `selection` → 下方小标"附带 N 个节点 · 在「{层名}」"（`C.10-R5` 截断时写"附带 50 个（共 N 个）"），点它 → `useLocate({graphId, scope, nodes: node_ids})`；有 `refs`（`C.10-R7`，`P.09` K113）→ 每个引用一个小标（节点 / 文件 / 会话 / 技能图标 + 名称） |
| `assistant` | 头部"AI · {模型名}"（`model-weak` 底 `model` 字，模型名取 `actor.id` 对应的模型显示名，`U.12` §2、INV-24）+ 时间（相对时间，悬停绝对时间）；正文 `Markdown`；`blocks` 依次 `BlockView` |
| `system` | `text-3` 小字居中一行（如"已压缩较早的对话"） |
- 流式（`status='streaming'`）：正文末尾一个闪烁光标（减少动效时静态竖线）；`Markdown streaming` 时渲染节流为每 100ms 一次（`message.delta` 已按帧合并，这里再降低 Markdown 解析频率）；未闭合的代码块按已闭合处理，不让后面的文字跳格式。
- 完成（`done`）：内容以 `message.completed` 后 store 里的为准（超长内容 store 已经用 `content_ref` 取回，`W.03.05` §6.2）；中止的回复末尾已由后端加"（已中止）"（`B.06.02.03` §5）。完成时 `useAnnounce(t('chat.replied'), 'polite')`（只在对话页不可见时播报，避免和屏幕上的文字重复）。
- 失败（`failed`）：正文下方红字 `error.message`（没有就按 `error.code` 的文案），按钮"重试"→ `session.retry(sid, id)`。
- 悬停一条消息：右上角"复制"（复制正文原文到剪贴板）。

### 6.3 卡片块（`BlockView`，`C.10` §4）
| kind | 组件 | 显示 | 动作 |
|---|---|---|---|
| `graph` | `GraphCard` | 图标 + "已创建图「{标题}」"/"已打开图"（标题从 `session.graphMeta` 取，取不到写"一张图"）+ 版本 | "在画布上打开"→ `useNav().switchGraph(graph_id)`（已是当前图时按钮置灰"已在画布上"） |
| `proposal` | `W.07.09` `ProposalCard` | 见 `W.07.09` | 见 `W.07.09` |
| `applied` | `AppliedCard` | 模型色左边线；"已修改 · {summary}"；"共 N 处" | "撤销"：按 `op_ids` **倒序**逐条 `ops.revertOp(id)`，前一条完成再发下一条，任何一条失败就停下并提示原因（`U.13.03-R3`、`R5`）；全部成功后按钮变为"已撤销"。"在画布上定位"：在 `graph.history` 里找这些 Op 的 `target`（找不到时 `loadHistory()` 最多再翻 3 页），汇总出层和节点 → `useLocate({graphId, scope, nodes, look:'look'})` |
| `approval` | `W.07.09` `ApprovalCard` | 见 `W.07.09` | 见 `W.07.09` |
| `run` | `RunCard` | 状态徽标（`run.list` 里有这次运行时用它的最新状态，否则用块里的 `status`）· 用时 · 费用 | 点卡片 → `run.focus(run_id)` + `ui.setRs(true, 'mon')`（`C.10` §4） |
| `focus` | `FocusCard` | 图标"看这里"+ 层路径（`crumbs` 的显示名，用 " / " 连接）+ 节点数 | 点卡片 → `useLocate({graphId, scope, nodes: node_ids, look:'look'})`：画布进入对应层，目标节点外环闪两次、其余变淡 2 秒（`U.10.05` §2） |
| `error` | `ErrorCard` | `danger` 弱色底；`message`；`code` 只在"详情"里（`U.15-R2`） | — |
| 其他 | — | 不渲染；`console.debug` 一次（`C.01-R18`） | — |
- 卡片是浮起的小卡（`bg-2`，无边框，`U.23-R5`）；动作按钮用 `ghost` / `model` 变体，不用实心主色（`U.23-R2`）。
- 卡片指向的图不是当前图时，"定位""看这里"先切换图（`useLocate` 第 2 步）。

### 6.4 状态行（`ChatStatusLine`，`U.14.01-R4`、`U.12` §5）
- 在对话页底部（固定，不随列表滚动）。按 `conversation.chat`：
  | `state` | 显示 |
  |---|---|
  | `thinking` | 模型色呼吸点 + "AI 正在思考…" |
  | `tool` / `editing` | 呼吸点 + `note`（如"正在读取图""正在添加节点"），没有 `note` 时"AI 正在编辑…" |
  | `waiting` | "排队中"（同一会话已有一条回复在生成，`B.04.09` §5） |
  | `idle` / `stopped` | 不显示 |
- 有 `status='streaming'` 的助手消息时状态行右侧"停止"按钮 → `session.stop(sid, mid)`；结果以事件为准。
- 急停中（`session.estop.global`）：状态行显示"急停中，AI 只能回答问题，不能修改图和运行"（`U.14.04` §3），`wait` 色。

## 7. 不变量
- 用户和模型写的文字都不会作为 HTML 进入 DOM：用户消息是文本节点；助手消息只经 `Markdown`（`skipHtml` + `rehype-sanitize`）（`G.06.01-R10`）。
- 不认识的卡片块不会让对话页崩溃（`C.01-R18`）。
- 已修改卡片的"撤销"只走 `revertOp`，不走 `undo`（模型的修改不在用户的撤销栈里，`U.13.03-R2`）。
- 同一条消息只出现一次（按 `id`，由 store 保证）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 对话首页拉取失败 | 列表位置"没能加载对话 · 重试"→ 工作区重新 `openConversation`（`SessionIngest` 不对面板开放，重试按钮调 `session.actions.reloadConversation(sid)`，`P.09` K114 新增，内部即 `openConversation`） |
| `loadOlder` 失败 | 顶部一行"没能加载更早的消息 · 重试" |
| `retry` / `stop` 失败 | 提示一次（409：已有回复在生成 → "上一条回复还没结束"） |
| 撤销某条失败 | 停下，提示服务端原因（例如"该节点已被删除"），已撤销的保持撤销 |
| "定位"找不到 Op 或节点 | 提示"那处修改已经不在了" |
| Markdown 渲染抛错 | 该条消息改为纯文本显示，`console.error` |

## 9. 性能与资源
- 消息 > 200 条时窗口化（`W.07` §9）；每条消息是 `memo` 组件，只有流式那一条在增长时重渲染。
- 流式 Markdown 每 100ms 最多解析一次；20000 字的消息单次渲染 ≤ 30ms。
- 对话页不可见（`rsTab ≠ 'chat'`）时组件保留但不订阅消息内容变化（选择器返回 `null`），避免后台渲染。

## 10. 验收标准
1. 一条带 `<script>`、`<img src=x onerror=…>`、`[点我](javascript:alert(1))` 的回复：页面里没有 `script`、`img` 元素，链接没有 `href`（XSS 用例集）。
2. 回复流式输出时停在底部的视图跟着增长；向上滚动后不再自动滚，底部出现"↓ 新消息"。
3. 向上滚动到顶部加载更早的消息，画面不跳。
4. `focus` 卡片：点击后画布进入第 3 层，目标节点闪两次、其余变淡 2 秒（`U.10.05` §2）。
5. `applied` 卡片"撤销"：3 处修改按倒序发出 3 次 `revert_op`，节点恢复；操作历史里出现 3 条撤销记录（`U.19.02` 第 5 步）。
6. 回复失败显示红字和"重试"；点停止后回复末尾显示"（已中止）"。
7. 收到 `kind: "unknown_x"` 的卡片块：不报错，其他内容照常显示。
8. 对话 Agent 工作时状态行显示"正在读取图"等当前步骤；急停后显示急停提示。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/chat/ChatPage.tsx`、`MessageList.tsx`、`MessageView.tsx`、`Markdown.tsx`、`BlockView.tsx`、`GraphCard.tsx`、`AppliedCard.tsx`、`RunCard.tsx`、`FocusCard.tsx`、`ErrorCard.tsx`、`ChatStatusLine.tsx`，每个同名 `.css`、`.test.tsx`；`web/src/panels/chat/sanitize.ts`（`SANITIZE_SCHEMA`、`safeUrl`）、`sanitize.test.ts`；`web/src/panels/chat/__fixtures__/xss.md`（XSS 用例集）；`web/tests/e2e/chat.spec.ts`；`web/package.json` 只加 `react-markdown`、`rehype-sanitize` 两个依赖（`G.10` §3.3 已登记）。
- 不许碰的文件：`web/src/state/`、`web/src/ops/`、`web/src/canvas/`、其他 `panels/` 目录（`ProposalCard`、`ApprovalCard` 只 import）、`design/tokens.css`、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0704-T1 XSS`：`xss.md` 每一条渲染后没有 `script` / `img` / `iframe` / `style` 元素、没有 `on*` 属性、`href` 只剩 http(s) / mailto
  - `W0704-T2 用户消息纯文本`：`**粗**` 原样显示；换行保留
  - `W0704-T3 选中附带`：`selection.node_ids` 50 个、`content` 带截断说明 → 小标"附带 50 个（共 60 个）"；点击 → `useLocate`
  - `W0704-T4 流式节流`：100ms 内 10 次内容变化 → `Markdown` 解析 ≤ 2 次；未闭合代码块不报错
  - `W0704-T5 自动滚动`：停在底部时新内容保持在底部；离开底部后出现"↓ 新消息"
  - `W0704-T6 向上加载`：`hasOlder` 且滚到顶 → `loadOlder` 1 次；插入后 `scrollTop` 补偿
  - `W0704-T7 块分派`：七种 `kind` 各一条渲染出对应组件；未知 `kind` → null + `console.debug` 1 次
  - `W0704-T8 已修改撤销`：`op_ids=[a,b,c]` → `revertOp(c)`、`revertOp(b)`、`revertOp(a)` 依次；`b` 失败 → 不发 `a`，提示原因
  - `W0704-T9 看这里`：点 `FocusCard` → `useLocate({…, look:'look'})`
  - `W0704-T10 运行卡片`：点击 → `run.focus(id)`、`setRs(true,'mon')`
  - `W0704-T11 失败与停止`：`failed` → 红字 + "重试"→ `retry`；流式中"停止"→ `stop`
  - `W0704-T12 状态行`：`tool` + `note='正在读取图'` → 显示 note；`waiting` → "排队中"；急停 → 急停提示
  - `W0704-T13 模型标签`：助手消息头部有"AI · 模型名"
  - `W0704-T14 端到端`：§10 验收 2、4、5（Playwright，`--fake-llm`）
- 允许使用的依赖：`react`、`react-markdown`、`rehype-sanitize`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R26）；另：不使用 `dangerouslySetInnerHTML`；不加载消息里的外部图片；不引入 `remark-gfm`、语法高亮库；已修改卡片的撤销不调用 `undo`；不在对话页里实现发送。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 8 棒；`P.09` K113、K114 |
