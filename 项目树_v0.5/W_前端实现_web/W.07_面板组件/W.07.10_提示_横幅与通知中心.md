# W.07.10 提示、横幅与通知中心

| 项 | 内容 |
|---|---|
| 编号 | W.07.10 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设14；demo v0.5（v0.5.11）`35_inbox.js`（通知中心）、`13_polish.css`；`U.09.05`、`U.11` §2（通知、确认框）、`U.12` §4、`U.13.06-R4`、`U.14.03`–`U.14.05`、`U.16-R5`、`U.23-R10`；`P.09` K114、K115、K117 |
| 最后修改 | 2026-11-23 |

## 1. 职责
全应用的提示与状态告知：右上角的提示堆叠（含"AI 修改了 N 处 · 查看 · 全部撤销"、运行中改图待确认、预算提醒）；顶部条下方的横幅（急停横幅及唯一的"解除急停"确认框、离线横幅、子图库内容提示、窄屏提示）；冲突框（"别人（或 AI）已改为 X · 保留我的 / 用对方的"）；顶部条铃铛的通知中心（全部 / 待我处理 / 动态、全部已读、按类关闭、系统桌面通知）；读屏播报区域。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 提示队列的存放、`groupKey` 替换、20 条上限 | `W.03.03` §6.3（本文决定显示几条、多久消失，到时调 `dismiss`） |
| 连接状态的判定 | `W.04.05`（本文按 `ui.net` 显示） |
| 冲突的判定与两种选择的处理 | `W.05` §6.6（本文只弹框、调 `resolveConflict`） |
| 待审批、急停、活动摘要的数据 | `W.03.05` |
| 审批卡片本身 | `W.07.09`（通知中心复用 `ApprovalCard compact`） |
| 401 之后的整页说明 | `W.02` §6.1 |
| 设置页的"通知"分组、桌面通知授权的按钮 | `W.09.02` |
| 急停按钮、急停时顶部条变色 | `W.07.01` |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`（特别是 R9：`releaseEstop` 只在本文的确认框里）；`W-R6`、INV-10；`W.02.02` §6.6（横幅在 `BannerSlot`）；`W.03.01` §6.3（模型的远端修改按 `groupId` 合并成一条提示）；`W.03.03` §4、§6.3（`toasts`、`notify`、`dismiss`、`net`）；`W.03.05` §4.1、§6.3、§7（`estop`、`approvals`、`onActivity`、`releaseEstop`）；`W.04.05` §6（"已重新连接"变绿 2 秒）；`W.05` §4.1（`conflict`、`resolveConflict`、`revertOp`）、§6.6 第 4 步、§6.7；`U.06` §3（`--hx-z-toast`）；`U.09.05`（全部）；`U.11` §2（通知：右上角、宽 320、最多 4 条、4 秒、错误不自动消失；确认框只用于不可撤销的操作）；`U.11-R1`；`U.12` §4；`U.13.06-R4`；`U.14.03` §1–§2；`U.14.04` §3、R1；`U.14.05` §2；`U.09.03` §1（< 760 提示）；`U.16-R5`、`R6`；`U.19.04`；`U.23-R6`、`R10`；`P.09` K114、K115、K117。

## 4. 接口

### 4.1 组件
```tsx
// 应用根（AppShell 的同级）
export function ToastStack(): JSX.Element;
export function ConflictDialog(): JSX.Element | null;           // ops.conflict 为 null 时 null
export function LiveRegion(): JSX.Element;                       // 两个视觉隐藏的 aria-live 区域：polite、assertive
export function ModelEditToast(): null;                          // 只订阅 graph change、发提示，不渲染
// 外壳 <BannerSlot/>
export function BannerStack(): JSX.Element;
export function EstopBanner(): JSX.Element | null;
export function NetBanner(): JSX.Element | null;
export function LibraryRefBanner(): JSX.Element | null;
export function NarrowBanner(): JSX.Element | null;
export function ReleaseEstopDialog(p: { onClose(): void }): JSX.Element;   // 全前端唯一调用 releaseEstop 的地方
// 顶部条里（W.07.01 摆放）
export function InboxButton(): JSX.Element;
export function InboxPanel(p: { anchor: HTMLElement; onClose(): void }): JSX.Element;
export function InboxItem(p: { item: InboxEntry }): JSX.Element;
```
```ts
// web/src/panels/notice/useAnnounce.ts
export function useAnnounce(): (text: string, politeness?: 'polite' | 'assertive') => void;   // 写进 LiveRegion（U.16-R5）
// web/src/panels/notice/inbox.ts —— 纯函数
export type InboxCategory = 'approval' | 'run' | 'connection' | 'budget';
export type InboxEntry =
  | { kind: 'approval'; id: Ulid; at: string; sessionId: Ulid; groupKey?: string }
  | { kind: 'run'; id: Ulid; at: string; sessionId: Ulid; status: 'done' | 'failed' | 'cancelled'; estop?: boolean }
  | { kind: 'connection'; id: string; at: string; target: 'mcp' | 'provider'; error: string }
  | { kind: 'budget'; id: string; at: string; runId: Ulid; ratio: number };
