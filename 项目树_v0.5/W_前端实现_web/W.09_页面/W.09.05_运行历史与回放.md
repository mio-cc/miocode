# W.09.05 运行历史与回放

| 项 | 内容 |
|---|---|
| 编号 | W.09.05 |
| 类型 | 实施 |
| 上级 | W.09 页面 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设11 §11.4（旧版底部时间线与操作历史）；`U.09.07`（列表与瀑布的视觉）；`E.16.05`；`B.04.03`；`主流harness对照.md`（时间旅行调试）；`P.09` K146 |
| 最后修改 | 2026-11-23 |

## 1. 职责
运行历史页：盖在画布区域上的一整页，左边是运行列表，右边是一次运行的**回放**——只读的回放画布显示那次运行的图快照，下方的进度条可以拖到任意时刻、按事件逐步播放，节点状态、连线流动、轮次都按那一刻的记录显示；可以查看任一节点执行的详情，从某个节点分叉重跑，或发起一次"完整回放"（新运行，不调用模型、不产生费用）。

`U` 里没有这一页的规范：界面按 `U.09.07` 监控页的列表与瀑布视觉、`U.10.02` 的节点状态、`U.14` 的状态反馈来定（K146）；以后补 `U` 规范时以 `U` 为准修改本文。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 回放、分叉、时间旅行的计算（重放事件、不调用模型） | 后端 `E.16.05`、`B.04.03` |
| 会话页右栏的监控页（当前运行、步骤、日志、操作历史） | `W.07.05`（它的"在运行历史中打开"调本文的入口） |
| 节点执行详情的内容 | `W.07.03` 的 `NodeRunDetail`（本文嵌入） |
| 回放画布上节点状态的绘制 | `W.06.15`（`RunBridge` 读快照模式 run store 的投影） |
| 快照模式 run store 的实现 | `W.03.04`（本文只按它的接口创建和驱动） |
| 外壳的 `cover` 插槽 | `W.02.02` §4.1（K146） |

## 3. 继承的上级约束
`W.09` §4–§6、`W.09-R1`–`R6`、`R10`；`W-R11`；`W.02.02` §4.1（`cover`）；`W.03` §4.2（`CanvasStores`、`CanvasStoresProvider`、`SelectionKey = replay:<运行 ID>`）；`W.03.01`（`createGraphStore` 只读用法：本目录在 ESLint 例外里）；`W.03.02`（`createViewStore({persist:false})`）；`W.03.03`（`history`、`openHistory`、`closeHistory`）；`W.03.04` §4（`createRunStore({mode:'snapshot'})`、`fork`、`replay`、`nodeDetail`、`nodeReplay`、`timeline`）、§6.2 第 4 步；`W.06` §4.2（`CanvasKind='replay'`）、§6.6（只读）；`W.06.15`；`W.07.03` §6.7；`U.09.07`；`U.10.02`；`U.14.01`；`U.17-R10`、`R11`；`U.19.05`；`E.16.05`（全部）；`C.12-R6`、`R7`；`S.11-R3`；INV-11、INV-13；`P.07` M5（"任一历史运行可回放"）；`P.09` K146。

