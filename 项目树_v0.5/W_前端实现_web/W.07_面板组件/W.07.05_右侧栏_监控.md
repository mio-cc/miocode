# W.07.05 右侧栏：监控

| 项 | 内容 |
|---|---|
| 编号 | W.07.05 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5（v0.5.11）`39_monitor.js`、`16_monitor.css`；demo v0.4 `27_panels.js`（原运行页）；`U.09.07`、`U.13.03` §2、`U.14.04` §1、`U.19.04`、`U.19.05`；`E.05.02`、`E.16.02`、`E.16.05`；`P.09` K114、K117 |
| 最后修改 | 2026-11-23 |

## 1. 职责
右侧栏"监控"页：三层由粗到细——筛选（范围、状态、搜索、最近 24 小时费用）→ 运行列表 → 一次运行（四格数字、瀑布概览、按层分组的步骤、点步骤定位到画布、停止 / 暂停 / 继续 / 重新运行 / 从失败处继续、运行中改图的确认）；以及顶部两个小标签：日志、操作历史（撤销这一条、回到这里、重做；`E.05.02` 的历史面板）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 运行列表、当前运行、实时投影、日志的获取与存放 | `W.03.04` |
| 操作历史的获取 | `W.03.01` `loadHistory` |
| 撤销、撤回、回到某版本的请求 | `W.05` §6.9 |
| 画布上的节点状态、定位的转场 | `W.06.15`、`W.06.13` |
| 节点执行详情的内容 | `W.07.03` `NodeRunDetail`（本文嵌入它的 `compact` 形式） |
| 运行历史整页、回放画布 | `W.09.05` |
| 预算页 | `W.09.02` |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`；`W.03.03`（`monitor`、`setMonitor`，`hx:mon`）；`W.03.04` §4、§6.1–§6.7（`tick` 400ms、`focus`、`start`、`pause`、`resume`、`cancel`、`fork`、`logs`）；`W.03.01` §4.2（`history`、`loadHistory`、`markHistoryStale`）；`W.05` §4.1（`undo`、`redo`、`revertOp`、`revertTo`、`HistoryOutcome`）；`W.06.01` §6.1 第 6 步（`node.action{details}`）；`U.09.07`（全部，R1–R5）；`U.13.03` §2；`U.13.03-R5`–`R7`；`U.14.02`（监控页没有运行）；`U.14.04` §1；`U.17-R11`；`U.19.05`；`E.05.02` §2；`E.16.02` §5 第 3 步（运行中改图默认需要确认）；`E.16.05`；`C.06.05`（`loc` 与运行路径）；INV-12、INV-24；`P.09` K114、K117。

## 4. 接口

### 4.1 组件
```tsx
// web/src/panels/monitor/MonitorPage.tsx —— RightSidebar 在 rsTab='mon' 时渲染
export function MonitorPage(): JSX.Element;                  // 顶部小标签：运行 · 日志 · 操作历史
export function RunFilters(): JSX.Element;
type RunListProps = { items: readonly RunMeta[]; grouped: boolean };
export function RunList(p: RunListProps): JSX.Element;
type RunItemProps = { run: RunMeta; current: boolean; live: boolean };
export function RunItem(p: RunItemProps): JSX.Element;
type RunDetailProps = { runId: Ulid; focusExec?: string };
export function RunDetail(p: RunDetailProps): JSX.Element;
type WaterfallProps = { bars: readonly StepBar[]; span: { t0: number; t1: number }; onPick(execKey: string): void };
export function Waterfall(p: WaterfallProps): JSX.Element;
type StepListProps = { groups: readonly StepGroup[]; filter: StepFilter; expanded: string | null; onPick(s: StepBar): void; onExpand(execKey: string | null): void };
export function StepList(p: StepListProps): JSX.Element;
export function StepRow(p: { step: StepBar; maxMs: number; expanded: boolean; runId: Ulid; onPick(): void; onExpand(): void }): JSX.Element;
export function LogView(): JSX.Element;
export function OpHistory(): JSX.Element;
export function OpHistoryItem(p: { rec: OpRecord; canRedo: boolean }): JSX.Element;
```
```ts
// web/src/panels/monitor/steps.ts —— 纯函数
export type StepFilter = 'all' | 'failed' | 'waiting' | 'slowest';
export type StepBar = { execKey: string; nodeId: Ulid; label: string; scope: Scope; groupKey: string;
  state: NodeState; t0: number; t1: number | null; error?: string; round?: number };
