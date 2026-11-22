# W.07.09 审批卡片

| 项 | 内容 |
|---|---|
| 编号 | W.07.09 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设12；demo `设计规范_v0.3/src/29_model.js`（提议栏、提议卡片）；demo v0.5（v0.5.11）`35_inbox.js`（待处理条目）；`U.12` §3、R2；`U.14.04` §2；`U.19.02`、`U.19.03`；`C.08`、`C.10` §4；`B.04.04`；`E.14.11.01`；`P.09` K111、K113、K114 |
| 最后修改 | 2026-11-23 |

## 1. 职责
人和 AI 之间"等你决定"的两类界面：**提议**——对话框上方的提议栏（"模型提议 N 处修改 · 逐条查看 · 全部采纳 · 全部拒绝"、另有几处在别的层、已过期）、逐条查看（跨层换层、左右切换、单处采纳 / 拒绝）、对话里的提议卡片；**审批**——审批卡片（谁要做什么、风险、污染来源、详情、批准 / 驳回 / 以后都允许、人工节点的输入与选择、同类合并一次处理），在对话里、通知中心里复用同一个组件。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 提议、预览、逐条查看位置、档位的数据与请求 | `W.03.06` |
| 待审批的数据、处理请求、急停后清空 | `W.03.05` §6.3 |
| 画布上的幽灵节点、提议条（节点旁的"采纳 / 拒绝"）、逐条查看时的视图移动 | `W.06.14` |
| 画布节点上的"批准 / 驳回"按钮 | `W.06.03`、`W.06.01`（`node.action`） |
| 通知中心的列表与标签页 | `W.07.10`（它的"待我处理"条目用本文的 `ApprovalCard compact`） |
| 审批规则、合并规则、"以后都允许"写授权书 | 后端（`B.04.04` §5、`S.04`） |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`；`W.02.01` §4.2（`enterLayer`、`leaveTo`）；`W.02.02` §6.2（提议栏在对话框正上方）；`W.03.05` §4.1（`approvals`、`resolveApproval`、`resolveBatch`）、§6.3；`W.03.06` §4、§6.1–§6.4（`proposalMarkCount`、`elsewhere`、`reviewTarget`、`startReview` / `reviewStep` / `endReview`、`acceptAll` / `rejectAll`、`stale`、`deciding`）；`W.05` §4.1（`undo`）；`C.08`（R2、R5–R8，§4.3）；`C.10` §4（`proposal`、`approval` 块）；`B.04.04` §4–§5；`E.14.11.01` §5–§7；`U.12` §3、R2；`U.14.04` §2；`U.19.02` 第 3a–4a 步、§3；`U.19.03`（全部）；`U.11-R1`；`U.23-R2`；`P.09` K82、K111、K113、K114。

## 4. 接口

### 4.1 组件
```tsx
// web/src/panels/approval/ProposalBar.tsx —— FloatLayer 里、对话框正上方；没有提议也没有过期提议时 null
export function ProposalBar(): JSX.Element | null;
// web/src/panels/approval/ProposalCard.tsx —— 对话里的 proposal 块（W.07.04 BlockView 调用）
type ProposalCardProps = { block: Extract<MessageBlock, { kind: 'proposal' }>; sessionId: Ulid };
export function ProposalCard(p: ProposalCardProps): JSX.Element;
// web/src/panels/approval/ApprovalCard.tsx —— 对话里的 approval 块、通知中心的待我处理（W.07.10）
type ApprovalCardProps = { approvalId: Ulid; summary?: string; variant: 'chat' | 'compact'; groupKey?: string };
export function ApprovalCard(p: ApprovalCardProps): JSX.Element;
type ApprovalDetailProps = { approval: Approval };
export function ApprovalDetail(p: ApprovalDetailProps): JSX.Element;
```
```ts
// web/src/panels/approval/approvalView.ts —— 纯函数
export function riskLabel(risk: Approval['risk']): { tone: 'neutral' | 'wait' | 'danger'; textKey: string };   // L0 只读 / L1 本地写 / L2 对外可撤销 / L3 对外不可撤销
export function canAlways(a: Approval): boolean;        // kind 为工具调用且风险 ≤ L2（U.14.04 §2、B.04.04 §5）
export function scopeOfLoc(loc: Loc): Scope;            // C.06.05：最内层容器节点 ID，没有为 'root'
export function resolvedText(a: Approval, t: T): string; // "你已批准 · 20:31""你已驳回""已超时""运行已取消，无需审批""急停后已取消"
```

### 4.2 本文需要、由上层新增的（`P.09` K113、K114）
- `W.03.05`：`SessionActions.getApproval(aid): Promise<Approval>`——已经不在待审批里的审批（对话里的旧卡片）按需取一次详情显示结果，最近 50 个缓存。
- `Approval` 前端读取的字段新增：`options`（人工选择的选项）、`input_schema`（人工输入的格式，只支持字符串 / 数字 / 布尔 / 枚举）、`resolved_at`、`outcome`、`tool`（工具名）、`params_preview`（关键参数，已脱敏）、`group_key`（同类合并键，`S.04-R10`）（`W.04.04` §3.5）。

### 4.3 依赖
`W.03` §4.2 的 hook；`W.03.06` 的 `ModelState`、`ModelActions` 和选择器；`W.03.05` 的 `approvals`、`estop`、`SessionActions`；`W.03.01` 的 `crumbs`（层名）；`W.05` 的 `useOps().undo`；`W.02.01` 的 `useNav`；`W.02.04` 的 `keys.pushOverlay`；`W.07` §4.2 的 `useLocate`、`useEditBlock`；`W.08` 的 `Button`、`IconButton`、`Badge`、`TextInput`、`Segmented`、`Tooltip`、`Spinner`、`Icon`；`W.10` 的 `useT`、`fmtAbsTime`、`fmtRelTime`。

## 5. 数据结构
- 组件内部：审批卡片"详情"是否展开、人工输入的值、选中的信任来源；提议栏是否展开"另有几处"的列表。
- 不另存提议和审批的副本（`W.01-R14`）：卡片每次从 store 读当前状态。

## 6. 行为

### 6.1 提议栏（`U.12` §3、`U.09.01` ⑤）
- 出现条件：`model.proposals.size > 0` 或 `model.stale.length > 0`。玻璃材质 + 2px 模型色左边线（`U.09.01` ⑤、`P.09` K112），宽度与对话框一致。
- 正常一行：模型色小图标 · "模型提议 {proposalMarkCount} 处修改" · [逐条查看] [全部采纳] [全部拒绝]（`model` 变体按钮，不用实心主色，`U.23-R2`）。
- 另有几处在别的层（`elsewhere(model, 当前层)`，`U.12-R2`）：第二行 `text-2`"另有 2 处在「闭环迭代」里"（多层时"另有 5 处在 3 个层里"，点开列出每层）；点一层 → 换到那一层（§6.3 的换层方法）。
- 全部采纳 / 全部拒绝 → `model.acceptAll()` / `rejectAll()`；进行中（`deciding` 非空）按钮置灰并显示旋转弧。全部采纳成功 → 提示"已采纳 · 撤销"（撤销 = `ops.undo()`：采纳是用户的一组操作，`C.08-R7`、`U.19.02` 第 4a 步）。失败 → 提示服务端说明（`proposal_stale` 时 store 已移进过期，不重复提示）。
- 已过期（`model.stale`，`U.12` §3）：每条一行 `wait` 色"已过期：图在提议后被修改了"· [让 AI 重新生成] · ×（`dismissStale`）。"让 AI 重新生成"→ `session.send(sid, t('appr.regen', {summary}), {selection: 只带当前层})`（直接发送，不预填），然后 `dismissStale(pid)`。
- 不能处理时（`useEditBlock()` 不为 null，或急停中——急停期间采纳会被服务端拒绝，`P.09` K82）：采纳、拒绝置灰，提示框写原因；逐条查看照常可用。

### 6.2 逐条查看（`U.12` §3"依次聚焦每处修改（左右箭头切换）"、`W.03.06` §6.4）
- 点"逐条查看"→ `model.startReview()`；提议栏变为查看模式：
  ```
  [←] 第 3 / 7 处 · 为了避免错误的"达成"让流程提前结束，加一道人工复核   [采纳这处] [拒绝这处] [→]  [结束]
  ```
  理由取当前标记的 `reason`，没有就用提议的 `op_reasons` / `rationale`（同 `W.06.14` §6.2 的取法）。
- 按键：查看模式期间 `keys.pushOverlay('popover', h)`：`←` / `→` → `reviewStep(−1 / +1)`、`Esc` → `endReview()`；其余键继续往下传（画布照常平移缩放，但方向键不再移动节点）。退出查看模式时弹出这一层。
- 采纳这处 / 拒绝这处 → `model.accept(pid, [当前标记的 opId])` / `reject(…)`（依赖联动由服务端做，`C.08-R6`）；处理后 store 自动把 `index` 夹到范围内，没有标记了就结束（`W.03.06` §6.4）。
- 跨层（`reviewTarget(model).scope` 不是当前层）：目标层是当前层的上层 → `useNav().leaveTo(scope)`；否则 → `enterLayer(scope)`（根图 → `leaveTo('root')`）。换层完成后引擎按 `reviewTarget` 聚焦（`W.06.14` §6.4）；本文只负责换层。当前层用 `useCanvasStores().view` 的 `scope`（`useSyncExternalStore` 订阅，只在换层时提交）。

### 6.3 提议卡片（对话里，`C.10` §4、`U.12` §3"对话里"）
- 显示：模型色左边线 · "提议 · {summary}" · "新增 {add} · 修改 {modify} · 删除 {remove}"（为 0 的项不写）。
- 状态按 model store 判断：
  | 情况 | 显示 | 按钮 |
  |---|---|---|
  | `proposals` 里有（`open` / `partially_applied`） | 部分已处理时加"已处理一部分" | 采纳全部（`acceptAll(pid)`）· 拒绝全部（`rejectAll(pid)`）· 在画布上查看（`startReview(pid)`） |
  | 在 `stale` 里 | `wait` 色"已过期" | 让 AI 重新生成（同 §6.1） |
  | 都不在（已采纳或已拒绝） | `text-3`"已处理" | 无 |
- 卡片指向的图不是当前图：按钮"在画布上查看"先 `switchGraph(graph_id)` 再开始查看（`B.06.02.02` §4）。

### 6.4 审批卡片（`U.14.04` §2、`U.19.03`、`B.04.04`、`E.14.11.01`）
- 数据：`session.approvals.byId.get(approvalId)`；不在里面（已处理、已取消、刷新前就处理过）→ `session.getApproval(id)` 取一次，显示 `resolvedText`，不再有按钮。
- `variant="chat"`（对话里）：
  ```
  ⚠ 等待审批 · L2 对外可撤销                              3 分钟前
  执行池想调用「发邮件」工具                                  （summary）
  [由外部内容引出：来自「网页抓取」的内容]                    （taint 不为空时，wait 弱色）
  [详情 ▾]
  [批准] [驳回] [以后都允许]                                  （以后都允许只在 canAlways 时）
  ```
  `variant="compact"`（通知中心）：一行摘要 + 风险徽标 + [批准] [驳回] [在画布上看]。
- 风险徽标（`riskLabel`）：L0 / L1 中性、L2 `wait`、L3 `danger`；文字按 `P.06`（L0 只读 / L1 本地写 / L2 对外可撤销 / L3 对外不可撤销）。
- 详情（`ApprovalDetail`，展开时才渲染）：要做什么（工具名、关键参数 `params_preview`，只读、等宽）· 在哪（`loc` 的层路径 + 节点名，点击 → `useLocate({scope: scopeOfLoc(loc), nodes:[节点]})`）· 污染来源与"本次运行信任这些来源"勾选（`trust_sources`，`S.05-R6`）· 创建时间。
- 人工节点（`kind` 为人工输入 / 人工选择）：
  - 人工选择：每个 `options` 一个按钮（代替批准 / 驳回）→ `resolveApproval(id, {outcome: option})`。
  - 人工输入：按 `input_schema` 给一个输入控件（字符串 `TextInput`、数字 `NumberStepper`、布尔 `Segmented` 是 / 否、枚举 `Segmented` 或 `Select`）+ [提交] → `resolveApproval(id, {outcome: 'submitted', value})`；格式不对时行内红字。
- 按钮（批准用 `secondary`、驳回用 `danger`、以后都允许用 `ghost`；都不是实心主色，`U.23-R2`）：
  - 批准 → `resolveApproval(id, {outcome: 'approve', scope: 'once', trustSources})`；驳回 → `{outcome: 'deny'}`；以后都允许 → `{outcome: 'approve', scope: 'always'}`，成功后卡片说明"以后在这一层调用「{工具}」不再询问"（`U.19.03` 第 3'' 步）。
  - 请求中按钮置灰 + 旋转弧。成功后卡片立即显示"你已批准 · {时间}"（以 `resolveApproval` 的返回为准）；画布节点上的按钮、通知中心的同一条同时消失（都读同一个 store，`U.19.03` 第 3 步）。
  - 409 `approval_closed`（另一处已经处理了）：不报错，直接显示已处理（`U.19.03` §3）。其他错误：提示服务端说明。
- 同类合并（`groupKey`，`S.04-R10`、`E.14.11.01` §5 第 5 步）：同一组 `count > 1` 时卡片标题后加"同类 {count} 条"，按钮作用于整组 → `resolveBatch(ids, {outcome, scope})`；"详情"里逐条列出，可以单独处理某一条。
- 急停后（`estop.global`）：待审批被后端取消，卡片显示"急停后已取消"（`U.09.05-R2`）。
- 断开时按钮置灰，提示框写原因；急停中不另外限制（审批已被取消）。

## 7. 不变量
- 采纳、拒绝、批准、驳回只经 model store / session store 的 action，本文没有直接请求；本地不因为点了"采纳"就改图（`W.03.06` §7、INV-08）。
- 同一条审批在对话、通知中心、画布节点上显示同一个状态（同一份 store 数据）。
- "以后都允许"只在风险 ≤ L2 的工具审批上出现。
- 提议栏和提议卡片的按钮都不是实心主色。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 采纳 / 拒绝失败 | 提示服务端说明；`proposal_stale` 由 store 移进过期，本文不重复提示 |
| 审批已被处理（409） | 静默显示已处理 |
| `getApproval` 失败 | 卡片显示"这条审批已经不在了" |
| 人工输入格式不对 | 行内红字，不提交 |
| 逐条查看换层超时（目标层已被删除） | `endReview()`，提示"那一层已经不存在了" |

## 9. 性能与资源
- 提议栏订阅 `proposals` 大小、`stale`、`deciding`、`review`、`elsewhere` 结果（按 `previews` 缓存）；`model.activity` 变化不引起它渲染。
- 审批卡片按 `approvalId` 精确订阅一项；活动刷新（每 5 秒）没有变化时不重渲染。

## 10. 验收标准
1. 档位 1 下让 AI 加两个节点：提议栏"模型提议 2 处修改"出现；点"全部采纳"后幽灵节点变为真实节点，提示"已采纳 · 撤销"，撤销后回到采纳前（`U.19.02`）。
2. 提议涉及子图里 2 处：根图提议栏写"另有 2 处在「闭环迭代」里"，点它进入那一层（`U.12-R2`）。
3. 逐条查看：按 → 依次聚焦每一处，跨到子图时画布自动进入那一层；查看期间方向键不移动节点；`Esc` 结束。
4. 用户删掉提议要连的节点后，提议栏显示"已过期 · 让 AI 重新生成"，点它发出一条消息（`C.08` §5 验收 4）。
5. 运行中工具审批：对话里出现审批卡片（风险徽标、谁要做什么）；在卡片上点"批准"，画布节点上的按钮和通知中心的这一条同时消失，卡片显示"你已批准 · 时间"（`U.19.03` 第 3 步）。
6. 两处同时点批准：第二处不报错，直接显示已处理（`U.19.03` §3）。
7. L3 工具审批不显示"以后都允许"；L1 工具点"以后都允许"后卡片说明"以后在这一层调用「检索」不再询问"。
8. 人工选择节点：卡片按选项显示按钮，点一个后运行走对应的出口。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/approval/ProposalBar.tsx`、`ProposalCard.tsx`、`ApprovalCard.tsx`、`ApprovalDetail.tsx`，每个同名 `.css`、`.test.tsx`；`web/src/panels/approval/approvalView.ts`、`approvalView.test.ts`；`web/tests/e2e/approval.spec.ts`。
- 不许碰的文件：`web/src/state/`（`getApproval` 由 `W.03.05` 实现）、`web/src/canvas/`、其他 `panels/` 目录、`design/tokens.css`、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0709-T1 出现条件`：没有提议也没有过期 → null；只有过期 → 只显示过期行
  - `W0709-T2 计数与别处`：`proposalMarkCount=5`、`elsewhere=[{scope:X,count:2}]` → 文案正确；点"另有 2 处"→ `enterLayer(X)`
  - `W0709-T3 全部采纳`：`acceptAll()` 进行中按钮置灰；成功 → 提示带"撤销"，点它 → `ops.undo()`
  - `W0709-T4 不能处理`：断开或急停 → 采纳 / 拒绝置灰且提示框有原因；逐条查看可用
  - `W0709-T5 逐条查看按键`：`startReview` 后 `pushOverlay('popover')`；→ → `reviewStep(1)`；`Esc` → `endReview` 并弹出
  - `W0709-T6 跨层`：`reviewTarget.scope` 是当前层的下层 → `enterLayer`；是上层 → `leaveTo`
  - `W0709-T7 单处采纳`：`accept(pid, [opId])` 只带当前标记的 opId
  - `W0709-T8 过期`：点"让 AI 重新生成"→ `send` 1 次、`dismissStale` 1 次
  - `W0709-T9 提议卡片三态`：open / stale / 已处理 各一条
  - `W0709-T10 审批卡片`：`byId` 有 → 按钮；没有 → `getApproval` 1 次后显示 `resolvedText`
  - `W0709-T11 以后都允许`：L2 工具 → 显示；L3 → 不显示；人工节点 → 不显示
  - `W0709-T12 409`：`resolveApproval` 拒绝且 `code='approval_closed'` → 没有错误提示，显示已处理
  - `W0709-T13 人工输入`：`input_schema` 为数字、输入"abc"→ 红字不提交；输入 3 → `value=3`
  - `W0709-T14 同类合并`：`count=3` → "同类 3 条"，批准 → `resolveBatch` 带 3 个 ID
  - `W0709-T15 端到端`：§10 验收 1、3、5（Playwright，`--fake-llm`）
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R6、R14）；另：不在本地改图；"以后都允许"不在 L3 上出现；审批按钮不用实心主色；逐条查看不自己移动画布视图（交给 `W.06.14`）。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版：提议栏、逐条查看跨层、提议卡片、审批卡片 | 第 8 棒；`P.09` K111、K113、K114 |