## 4. 接口
```tsx
// web/src/pages/history/HistoryCover.tsx —— SessionRoute：ui.history 非空时懒加载，作为 AppShell 的 cover
export default function HistoryCover(): JSX.Element | null;

type HistoryPageProps = { sessionId: Ulid; runId: Ulid | null; seq?: number; onClose(): void };
export function HistoryPage(p: HistoryPageProps): JSX.Element;
type HistoryRunListProps = { sessionId: Ulid; selected: Ulid | null; onPick(id: Ulid): void };
export function HistoryRunList(p: HistoryRunListProps): JSX.Element;   // 读工作区 run store 的 list（只读使用）
type ReplayViewProps = { runId: Ulid; initialSeq?: number };
export function ReplayView(p: ReplayViewProps): JSX.Element;
type RunSummaryProps = { view: RunView; onOpenRun(id: Ulid): void };   // fork_of / replay_of 链接
export function RunSummary(p: RunSummaryProps): JSX.Element;
type ScrubberProps = { s: ScrubState; bars: readonly Bar[]; onSeek(seq: number): void; onScrubStart(): void; onScrubEnd(seq: number): void };
export function Scrubber(p: ScrubberProps): JSX.Element;
type ReplayToolbarProps = { s: ScrubState; onPlay(): void; onPause(): void; onStep(dir: -1 | 1): void; onSpeed(x: 1 | 2 | 4 | 8): void;
  onFullReplay(): void; canFork: boolean; onFork(): void };
export function ReplayToolbar(p: ReplayToolbarProps): JSX.Element;

// web/src/pages/history/useReplayStores.ts —— 组装一个回放画布实例的 store（W.09-R10）
export function useReplayStores(runId: Ulid): {
  stores: CanvasStores | null;           // {graph(只读), view(persist:false), run(snapshot), model:null, selectionKey:`replay:${runId}`, readonly:true}
  status: 'loading' | 'ready' | 'error'; error?: ApiError;
  seek(seq: number): Promise<void>;      // 让快照 run store 重新拉 /view?at_seq=；图快照版本变化时重新载入图
  dispose(): void;
};

// web/src/pages/history/scrub.ts —— 纯函数
export type ScrubState = { min: number; max: number; seq: number; playing: boolean; speed: 1 | 2 | 4 | 8; live: boolean };   // live：运行还没结束，max 会增长
export function stops(bars: readonly Bar[], max: number): readonly number[];      // 播放时停靠的 seq：每个 Bar 的 start_seq、end_seq，去重排序，加上 0 与 max
export function nextStop(st: readonly number[], seq: number, dir: -1 | 1): number;
export function seqAtX(x: number, width: number, s: Pick<ScrubState, 'min' | 'max'>): number;
export function barRect(b: Bar, width: number, s: Pick<ScrubState, 'min' | 'max'>): { x: number; w: number };
export const PLAY_INTERVAL_MS = 600;    // 1× 时每个停靠点停留的时长；n× 时除以 n（几何节奏常量，W.07-R2 的做法）
```
### 4.1 依赖
`W.09` §4.6；`W.03` §4.2 的 `CanvasStoresProvider`、`useRunStore`、`useAppActions`；`W.03.01` 的 `createGraphStore`（只取 `store`）；`W.03.02` 的 `createViewStore`；`W.03.04` 的 `createRunStore`（`mode:'snapshot'`）、`RunActions`（`fork`、`replay`、`nodeDetail`、`nodeReplay`、`timeline`、`focus`、`loadList`）；`W.03.03` 的 `history`、`openHistory`、`closeHistory`、`setRs`、`notify`；`W.06.01` 的 `<Canvas kind="replay">`、`useCanvasEvent`（`inspect`、`node.action`）、`useCanvasCommands`（`fit`、`locate`）；`W.07.03` 的 `NodeRunDetail`；`W.02.04` 的 `keys.pushOverlay`、`keys.label`；`W.08` 的 `Button`、`IconButton`、`Segmented`、`StatusDot`、`Badge`、`ProgressBar`、`Dialog`、`Spinner`、`EmptyState`、`ScrollArea`、`Tooltip`；`W.10` 的 `useT`、`fmtDuration`、`fmtCost`、`fmtRelTime`、`fmtAbsTime`。

## 5. 数据结构
`RunMeta`、`RunView`、`Bar`、`NodeDetail`、`NodeReplay` 从 `@/lib/protocol` 导入；本文用到 K146 新增的字段：`RunView.last_seq`（这次运行事件日志的最大 seq）、`RunView.graph_version_at`（`at_seq` 那一刻生效的图快照版本，含运行中热更新与运行时展开）、`RunMeta.replay_of`、`RunMeta.fork_of`、`Bar.start_seq`、`Bar.end_seq`（`B.04.03` §5）。本文私有：`ScrubState`。