export type StepGroup = { key: string; label: string; steps: StepBar[]; ms: number };
export function mergeSteps(timeline: readonly Bar[], live: Iterable<ExecState> | null, m: GraphModel | null): StepBar[];   // 时间线快照 + 实时投影（同一执行键以 seq 新者为准）
export function groupSteps(steps: readonly StepBar[], m: GraphModel | null, t: T): StepGroup[];   // 按 loc 的层路径分组："根图"、"闭环迭代 · 第 2 轮"、"闭环迭代 · 第 2 轮 › 资料采集"
export function filterSteps(steps: readonly StepBar[], f: StepFilter): StepBar[];   // slowest：用时前 5
export function runCounts(items: readonly RunMeta[]): Record<MonitorPrefs['status'], number>;
export function statusOf(r: RunMeta): Exclude<MonitorPrefs['status'], 'all'>;      // 待处理 = paused 或有待审批
export function headline(r: RunMeta, t: T): string;            // "失败于「决策者」""等待「发布审批」""正在「采集员」""41 步"
```

### 4.2 本文需要、由上层新增的（`P.09` K114、K117）
```ts
// W.03.04 新增
RunActions.timeline(runId: Ulid): Promise<readonly Bar[]>;        // GET /runs/{id}/timeline（B.04.03）
LiveRun.all(): Iterable<ExecState>;                               // 投影里的全部执行（监控页合并步骤用）
CurrentRun.pendingPatches: readonly PendingPatch[];               // RunView.pending_patches：可以热更新、等你确认的修改（E.16.02 §5 第 3 步）
// RunMeta 前端读取的字段新增（W.04.04 §3.5）：no（这张图的第几次运行）、headline {kind, node_label?, steps?}、steps {done, total}、cost_micros
```
`Bar`（`GET /runs/{id}/timeline` 的一项）= `{exec_key, node_id, loc, state, started_at, ended_at?, error?}`；`PendingPatch` = `{patch_id, summary, scope_path, op_ids}`。两个结构登记在 `W.04.04` §3.5。

### 4.3 依赖
`W.03` §4.2 的 hook；`W.03.04` 的 `RunStoreApi`、`live`、`tick`；`W.03.01` 的 `history`、`loadHistory`、`crumbs`；`W.03.03` 的 `monitor`、`setMonitor`；`W.03.05` 的 `sessionMeta`（全部会话时的分组名）；`W.05` 的 `useOps()`；`W.06.01` 的 `useCanvasEvent('node.action')`；`W.07` §4.2 的 `useLocate`、`describeOp`；`W.07.03` 的 `NodeRunDetail`；`W.08` 的 `Tabs`、`Segmented`、`SearchInput`、`StatusDot`、`ProgressBar`、`Badge`、`Button`、`IconButton`、`EmptyState`、`ScrollArea`、`Dialog`、`Spinner`；`W.10` 的 `useT`、`fmtDuration`、`fmtCost`、`fmtRelTime`、`fmtAbsTime`。

## 5. 数据结构
- 本文私有：`StepBar`、`StepGroup`、`StepFilter`（§4.1）。
- 组件内部：当前小标签（运行 / 日志 / 操作历史，不持久化，缺省运行）、搜索词、展开的运行 ID 与执行键、步骤筛选、折叠的分组、步骤列表的节流快照（§6.5）。

## 6. 行为

### 6.1 筛选（`U.09.07` §2 第 1 层、R1）
- 范围 `Segmented`：本会话 / 全部会话 → `ui.setMonitor({range})` 并 `run.loadList({range})`（`limit=200`，本地再筛选，计数才准）。
- 状态：全部 · 运行中 · 待处理 · 失败 · 完成，每个后面是数量（`runCounts`）；数量为 0 的变灰但可点（`U.09.07` §2）。选择写 `ui.setMonitor({status})`（记住，`hx:mon`）。
- 搜索：匹配运行编号（`#12` 或 `12`）和 `headline` 里的节点名；有焦点时暂停 §6.5 的刷新（`U.09.07-R3`）。
- 右上角"最近 24 小时 ¥0.42"：当前范围内 `created_at` 在 24 小时内的运行 `cost_micros` 之和（`fmtCost`）。