export function buildInbox(s: { approvals: SessionState['approvals']; inbox: SessionState['inbox'] }, prefs: NotifyPrefs): InboxEntry[];   // 按时间倒序；关闭的类别去掉
export function unreadDot(entries: readonly InboxEntry[], readAt: number): 'danger' | 'wait' | 'accent' | null;   // U.09.05 §1：有错误红、只有待审批黄、其他主色
export type NotifyPrefs = Record<InboxCategory, boolean> & { desktop: boolean };
export const TOAST_MS = 4000;  export const TOAST_MAX = 4;  export const RECONNECTED_MS = 2000;  export const MODEL_EDIT_MERGE_MS = 1500;
```

### 4.2 本文需要、由上层新增的（`P.09` K114、K115、K117）
```ts
// W.03.03 Toast 新增 actions（"查看 · 全部撤销""应用 · 不应用"需要两个按钮）
Toast.actions?: readonly { label: string; run: () => void }[];   // 与原 action 并存；有 actions 时忽略 action
Toast.sticky?: boolean;                                            // 不自动消失（error 默认 sticky）
// W.03.01 GraphChange 新增 opIds（source='remote' 时为这批 Op 的 ID，W.05 §6.7 填写）
GraphChange.opIds?: readonly Ulid[];
// W.03.05 session store 新增通知中心的"动态"
SessionState.inbox: { runs: readonly RunMeta[]; connections: readonly { id: string; target: 'mcp' | 'provider'; error: string; at: string }[]; at: number; status: LoadStatus };
SessionActions.loadInbox(): Promise<void>;   // GET /runs?status=done,failed,cancelled&since=24h&limit=50（全部会话）、GET /mcp-servers、GET /providers 里 state ≠ ok 的
```
- localStorage：`hx:inbox-read`（最后一次"全部已读"或打开"全部"标签的时间戳，毫秒），登记在 `W.03` §6.4。
- 设置项（K115，已由 `W.09.02` §5.2 定稿、登记 `G.11` §3，K142）：`notify.approval`、`notify.run`、`notify.connection`、`notify.budget`（缺省都 `true`）、`notify.desktop`（缺省 `false`）；用 `settingOf(catalog.settings, path, 缺省)` 读。

### 4.3 依赖
`W.03` §4.2 的 hook；`W.03.03`（`toasts`、`dismiss`、`net`、`layout.bp`、`setRs`、`openCenter`）；`W.03.05`（`estop`、`approvals`、`inbox`、`onActivity`、`loadInbox`、`releaseEstop`、`sessionMeta`）；`W.03.04`（`current.budget`、`current.pendingPatches`、`hotpatch`、`focus`）；`W.03.01`（`change`、`model`、`crumbs`）；`W.05` 的 `useOps()`（`conflict`、`resolveConflict`、`revertOp`）；`W.02.01` 的 `useNav`；`W.07` §4.2 的 `useLocate`、`describeOp`；`W.07.09` 的 `ApprovalCard`；`W.08` 的 `Toast`、`Dialog`、`Popover`、`Tabs`、`IconButton`、`Button`、`ScrollArea`、`Icon`；`W.10` 的 `useT`、`fmtRelTime`。

## 5. 数据结构
- 本文私有：`InboxEntry`、`NotifyPrefs`、`InboxCategory`（§4.1）。
- 组件内部：每条提示的计时器与悬停暂停、离线横幅从 `reconnecting`/`down` 回到 `online` 时的"已重新连接"计时、窄屏提示本次已关闭、模型修改的合并缓冲 `Map<groupId, {opIds, nodes, scopes, timer}>`。

## 6. 行为

### 6.1 提示堆叠（`ToastStack`，`U.11` §2、`U.14.03` §1）
- 位置：画布区域右上角（顶部条下方 `--hx-s-5`），宽 320，层级 `--hx-z-toast`，玻璃材质（`U.23-R6`）；新的在上；同时最多显示 `TOAST_MAX` 条，多出的排队，前面的消失后补上。
- 每条：级别图标（`info` 中性、`ok` 对勾、`wait` 暂停符、`error` 叉、`model` 模型色 AI 字样）+ 文字 + 可选 `detail`（第二行 `text-2`）+ 动作按钮 + 关闭 ×。
- 消失：`TOAST_MS` 后 `ui.dismiss(id)`；`level='error'` 或 `sticky` 不自动消失；指针悬停时暂停计时、离开后重新计 4 秒；点动作按钮后立即消失。
- `role="status"`（`error` 为 `role="alert"`）；新提示的文字同时写入 `LiveRegion`（polite；error 为 assertive）。
- 同一个问题只报一次（`U.14-R3`）：横幅已经说明的（断开、急停）不再弹提示；`W.05` 已提示的不重复。

### 6.2 AI 修改了 N 处（`ModelEditToast`，`U.12` §4、`W.03.01` §6.3）
- 订阅 graph `change`：`source='remote'` 且 `actor.kind='model'` 时，把 `opIds`、`nodes`、`scopes` 并入以 `groupId` 为键的缓冲；最后一次到达后 `MODEL_EDIT_MERGE_MS`（1.5 秒）发一条提示：`ui.notify({level: 'model', text: N === 1 ? t('notice.ai.one', {label}) : t('notice.ai.many', {n: N}), groupKey: 'ai:' + groupId, actions: [查看, 全部撤销]})`（`groupKey` 相同的后续批次原地替换，`W.03.03` §6.3）。
  - 查看 → `useLocate({scope: 第一个改动节点所在层, nodes: 改动的节点（最多 20 个）, look: 'look'})`。
  - 全部撤销 → 按 `opIds` 倒序逐条 `ops.revertOp(id)`，前一条完成再发下一条；任何一条失败就停并提示原因；全部成功后提示"已撤销 AI 的 N 处修改"（`U.13.03-R3`）。
- 只针对档位 2 及以上的直接修改（提议不会产生 `op.applied`，`C.08-R5`）；合并缓冲在切换会话时清空。

### 6.3 其他由本文发出的提示
| 来源 | 提示 |
|---|---|
| `run.current.pendingPatches` 出现新的一条（`E.16.02` §5 第 3 步，`P.09` K117） | `wait`，sticky："有 1 处修改可以用到正在进行的运行 · {summary}"，动作：应用（`run.hotpatch(id,'confirm')`）· 不应用（`'discard'`）· 在监控页看（`setRs(true,'mon')`） |
| `run.current.budget.ratio` 变为 0.8 / 1、`exceeded`（只看根图，`W.03.04` §6.3） | `wait`："这次运行的费用已到预算的 80%"（1 时"已到预算"、exceeded 时 `error`"已超出预算"），动作：打开监控页；同时加入通知中心的"动态" |
| 当前会话的运行进入终态（`onActivity.runEnded` 里属于当前会话的） | 不弹提示（监控页、顶部条已经看得到）；只播报"运行已完成 / 运行失败"（polite，`U.16-R5`） |
| 新的待审批（`onActivity.approvalAdded`） | 不弹提示（对话里有卡片、通知中心有圆点）；播报"有一条审批在等你"（polite） |

### 6.4 急停横幅与解除（`U.14.04` §3、`U.19.04`、INV-10）
- `session.estop.global` 为真 → `EstopBanner`：`danger-weak` 底、立即出现（不做动画，`U.07.03`）："急停：所有运行已停止，AI 权限已降到 0 档（只读）"· [解除急停]（`danger` 变体按钮）。出现时 `useAnnounce(…, 'assertive')`。只有某次运行被急停（`estop.runIds`）不显示全局横幅。
- 点"解除急停"→ `ReleaseEstopDialog`（`Dialog` 宽 400，模态）："解除急停？解除后档位保持 0，需要时手动调高"· [取消] [解除急停]（危险按钮在右，`U.11` §2）。确认 → `session.releaseEstop()`；成功后横幅消失（以 `estop` 状态为准），提示"已解除急停 · 档位仍是 0，需要时点顶部条的档位胶囊调高"（`U.19.04` 第 5、6 步）；失败 → 对话框里红字写原因，保持打开。
- `releaseEstop` 在整个前端只在这个确认按钮的处理函数里出现（`W.07-R9`、`W.03.05` §7 的 ESLint 规则）；确认按钮只响应用户在按钮上的点击（或焦点在按钮上时按 Enter / 空格）；没有"记住我的选择"，重连、刷新、切换会话都不会打开或确认它（`W-R6`）。
- 横幅在 `/welcome` 以外的所有页面都显示（`U.14.04-R1`）。

### 6.5 离线横幅（`NetBanner`，`U.14.05` §2、`W.04.05` §6）
| `ui.net` | 横幅 |
|---|---|
| `online`（之前不是 `online`） | `ok` 弱色"已重新连接"，`RECONNECTED_MS`（2 秒）后消失 |
| `online` | 不显示 |
| `reconnecting`（中断 ≥ 3 秒） | `wait` 弱色"与 Harness 的连接已断开，正在重连…"；画布与编辑控件变只读由各处按 `canvasReadonly` 处理 |
| `down`（≥ 30 秒） | `danger` 弱色"Harness 已关闭。请重新启动 Harness，然后刷新这个页面"· [刷新]（`location.reload()`） |
| `closed`（401） | 不显示（`W.02` §6.1 的整页说明接管） |
- 中断 < 3 秒不显示任何东西（`W.04.05` 已经把它当作 `online`）。

### 6.6 子图库内容提示与窄屏提示
- `LibraryRefBanner`（`U.13.06-R4`）：当前层的容器节点带 `ref`（子图引用）→ 中性弱色一行"这是子图库「{name}@{version}」的内容，修改会生成新版本"；`pin='snapshot'` 时改为"这是子图库「{name}@{version}」的固定版本，修改前要先另存为新版本"· [在资源库里打开]（`ui.openCenter('library', 'subgraph:' + name)`）。是否允许修改由服务端校验决定，本文只提示。
- `NarrowBanner`（`U.09.03` §1）：`bp='xs'`（< 760）→ "窗口太窄，建议加宽到 900 以上使用"· ×（本次打开期间不再显示；不阻止使用）。
- `BannerStack` 的顺序：急停 → 离线 → 子图库内容 → 窄屏；同时出现时都显示（高度变化由画布按视口变化处理，`W.02.02` §6.6）。

### 6.7 冲突框（`ConflictDialog`，`U.14.03` §2、`W.05` §6.6 第 4 步）
- `ops.conflict.value` 不为 null → `Dialog`（宽 400，模态）：标题"这处修改和别人的冲突了"；每项一行："「{对象}」的「{字段}」：{别人 / AI}已改为 {theirs}，你改的是 {mine}"（`theirsBy='model'` 时写"AI"，模型色；值按 `formatValue` 单行截断，`W.06.14` 同一规则）；按钮 [用对方的] [保留我的]（"保留我的"在右，`C.05.04` §5：人的修改优先）。
- 点选择 → `ops.resolveConflict('mine' | 'theirs')`；对话框随 `conflict` 变为 null 关闭。`Esc` / 点遮罩不关闭（必须选一个，否则后面的修改都提交不了，`W.05` §6.6）。
- 顶部条"有冲突"字样点击时重新聚焦这个对话框（`W.07.01` §6.2）。

### 6.8 通知中心（`U.09.05`）
- `InboxButton`：铃铛图标按钮（默认 `text-3`、无底，`U.24` #6）；有未读时右上角 7px 小圆点，颜色 `unreadDot`：有错误（运行失败、连接失败、超出预算）红、只有待审批黄、其他主色；不显示数字（`U.23-R10`）。未读 = 时间晚于 `hx:inbox-read` 的条目。
- 点开 `InboxPanel`（`Popover` 宽 360，锚在铃铛下方右对齐）：打开时 `session.loadInbox()`（打开期间每 60 秒再拉一次）。
  - 头部：`Tabs`：全部 · 待我处理 · 动态（`U.09.05-R1`）；右侧"全部已读"（写 `hx:inbox-read = now`）和齿轮（`ui.openCenter('settings', 'notify')`）。
  - 待我处理：全部会话的 `approvals.groups`，每组一个 `ApprovalCard variant="compact"`（可以直接批准 · 驳回 · 在画布上看）；"在画布上看"→ `useLocate({sessionId, graphId, scope: scopeOfLoc(loc), nodes})`（点了就切过去，不再确认）。处理后条目自动移除；急停时全部移除（`U.09.05-R2`，数据层保证）。
  - 动态：`buildInbox` 的其余条目——运行完成 / 失败 / 急停（"「{会话名}」的运行 #12 失败于「决策者」"，点击 → `switchSession` + `run.focus(id)` + `setRs(true, 'mon')`）、MCP 服务或模型连接失败（点击 → `openCenter('packages', id)` / `openCenter('connections', id)`）、预算提醒（点击 → `openCenter('settings', 'budget')`）。
  - 空：一行 `text-3`"没有新的通知"。
- 按类关闭（`U.09.05-R3`）：`notify.<类别>=false` 的条目不出现、不点亮圆点；待审批关闭只影响通知中心，对话里的审批卡片和画布节点上的按钮照常。
- 系统桌面通知：`notify.desktop=true` 且 `Notification.permission === 'granted'` 且页面不可见时，新的待审批和运行结束各发一条 `new Notification(标题, {body, tag: 条目 ID})`；点击通知 → `window.focus()` 并按上面的点击行为处理。本文不请求授权（授权按钮在设置页，`W.09.02`）。

### 6.9 读屏播报（`LiveRegion`，`U.16-R5`）
- 两个视觉隐藏的区域：`aria-live="polite"` 和 `aria-live="assertive"`；`useAnnounce(text, p)` 先清空再在下一帧写入（同一句话连续播报两次也能读出）。急停用 assertive，其余 polite。
- 其他叶子（`W.07.01` 急停、模型胶囊，`W.07.04` 回复完成）都经这个 hook 播报，不各自建 `aria-live` 区域（画布引擎的 `div.hx-sr` 只用于画布内部的键盘操作说明，`W.06.09` §5）。

## 7. 不变量
- 全前端只有 `ReleaseEstopDialog` 的确认按钮能调用 `releaseEstop`；没有任何自动路径（INV-10、`W-R6`）。
- 急停横幅在急停期间始终可见（`/welcome` 除外），且总在横幅区的第一位。
- 冲突框打开期间只能通过两个按钮关闭。
- 通知中心的圆点不显示数字；关闭的类别不点亮圆点。
- 同一问题不会同时出现在横幅和提示里。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `releaseEstop` 失败 | 确认框里红字写原因，不关闭；横幅保持 |
| `loadInbox` 失败 | 动态标签显示"没能加载通知 · 重试"；待我处理照常（来自活动刷新） |
| 撤销 AI 修改中途失败 | 停下，提示原因，已撤销的保持 |
| `Notification` 不可用或被拒绝 | 不发桌面通知，不提示 |
| `hotpatch` 失败（409 已过时） | 提示"这处修改已经过时"，关闭那条提示 |

## 9. 性能与资源
- `ModelEditToast` 只订阅 `change`，合并后 1.5 秒发一次提示；模型连续修改 100 处只产生 1 条提示。
- 通知中心只在打开时拉"动态"；关闭期间圆点来自已有数据（活动刷新每 5 秒的待审批 + 上次拉到的动态）。
- 提示堆叠最多同时渲染 4 条。

## 10. 验收标准
1. 按急停：横幅立即出现并被读屏播报；点"解除急停"弹确认框，确认后横幅消失、档位仍是 0；全局搜索代码，只有 `ReleaseEstopDialog.tsx` 里有 `releaseEstop`（`U.19.04`、INV-10）。
2. 断开服务：3 秒内没有横幅；3 秒后黄色"正在重连…"；30 秒后变为"Harness 已关闭"+"刷新"；恢复后变绿"已重新连接"，2 秒后消失（`U.14.05`）。
3. 档位 3 下 AI 一次改了 5 处：只出现一条"AI 修改了 5 处 · 查看 · 全部撤销"；"全部撤销"后 5 处都恢复（`U.12` §4）。
4. 两个标签页改同一参数：后提交的一方弹冲突框，`Esc` 关不掉；"保留我的"后两边一致（`W.05` §10 验收 2）。
5. 会话 A 运行请求审批时在会话 B：铃铛出现黄色圆点（不显示数字）；通知中心"待我处理"里能直接批准，批准后条目消失、圆点熄灭（`U.09.05`）。
6. 运行失败后铃铛圆点为红色；"动态"里点这一条切到对应会话的监控页。
7. 设置里关闭"运行"类通知后，运行完成不再点亮圆点。
8. 提示：普通提示 4 秒消失、悬停时不消失；错误提示不自动消失；同时最多 4 条。
9. 窗口 < 760 出现窄屏提示，可关闭；进入子图库引用的子图出现子图库内容提示。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/notice/ToastStack.tsx`、`BannerStack.tsx`、`EstopBanner.tsx`、`NetBanner.tsx`、`LibraryRefBanner.tsx`、`NarrowBanner.tsx`、`ReleaseEstopDialog.tsx`、`ConflictDialog.tsx`、`InboxButton.tsx`、`InboxPanel.tsx`、`InboxItem.tsx`、`ModelEditToast.tsx`、`LiveRegion.tsx`，每个同名 `.css`（`ModelEditToast` 除外）、`.test.tsx`；`web/src/panels/notice/useAnnounce.ts`、`inbox.ts` 及同名 `.test.ts`；`web/tests/e2e/notice.spec.ts`。
- 不许碰的文件：`web/src/state/`（`Toast.actions`、`opIds`、`inbox` 由 `W.03` 实现）、`web/src/ops/`、`web/src/lib/protocol/`（`W.04.05` 写 `ui.net`）、其他 `panels/` 目录、`design/tokens.css`、`web/eslint.config.js`（`releaseEstop` 的限制规则由 `W.03.05` 加）。
- 函数签名：见 §4。
- 测试用例：
  - `W0710-T1 提示计时`：`info` 4 秒后 `dismiss`；悬停 10 秒不消失、离开后 4 秒消失；`error` 不自动消失；第 5 条排队
  - `W0710-T2 AI 修改合并`：同一 `groupId` 三批 remote change（共 5 个 opIds）间隔 0.5 秒 → 1.5 秒后 1 次 `notify`，文案"AI 修改了 5 处"；不同 `groupId` → 2 条
  - `W0710-T3 全部撤销`：`opIds=[a,b,c]` → `revertOp(c)`、`(b)`、`(a)`；`b` 失败 → 不发 `a`
  - `W0710-T4 急停横幅`：`estop.global=true` → 横幅 + assertive 播报；只有 `runIds` → 不显示
  - `W0710-T5 解除确认`：点"解除急停"→ 确认框；取消 → 不调用；确认 → `releaseEstop` 1 次；失败 → 红字、不关闭
  - `W0710-T6 releaseEstop 只在一处`：lint 反例（`InboxPanel.tsx` 里调用）报错（与 `W0305-T15` 联合）
  - `W0710-T7 离线横幅`：`net` 依次为 `reconnecting` → `down` → `online` → 文案依次变化，`online` 后 2 秒消失；`closed` → 不显示
  - `W0710-T8 冲突框`：`conflict` 有两项 → 两行，`theirsBy='model'` 写"AI"；`Esc` 不关闭；"保留我的"→ `resolveConflict('mine')`
  - `W0710-T9 unreadDot`：有失败运行 → `danger`；只有审批 → `wait`；只有完成运行 → `accent`；全部早于 `readAt` → null
  - `W0710-T10 buildInbox`：`notify.run=false` → 没有运行条目；按时间倒序
  - `W0710-T11 通知中心动作`：运行条目点击 → `switchSession`、`run.focus`、`setRs(true,'mon')`；审批"在画布上看"→ `useLocate` 带 `sessionId`
  - `W0710-T12 桌面通知`：`desktop=true`、权限 granted、页面隐藏、新审批 → `Notification` 1 次；页面可见 → 0 次
  - `W0710-T13 运行中改图提示`：`pendingPatches` 新增 1 条 → sticky 提示带"应用""不应用"；点"应用"→ `hotpatch(id,'confirm')`
  - `W0710-T14 播报`：`useAnnounce('x')` 两次 → 区域内容被清空再写入两次
  - `W0710-T15 端到端`：§10 验收 1、2、5（Playwright，`--fake-llm`，模拟断开）
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R14）；另：除确认按钮外任何地方不调用 `releaseEstop`；解除急停不提供"不再提示"；通知中心不显示数字；冲突框不能用 `Esc` 关闭；不在本文请求桌面通知权限。
- 完成标志：`G.14` 全部条件；§10 九条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 8 棒；`P.09` K114、K115、K117 |
| 2026-11-23 | §4.2 设置项名已定稿（K142），改用 `settingOf` 读 | 第 9 棒写 `W.09.02`；`P.09` K142 |