## 6. 行为
### 6.1 打开与关闭
- 入口：监控页运行详情的"在运行历史中打开"（`W.07.05`）→ `ui.openHistory({sessionId, runId})`；命令面板"打开运行历史"（`W.07.11` 的命令，`ui.openHistory({sessionId})`）。
- `ui.history` 非空 → `SessionRoute` 懒加载 `HistoryCover` 放进 `AppShell` 的 `cover`：盖住画布区域与浮动层（对话框、浮动回复不显示），顶部条、左右侧栏照常可用；主画布引擎保持挂载不重建（`W.09` §6.1）。
- 关闭：页头左侧"返回画布"（`IconButton`，提示带 `Esc`）或 `Esc`（`keys.pushOverlay('popover', h)`，只处理 `Esc`；有打开的弹层时先关弹层）→ `ui.closeHistory()`。切换会话、切换图时也自动关闭。
- 不进 URL（`G.06.02-R8`：URL 只放会话、图、层）；刷新后回到会话页。

### 6.2 布局
```
.hx-hist        grid-template-columns: var(--hx-rs-w) minmax(0, 1fr)；bg-1
  左：页头（返回画布 · "运行历史"）· 筛选（本图 / 本会话 · 状态 Segmented）· 运行列表（ScrollArea）
  右：RunSummary（四格数字 + 来源链接）· 回放画布（占满剩余高度）· 播放控制条 + 进度条（底部，高 72）· 节点详情（从右侧滑出，宽 var(--hx-rs-w)，盖在画布上）
```
- 窗口 < 1100（`bp ∈ md/sm/xs`）：左列收成可展开的下拉（"运行 #12 ▾"），右侧占满。

### 6.3 运行列表
- 数据：工作区 run store 的 `list`（`loadList({range: 'session'})`，本页只读使用；"本图"筛选在前端按 `graph_id` 过滤）；每行与监控页一致：状态点、`#编号`、一句话（`headline`）、用时、费用、多久前（`U.09.07` §2 第 2 层）；`kind = replay` 的行带"回放"`Badge neutral`，`fork_of` 的行第二行 `text-3`"从运行 #N 分叉"。
- 打开时 `runId` 为空 → 选列表第一项；列表为空 → `EmptyState`："还没有运行过 · 点顶部的「运行」，结果会显示在这里"（`U.14.02` 第 4 行的文案）。
- 选中一行 → `ui.openHistory({sessionId, runId})`（同一页面内切换回放）。

### 6.4 回放画布（`useReplayStores`）
1. `GET /runs/{id}/view`（不带 `at_seq` = 最新）得到 `RunView`：`min = 0`、`max = last_seq`、`live = 状态不是终态`。初始 `seq` = `initialSeq ?? max`。
2. 图：`createGraphStore({readonly: true})`，`GET /graphs/{graph_id}?version={graph_version_at}` → `writer.load`（只用 `store`，丢弃 `writer`，`W.03.01` §4）。
3. 运行：`createRunStore({mode: 'snapshot', snapshot: {runId, atSeq: seq}, sessionId, graphId, branch})`（`W.03.04` §6.2 第 4 步：拉 `/view?at_seq=`，不连流）。
4. 视图：`createViewStore({persist: false, scope: 'root'})`。
5. 组装 `CanvasStores`，`<CanvasStoresProvider><Canvas kind="replay" /></CanvasStoresProvider>`；引擎 `ready` 后 `cmd.fit()`。只读：拖动、连线、改参数都不可用，平移、缩放、选中、进入子图、预览照常（`W.06` §6.6）；选中按 `replay:<运行 ID>` 单独存（`W.03.03` §5.2）。
6. `seek(seq)`：快照 run store 重新拉 `/view?at_seq=seq`（拖动中 120ms 防抖、松开立即）；返回的 `graph_version_at` 与当前图版本不同 → 重新载入图（第 2 步），引擎收到 `change.full` 全量同步（运行时展开的子图因此在对应时刻出现，INV-13）。
7. 切换到另一次运行或关闭页面：`dispose()` 销毁这三个 store；`<Canvas>` 卸载时引擎 `destroy()`（`W.09-R10`）。同一时间只有一个回放画布。