### 6.2 运行列表（第 2 层）
- 排序：运行中、待处理、失败在前（各自按开始时间倒序），其余按开始时间倒序；全部会话时按会话分组，组标题是会话名（`U.09.07` §2）。
- 每项：状态点 · `#no` · `headline` · 进度条（运行中 / 待处理时，`steps.done / steps.total`）· 用时 · 费用 · 多久前。当前运行（`run.currentId`）有浅底标记。
- 点一项 → 展开为 `RunDetail`（同一时刻只展开一项）；不是当前运行时同时 `run.focus(id)`（画布节点状态随之切换，`W.03.04` §6.1）。
- 列表刷新：`session.onActivity` 报告 `runStarted` / `runEnded` 时 `loadList` 一次（300ms 防抖）；当前运行的状态来自事件，不轮询。
- 没有运行：`EmptyState`"还没有运行过"、"点顶部的「运行」，结果会显示在这里"、按钮"运行"（`run.start()`，`U.14.02`）。

### 6.3 一次运行（第 3 层，`RunDetail`）
1. **四格数字**：用时（结束 − 开始；运行中按 §6.5 的节奏刷新）· 步骤（完成 / 总数）· 费用（当前运行用 `current.cost.costMicros`，否则 `meta.cost_micros`）· 开始时间（相对时间，悬停绝对时间）。
2. **待确认的运行中改图**（`current.pendingPatches` 非空，`E.16.02` §5 第 3 步、`P.09` K117）：顶部 `wait` 弱色条"有 N 处修改可以用到这次运行 · {summary} · [应用] [不应用]"→ `run.hotpatch(patch_id, 'confirm' | 'discard')`；运行里已应用的（`current.swaps`）以 `text-3` 行列在瀑布上方："第 3 轮开始前用上了 v35 的修改（你 / AI）"（INV-12、INV-24）。
3. **瀑布概览**（`Waterfall`）：横轴是时间，每一步一条 2px 细线，颜色按状态（运行中 `accent`、完成 `ok`、等待 `wait`、失败 `danger`、跳过 / 缓存 `text-3`）；步数 ≤ 500 用 SVG，> 500 用 canvas。点一条 → 同 §6.4 点步骤。
4. **步骤**：`mergeSteps(timeline, live, model)` → `groupSteps` → `filterSteps`。筛选 `Segmented`：全部 · 失败 · 等待 · 最慢（前 5）。失败的运行第一次打开时默认"失败"（`U.09.07-R2`）。
   - 分组按层路径（`loc.scopes` 里每一层容器节点的显示名 + 轮次 / 份号），可折叠；组标题写步数和用时。
   - 每一步（`StepRow`）：状态点 · 名称（graph 里找不到这个节点时写"已删除的节点"）· 失败原因（红字，单行省略）· 用时条（相对本次运行最长一步）· 用时。
   - 行尾"详情"→ 在行下展开 `NodeRunDetail compact`（`W.07.03` §6.7）；"在属性页打开"→ 选中节点并 `ui.setRs(true, 'insp')`。
5. **操作**：
   | 按钮 | 何时显示 | 动作 |
   |---|---|---|
   | 停止 | `running` / `paused` | `run.cancel()`；`cancelRequested` 期间按钮变"正在停止…" |
   | 暂停 / 继续 | `running` / `paused`（`U.14.04` §1） | `run.pause()` / `resume()` |
   | 重新运行 | 已结束 | `run.start()`（当前图的新一次运行） |
   | 从失败处继续 | `failed` | 确认框"从「{失败节点}」之前的检查点继续？前面完成的节点不再执行"→ `run.fork({nodeId, scopes})`（`U.19.05` 第 4 步、`E.16.05`） |
   - 急停中：重新运行、从失败处继续置灰，提示"急停中不能运行"（`U.19.04` §3）；停止照常可用。
   - fork 出来的运行在列表顶部出现，详情里第一行 `text-3`"从运行 #12 分叉"（`U.19.05` 第 5 步）。

### 6.4 点步骤：定位到画布（`U.09.07` §2、R4、R5）
1. 运行的 `session_id` 不是当前会话（全部会话范围下）→ 行内出现"这次运行在会话「X」里 · [切过去]"；点"切过去"才继续（`U.09.07-R4`）。
2. `useLocate({sessionId: run.session_id, graphId: run.graph_id, scope: 这一步所在的层（loc 最内层容器节点 ID，没有为 'root'）, nodes: [nodeId], look: 'select'})`：画布逐层进入、选中、居中、闪一下。
3. 结果 `gone`：提示"这个节点在当前的图里已经不在了"（运行用的是旧版本的图快照）。
- `node.action{details, nodeId}`（画布节点上的"查看详情"，`U.19.05` 第 2 步）：切到"运行"小标签，展开当前运行，筛选"全部"，展开这个节点最新一次执行的详情并滚到可见。