### 6.5 进度条与播放
- `Scrubber`：横条宽度代表 `[min, max]` 的 seq 范围；条上按 `barRect` 画每个节点执行的细条（颜色 = 状态，`U.09.07` 瀑布同色；同一层的执行叠在一行，最多 6 行，多出的合并为灰色细线）；当前位置是一条竖线 + 时间（该 seq 附近的 Bar 时间，`fmtAbsTime`）。
- 拖动竖线或点击横条 → `seek`；悬停显示那一刻的时间与正在执行的节点名（`Tooltip`）。
- 播放控制条：⏮ 回到开始、◀ 上一个停靠点、▶ / ⏸ 播放暂停、▶ 下一个停靠点、⏭ 到最新；速度 `Segmented` 1× / 2× / 4× / 8×；右侧"完整回放"与"从这里重跑"（§6.7）。键盘：`Space` 播放暂停、`←` / `→` 上下停靠点（只在页面有焦点、焦点不在输入框时；经 `keys.pushOverlay` 的同一处理函数）。
- 播放：每 `PLAY_INTERVAL_MS / speed` 毫秒 `seek(nextStop(stops, seq, 1))`；上一次 `seek` 还没返回时不发下一次（不堆积请求）；到 `max` 停止。减少动效时播放照常（它不是动画），进度竖线不做过渡。
- 运行还在进行（`live`）：每 2 秒刷新一次 `last_seq`（`GET /runs/{id}`），`max` 增长；"到最新"按钮旁 `text-3`"运行还在进行"；不连运行流（当前运行的实时状态在会话页监控）。

### 6.6 节点详情
- 回放画布上双击节点或 `Enter`（引擎事件 `inspect`）、节点上的"查看详情"（`node.action{details}`）→ 右侧滑出详情：节点名、这一刻它的执行列表（`run.live.execsOf(nodeId)`，多次执行时下拉选第几次）、`NodeRunDetail runId execKey`（在 `CanvasStoresProvider` 里，它读的是快照 run store）。
- "重放这个节点"：`run.nodeReplay(execKey, {live: false})`（`POST /runs/{id}/nodes/{exec_key}/replay`，不进事件日志，`E.16.05` §5）→ 在详情下方显示重放结果与原记录的对比（输出逐段对齐，不同之处 `wait` 弱色底）；"真实调用一次对比"（`live: true`）要先确认"这会真实调用一次模型 / 工具，可能产生费用"（`Dialog`），急停中置灰。

### 6.7 完整回放与分叉
| 操作 | 条件 | 做什么 |
|---|---|---|
| 完整回放 | 运行已到终态 | 确认框"重新按记录跑一遍这次运行：不调用模型和工具、不产生费用"→ 快照 store 的 `run.replay()`（`POST /runs/{id}/replay`）→ 新运行 ID；提示"已开始回放 · 运行 #{no}"带"在监控页查看"（→ `closeHistory`、工作区 run store `focus(新 ID)`、`setRs(true, 'mon')`） |
| 从这里重跑 | 回放画布上选中了一个节点，运行已到终态 | 确认框"从「{节点}」之前的检查点开一次新运行？前面完成的节点不再执行，结果复用"（`U.19.05` 第 4 步）→ `run.fork({nodeId, scopes, seq})`（`seq` = 当前进度条位置之前最近的检查点由后端选，`E.16.05` §4）→ 同上提示 |
- 急停中、离线：两个按钮置灰并在提示框说明原因（`useEditBlock` 的文案、"急停中不能运行"）。
- 后端拒绝（422、注册表哈希不同导致的拒绝，`C.12-R7`）：提示后端给的原因，如"节点定义已变化，请从检查点开新运行"。