### 6.5 刷新节奏（`U.09.07-R3`、`U.17-R11`）
- 当前运行在进行时：订阅 `run.tick`（≤ 每 400ms 一次），但步骤列表和四格数字的快照**最多每 700ms 重算一次**（`setTimeout` 节流，到点用最新的 `live`）；瀑布同步。
- 搜索框有焦点、页面不可见（`rsTab ≠ 'mon'` 或文档隐藏）时暂停重算；恢复时立即算一次。
- 展开一次运行时 `run.timeline(id)`；运行在进行时不再重拉时间线，靠 `live.all()` 合并（新出现的执行从投影里取 `loc`、`nodeId`）。

### 6.6 日志（小标签"日志"）
- 数据：`run.current.logs`（最多 2000 行）。每行：时间（`HH:mm:ss.SSS`）· 级别（`warn`、`error` 着色）· 节点名 · 文字（等宽，单行，点开看全文）。顶部级别筛选：全部 · 警告 · 错误；停在底部时自动跟随。
- 点一行的节点名 → `useLocate`（同 §6.4，按日志的 `path` 解析出层）。
- 没有当前运行：一行 `text-3`"打开一次运行后显示它的日志"。

### 6.7 操作历史（小标签"操作历史"，`U.13.03` §2、`E.05.02`）
- 数据：`graph.history`；打开时 `loadHistory()`；`stale=true` 且本页可见时 1 秒内 `loadHistory({refresh:true})`（`W.03.01` §6.2）；滚到底 `loadHistory()` 翻页。
- 每条（`OpHistoryItem`）：操作者（人：中性色图标；AI：`model` 色图标 + "AI" 字样，`U.12` §2、INV-24）· 时间 · 一句话（`describeOp`）· 理由（AI 的条目必有，`text-2` 小字）· 所在层（`op.target` 的层名）。同一 `group_id` 的连续条目折叠成一条，"共 N 处"可展开。
- 操作：
  | 按钮 | 动作 |
  |---|---|
  | 撤销这一条 | `ops.revertOp(op.id)`（任意一条、包括模型的，`U.13.03-R3`） |
  | 回到这里 | 确认框"回到这一步之后的状态？之后的 N 处修改会被撤销（可以再撤销回来）"→ `ops.revertTo(version)` |
  | 重做 | 只在**你自己最近一组被撤销的**条目上可用 → `ops.redo()`；其他已撤销的条目这个按钮置灰，提示"只能重做最近一次撤销" |
  - 结果 `done` → `useLocate(touched[0])`（`U.13.03-R6`、`R7`）；`failed` → 提示服务端原因（`U.13.03-R5`，`W.05` 已提示时不重复）；`nothing` → 提示"没有可以撤销的"。
- 已撤销的条目（`undone=true`）文字划线（`U.13.03` §2）。

## 7. 不变量
- 步骤列表在运行中最多每 700ms 重算一次；不订阅 `live` 的逐事件回调（`W-R2`）。
- 范围和状态筛选写进 `hx:mon`，刷新后保持（`U.09.07-R1`）。
- 操作历史里 AI 的条目一律带模型色和"AI"字样（INV-24）。
- 运行中改图只在用户点"应用"后才进入运行（`E.16.02` §5 第 3 步）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 列表加载失败 | 列表位置"没能加载运行 · 重试" |
| `focus` / `timeline` 失败 | 详情位置"没能加载这次运行 · 重试"（`W.03.04` §6.2 第 5 步） |
| 控制类请求 409 `run_state` | 提示"运行状态已经变了"；状态以 store 里对齐后的为准 |
| 423（急停中运行 / 分叉） | 不提示（横幅已说明） |
| `hotpatch` 409 | 提示"这处修改已经过时"，从列表里去掉 |
| 历史加载失败 | 历史位置"没能加载操作历史 · 重试" |
| 撤销 / 回到这里失败 | §6.7 |

## 9. 性能与资源
- 1000 步的运行：`mergeSteps` + `groupSteps` ≤ 8ms；步骤列表窗口化；瀑布用 canvas 时一次重画 ≤ 4ms。
- 运行中本页每秒 React 提交 ≤ 1.5 次（700ms 节流）。
- 时间线只在展开时请求一次；日志只读 store，不另存。