### 6.8 RunSummary
四格数字：用时、步骤（完成 / 总数）、费用、开始时间（`U.09.07` §2 第 3 层）；第二行：图快照版本"图 v{graph_version}"；`replay_of` / `fork_of` 存在时"这是运行 #{n} 的回放" / "从运行 #{n} 分叉"，点击切到那次运行。

## 7. 不变量
- 回放页不连任何运行流，不调用任何会调用模型或工具的接口（"真实调用一次对比"除外，且先确认）（INV-13、`G.02.05-R12`）。
- 回放画布是只读画布：没有任何代码路径能从回放页提交 Op。
- 关闭回放页后：回放画布引擎、它的 graph / view / run store 全部销毁；主画布引擎没有重建。
- 同一时间最多一个 `seek` 请求在进行。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `/view?at_seq=` 失败：录制缺失（例如工作区原文已清理，`E.16.05` §7、`S.11-R3`） | 画布保持上一刻的显示，进度条上方 `wait` 一行"这次运行在这一刻之后的部分记录已清理，无法回放到这里"；播放停止 |
| 图快照版本读取失败（404） | 回放区显示"这次运行用的图版本已经不存在了"，列表照常 |
| `replay` / `fork` 失败 | 提示后端原因；页面不变 |
| 网络断开 | 播放控制条的播放、分叉、完整回放置灰；已显示的内容保留 |
| 回放区渲染抛错 | `ErrorBoundary`："回放没有显示出来 · 重新加载"，列表照常 |

## 9. 性能与资源
- `pages/history/` chunk ≤ 25KB gzip，首屏不加载（`W.09-R6`）。
- 打开到回放画布首帧 ≤ 500ms（200 节点；含三个请求）；每次 `seek` 从松开到状态更新 ≤ 200ms（本机）。
- 回放画布与主画布同时存在：主画布被盖住期间不重绘之外的工作（视口裁剪仍有效），回放画布平移缩放时 React 提交为 0（`U.17-R10`）。
- `Scrubber` 的细条用一个 `<canvas>` 绘制（≤ 2000 条执行），进度竖线是单独的元素，拖动时只改它的 `transform`。

## 10. 验收标准
1. 在监控页对一次已完成的闭环迭代运行点"在运行历史中打开"：画布区域换成运行历史，左侧列表选中这次运行，回放画布显示它的图和最终状态；"返回画布"后主画布原样（没有重新加载）。
2. 把进度条拖到开头再按播放：节点按记录依次变为运行中、完成，循环的轮次从 1 增加到 2；整个过程中浏览器没有发出调用模型的请求（只有 `/view`、`/graphs/{id}?version=`）（`P.07` M5"任一历史运行可回放"）。
3. 带运行时展开的运行：拖到展开发生之后，回放画布出现展开出来的子图；拖回之前，子图消失。
4. 选中失败节点点"从这里重跑"：新运行在监控页出现，第一行"从运行 #N 分叉"，前面的节点显示"用缓存"（`U.19.05` 第 5 步）。
5. 点"完整回放"：生成一次 `kind=replay` 的新运行，费用为 0（`E.16.05` §8 验收 1 的界面侧）。
6. 工作区原文被清理过的旧运行：拖到清理部分之后时显示"部分记录已清理"的说明，不报错退出。
7. 回放画布上不能拖动节点、不能连线、不能改参数；可以双击进入子图、可以查看节点详情。
8. 关闭页面后，测试钩子统计到的画布引擎数回到 1、`kind='replay'` 的 store 为 0。