## 10. 验收标准
1. 默认只显示本会话；改为"全部会话"并刷新页面，仍是全部会话；状态数量正确，0 的变灰（`U.09.07-R1`）。
2. 一次失败的运行打开时默认筛选"失败"，失败步骤红字写原因（`U.09.07-R2`）。
3. 点第 3 层里的一步：画布逐层进入资料采集、选中并闪一下；步骤属于别的会话时先出现"切过去"。
4. 运行中步骤每 0.7 秒左右更新；在搜索框里打字时不刷新、不丢输入（`U.09.07-R3`）。
5. 在操作历史里撤销 AI 的一条修改：发出 `revert_op`，画布定位到那个节点；"回到这里"先确认；已撤销的条目划线。
6. 运行中改了循环体里的参数：监控页出现"有 1 处修改可以用到这次运行"，点"应用"后下一轮生效；点"不应用"则不生效（`E.16.02` §8 验收 3）。
7. 画布节点上点"查看详情"：右栏切到监控页并展开这个节点这次执行的详情。
8. 失败运行点"从失败处继续"：确认后新运行出现在列表顶部，详情写"从运行 #12 分叉"。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/monitor/MonitorPage.tsx`、`RunFilters.tsx`、`RunList.tsx`、`RunItem.tsx`、`RunDetail.tsx`、`Waterfall.tsx`、`StepList.tsx`、`StepRow.tsx`、`LogView.tsx`、`OpHistory.tsx`、`OpHistoryItem.tsx`，每个同名 `.css`、`.test.tsx`；`web/src/panels/monitor/steps.ts`、`steps.test.ts`；`web/tests/e2e/monitor.spec.ts`。
- 不许碰的文件：`web/src/state/`（`timeline`、`live.all`、`pendingPatches` 由 `W.03.04` 实现）、`web/src/ops/`、`web/src/canvas/`、其他 `panels/` 目录（`NodeRunDetail` 只 import）、`design/tokens.css`、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0705-T1 计数与状态归类`：`paused` 与"有待审批"→ 待处理；`cancelled` → 完成；0 的项变灰
  - `W0705-T2 排序与分组`：运行中、待处理、失败在前；全部会话按会话分组
  - `W0705-T3 headline`：四种 `kind` 各一条文案
  - `W0705-T4 mergeSteps`：时间线里 `running` 的一步在投影里已 `done`（seq 更新）→ 取 `done`；投影里新出现的执行被加入
  - `W0705-T5 groupSteps`：`loc` 为 根 → 闭环迭代#r2 → 资料采集 → 组名"闭环迭代 · 第 2 轮 › 资料采集"
  - `W0705-T6 filterSteps`：最慢 → 恰好 5 条且按用时倒序
  - `W0705-T7 失败默认筛选`：打开 `failed` 运行 → 筛选为"失败"
  - `W0705-T8 定位`：同会话 → `useLocate({look:'select'})`；别的会话 → 先出现"切过去"，点了才调；`gone` → 提示
  - `W0705-T9 节流`：`tick` 每 400ms 变一次持续 3 秒 → 重算 ≤ 5 次；搜索框聚焦期间 0 次
  - `W0705-T10 操作`：`running` 显示停止、暂停；`failed` 显示从失败处继续，确认后 `fork` 收到失败节点；急停中重新运行置灰
  - `W0705-T11 运行中改图`：`pendingPatches` 1 条 → 提示条；"应用"→ `hotpatch(id,'confirm')`
  - `W0705-T12 操作历史`：AI 条目有模型色和"AI"；同组折叠；"撤销这一条"→ `revertOp`；结果 `done` → `useLocate(touched[0])`；"重做"只在自己最近一次撤销上可用
  - `W0705-T13 node.action details`：收到事件 → 小标签切到运行、展开这个节点的详情
  - `W0705-T14 日志`：级别筛选；点节点名 → `useLocate`
  - `W0705-T15 端到端`：§10 验收 1、3、5、8（Playwright，`--fake-llm`）
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部；另：不订阅 `live.subscribe`；不在本页轮询运行状态（当前运行靠事件，其他靠活动刷新）；不自动应用运行中改图；"从失败处继续"不跳过确认。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 8 棒；`P.09` K114、K117 |