### 实施卡
- 要建 / 要改的文件：`web/src/pages/history/HistoryCover.tsx`、`HistoryPage.tsx`、`HistoryRunList.tsx`、`ReplayView.tsx`、`RunSummary.tsx`、`Scrubber.tsx`、`ReplayToolbar.tsx`、`NodeReplayCompare.tsx`，各自同名 `.css`、`.test.tsx`；`web/src/pages/history/useReplayStores.ts`、`useReplayStores.test.ts`、`scrub.ts`、`scrub.test.ts`；`web/tests/e2e/history-replay.spec.ts`（`--fake-llm` 录放数据跑一次闭环迭代后回放）。
- 不许碰的文件：`web/src/routes/`、`web/src/shell/`（`SessionRoute` 与 `cover` 插槽由 `W.02.01`、`W.02.02` 接入）、`web/src/state/`（`nodeReplay`、`openHistory` 等由 `W.03` 实现）、`web/src/ops/`、`web/src/canvas/`、`web/src/panels/`（`NodeRunDetail` 只 import）、`web/src/components/`、`web/src/lib/protocol/`、`design/tokens.css`、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0905-T1 stops`：Bars `[(2,5),(3,9),(5,12)]`、max 20 → `[0,2,3,5,9,12,20]`；`nextStop(…, 5, 1) = 9`、`(…, 5, -1) = 3`、`(…, 20, 1) = 20`
  - `W0905-T2 seqAtX / barRect`：宽 1000、`[0, 200]`：`x=500 → 100`；`Bar(50,100) → {x:250, w:250}`；越界夹到两端
  - `W0905-T3 组装只读画布`：`useReplayStores` 得到 `readonly=true`、`model=null`、`selectionKey='replay:<id>'`、view `persist=false`；graph store 没有写入接口
  - `W0905-T4 seek 防抖与串行`：拖动中 10 次 `onSeek` 只发 1 次请求（120ms）；上一次未返回时播放不发下一次
  - `W0905-T5 图版本变化`：`seek` 返回的 `graphVersionAt` 由 12 变 13 → 重新请求 `/graphs/{id}?version=13` 1 次；不变 → 0 次
  - `W0905-T6 不连流`：打开回放页期间 `StreamClient.open` 没有被以 `kind:'run'` 调用
  - `W0905-T7 进行中的运行`：`live=true` → 每 2 秒 `GET /runs/{id}`，`max` 增长；到终态后停止刷新
  - `W0905-T8 完整回放`：运行未到终态 → 按钮置灰；确认后 `replay()` 1 次，提示带"在监控页查看"，点它 → `closeHistory`、工作区 `focus(新 ID)`、`setRs(true,'mon')`
  - `W0905-T9 从这里重跑`：没有选中节点 → 置灰；选中后确认 → `fork({nodeId, scopes, seq})`
  - `W0905-T10 真实调用要确认`：点"真实调用一次对比"先弹确认；取消 → 没有请求；急停中按钮置灰
  - `W0905-T11 录制缺失`：`/view` 返回 404 `not_found` 且 `details.resource="run_record"` → 显示"部分记录已清理"，`playing=false`
  - `W0905-T12 关闭清理`：关闭 → 回放引擎 `destroy` 1 次，三个 store `dispose`；主画布引擎构造次数不变
  - `W0905-T13 Esc`：节点详情打开时 `Esc` 先关详情，再 `Esc` 调 `closeHistory`
  - `W0905-T14 平移不重渲染`：回放画布平移 2 秒，`HistoryPage` 子树 React 提交 0 次（进度条位置不变时）
  - `W0905-T15 端到端`：§10 验收 1、2、4、5（Playwright）
- 允许使用的依赖：`react`、`zustand`（`G.10` §3.3）；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R6、R12、R23、R25）；另：回放页不连运行流；不在回放画布上提交任何 Op；不把运行历史放进 URL；播放时不并发 `seek`；不在 React 状态里存每帧的进度竖线位置。
- 完成标志：`G.14` 全部条件；§10 八条验收通过；`P.07` M5"时间线与回放"的界面侧验收由本叶子的端到端测试覆盖。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版；本页没有 `U` 规范，界面按 `U.09.07` 视觉自定 | 第 9 棒（B）；`P.09` K146 |
