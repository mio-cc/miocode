# W.03.03 ui store

| 项 | 内容 |
|---|---|
| 编号 | W.03.03 |
| 类型 | 实施 |
| 上级 | W.03 状态层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设18 §3.2（`ui` 一节）；demo `设计规范_v0.3/src/22_state.js`（`sel`、`tool`、`focus`）；demo v0.5 `32_sessions.js`（切换会话保存 / 恢复选中）、`39_monitor.js`（筛选记住）；`W.02.02` §4.2（`ShellLayout`） |
| 最后修改 | 2026-11-23 |

## 1. 职责
整个应用唯一的一份界面状态：外壳布局（收编 `W.02.02` 的 `ShellLayout`，不另起一套）、每个会话各自的画布选中、当前工具、列表视图、监控页筛选、中心窗口、与服务的连接状态、提示队列。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 布局怎么摆、断点怎么算、`fitInsets` 怎么量 | `W.02.02`（它调用本 store 的 action） |
| 选中怎么产生（单击、框选、Tab） | `W.06.07`、`W.06.09` |
| 提示怎么显示、几秒消失、通知中心的内容 | `W.07.10` |
| 主题 | `W.02.03`（`themeController`，不进本 store） |
| 悬停、正在编辑的文字等组件内部临时状态 | 组件自己（`G.06.02-R1`） |
| 判断服务是否断开 | `W.04.05`（它写 `net`） |

## 3. 继承的上级约束
`W.03` §4.1、§6.4；`G.06.02-R1`、`R2`、`R3`、`R7`；`W.02.02` §4.2、§6.4；`U.09.02`（R1、R2、R6）；`U.09.03`；`U.09.04` §2（选中只在本次打开页面期间保留；全局一栏不随会话切换）；`U.13.01`（R1、R2、R3）；`U.09.07-R1`；`U.16`（列表视图）；`U.14.05`（断开时画布只读）；`U.21`（中心窗口四个分区）；`C.10-R5`（附带选中最多 50 个）。

## 4. 接口
```ts
// web/src/state/uiStore.ts
import type { Ulid } from '@/lib/protocol';
import type { Scope, SelectionKey, ReadonlyStore } from './types';

// —— W.02.02 §4.2 原样收编 ——
export type ShellLayout = {
  lsOpen: boolean;  rsOpen: boolean;  rsTab: 'insp' | 'chat' | 'mon';
  lsFold: Record<'sess' | 'tree' | 'lib', boolean>;
  focus: null | { ls: boolean; rs: boolean };
  bp: 'xl' | 'lg' | 'md' | 'sm' | 'xs';
  fitInsets: { top: number; right: number; bottom: number; left: number };
};
export type CanvasSelection = {
  scope: Scope;                          // 选中只在这一层内（U.13.01-R1）
  nodeIds: readonly Ulid[];              // 按选中先后排序；第一个是"主选中"，属性页多选时以它为锚
  edgeIds: readonly Ulid[];
  noteIds: readonly Ulid[];
};
export type MonitorPrefs = { range: 'session' | 'all'; status: 'all' | 'running' | 'pending' | 'failed' | 'done' };
export type CenterSection = 'packages' | 'connections' | 'library' | 'settings';
export type NetState = 'online' | 'reconnecting' | 'down' | 'closed';   // W.04.05 §6.1：中断 < 3 秒仍是 online；≥ 3 秒 reconnecting；≥ 30 秒 down；401 后 closed（不再重连）
export type Toast = {
  id: string; level: 'info' | 'ok' | 'wait' | 'error' | 'model';
  text: string; detail?: string;                       // 已经是翻译后的文案（W.10）
  action?: { label: string; run: () => void };         // 例："撤销"
  groupKey?: string;                                   // 同一 groupKey 的新提示替换旧的（"AI 修改了 N 处"）
};
export type UiState = {
  layout: ShellLayout;
  selections: ReadonlyMap<SelectionKey, CanvasSelection>;
  tool: 'select' | 'pan';
  listView: boolean;
  monitor: MonitorPrefs;
  center: null | { section: CenterSection; item?: string };
  net: NetState;
  toasts: readonly Toast[];
};
export type UiActions = {
  // 布局（语义见 W.02.02 §6.4）
  setLs(open: boolean): void;
  setRs(open: boolean, tab?: ShellLayout['rsTab']): void;
  toggleFocus(): void;
  setLsFold(sec: keyof ShellLayout['lsFold'], folded: boolean): void;
  setBp(bp: ShellLayout['bp']): void;
  setFitInsets(i: ShellLayout['fitInsets']): void;
  // 选中
  select(key: SelectionKey, sel: CanvasSelection): void;
  clearSelection(key: SelectionKey, scope?: Scope): void;          // scope 缺省 = 保持原层
  pruneSelection(key: SelectionKey, alive: (kind: 'node' | 'edge' | 'note', id: Ulid) => boolean): void;
  dropSelection(key: SelectionKey): void;                          // 会话被删除时
  // 其他
  setTool(t: UiState['tool']): void;
  setListView(on: boolean): void;
  setMonitor(p: Partial<MonitorPrefs>): void;
  openCenter(section: CenterSection, item?: string): void;
  closeCenter(): void;
  setNet(n: NetState): void;
  notify(t: Omit<Toast, 'id'>): string;                            // 返回 id
  dismiss(id: string): void;
};
export type UiStoreApi = ReadonlyStore<UiState> & { actions: UiActions };
export function createUiStore(o: { width: number; storage?: Storage }): UiStoreApi;

// 派生（纯函数）
export function selectionOf(s: UiState, key: SelectionKey | null): CanvasSelection | null;
export function rsDot(s: UiState, key: SelectionKey | null): boolean;      // 右栏收起且有选中：右栏开关显示小圆点（U.09.02-R1）
export function attachable(sel: CanvasSelection | null): { nodeIds: readonly Ulid[]; truncatedFrom?: number };   // 发消息附带：最多 50 个（C.10-R5）
export function canvasReadonly(s: UiState): boolean;                       // net ≠ online 时画布只读（U.14.05）
```

### 4.1 依赖
无其他模块。外壳（`W.02.02`）、`W.02.04` 的快捷键处理函数、`W.06` 画布引擎、`W.07` 面板、`W.04.05` 调用 action。

## 5. 数据结构
### 5.1 持久化（localStorage，`G.06.02-R7`）
| 字段 | 键 | 值 | 缺省 |
|---|---|---|---|
| `layout.lsOpen` | `hx:ls-open` | `"1"` / `"0"` | `"1"`；创建时 `width < 900` 且没有记录时为 `"0"`（`U.09.03`） |
| `layout.rsOpen` | `hx:rs-open` | `"1"` / `"0"` | `"0"` |
| `layout.rsTab` | `hx:rs-tab` | `insp` / `chat` / `mon` | `insp` |
| `layout.lsFold` | `hx:ls-fold` | JSON `{"sess":false,"tree":false,"lib":true}` | 全部展开，节点库折叠 |
| `listView` | `hx:list-view` | `"1"` / `"0"` | `"0"` |
| `monitor` | `hx:mon` | JSON `{"range":"session","status":"all"}` | 同左（`U.09.07-R1`） |
不持久化：`focus`、`bp`、`fitInsets`、`selections`（只保留本次打开页面期间，`U.09.04` §2）、`tool`、`center`、`net`、`toasts`。

### 5.2 选中的键
`SelectionKey` 为会话 ID（主画布），回放页为 `replay:<运行 ID>`；预览浮层没有键（不能选中，`U.13.06-R1`）。工作区被释放（`W.03.05` §6.6）时选中**不**清除，所以第 6 个会话挤掉的会话再打开时选中仍能恢复。

## 6. 行为
### 6.1 布局
`setLs`、`setRs`、`toggleFocus` 的结果和 `W.02.02` §6.4 的表一致：
- 专注模式中调用 `setLs(true)` 或 `setRs(true)`：先退出专注（`focus = null`），再只打开那一侧（`U.09.02` §3）。
- `toggleFocus`：`focus === null` → 记下 `{ls: lsOpen, rs: rsOpen}`，两侧收起；否则恢复记下的值。专注期间收起状态不写 localStorage（刷新后回到进入专注前的状态）。
- `setRs(true)` 不带 `tab` 时用上次的标签页；带 `tab` 时同时切换并写 `hx:rs-tab`。
- `setBp`、`setFitInsets` 值不变时不 `set`（`ResizeObserver` 可能重复报告相同尺寸，避免无谓的渲染）。

### 6.2 选中
| 调用 | 效果 |
|---|---|
| `select(key, sel)` | 整体替换这个键的选中；各数组去重；`sel` 与当前值相同（同层、同顺序同内容）时不 `set` |
| `clearSelection(key, scope)` | 换成空选中；给了 `scope` 时同时换层（进入 / 返回子图时由 `W.06.13` 调用，`U.13.01-R1`；返回时它随后再 `select` 刚离开的容器节点） |
| `pruneSelection(key, alive)` | 去掉已经不存在的节点、连线、便签；什么都没去掉时不 `set`。工作区在图变化（`change.scopes` 或 `nodes` 涉及删除）和切回会话时调用（`U.09.04` §2"节点已不存在则忽略"） |
| `dropSelection(key)` | 删除这个键（会话被删除） |
- 选中不跨层：`select` 传入的 `scope` 与当前选中的 `scope` 不同，等于换层后的新选中，原来那层的选中丢弃。
- 选中数量不设上限（`Ctrl+A` 可以选中整层）；发消息时由 `attachable` 截成前 50 个并给出原数量（`C.10-R5`）。

### 6.3 提示
- `notify` 追加到 `toasts` 末尾；带 `groupKey` 且已有同键的提示时原地替换（保持位置，换内容和 id）。
- 队列最多 20 条，超出时丢最旧的；显示几条、多久消失由 `W.07.10` 决定，到时它调 `dismiss`。
- `text` 必须是 `W.10` 取出的文案；store 不拼接文案。

### 6.4 其他
- `openCenter` 在 `center` 已打开时只切换分区；`closeCenter` 置 null（`Ctrl+,` 的处理函数在 `W.02.04` 注册，调这两个 action）。
- `setNet`：值不变不 `set`。`net !== 'online'` 时 `canvasReadonly` 为 true，画布引擎和属性页据此禁止编辑（`U.14.05` §2）。
- `setTool`：`tool.pan.hold`（按住 Space）由 `W.06.09` 自己处理临时平移，不改 `tool`。

## 7. 不变量
- 整个应用只有一份 ui store，由 `createAppStores` 创建（`W.03` §4.2）；不随会话切换（`U.09.04` §2"全局"一栏）。
- 每个 `CanvasSelection` 的三个数组无重复。
- 选中不写 localStorage；localStorage 里只有 §5.1 列出的键。
- 选中节点不会让 `rsOpen` 变化（`U.09.02-R1`）：本 store 没有任何"因为选中而打开右栏"的逻辑。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| localStorage 值非法（不是 `"0"`/`"1"`、JSON 解析失败、标签页名不认识） | 用缺省值，不覆盖原值，直到用户下一次修改 |
| localStorage 不可用 | 全部用缺省值，修改只在内存生效 |
| `select` 传入 `key=null`（预览浮层误调用） | 开发模式抛错，生产模式忽略 |

## 9. 性能与资源
- 每个 action ≤ 0.1ms；值不变不 `set`（§6.1、§6.2、§6.4）。
- 框选过程中的实时预览不写本 store（引擎的叠加层自己画），只在松手时 `select` 一次，所以拖动框选期间 React 提交为 0（`U.17-R10`）。

## 10. 验收标准
1. `W.02.02` §10 验收 6（刷新后左栏开合、分区折叠、右栏开合和标签页保持）用本 store 通过；`W0202-T3`（专注模式）通过。
2. 会话 A 选中 3 个节点 → 切到 B 选中 1 个 → 切回 A：A 恢复 3 个选中；其中 1 个在 B 期间被删掉了时，恢复为 2 个（`U.09.04` §2）。
3. 进入子图时选中清空；返回时只选中刚离开的容器节点（`U.13.01-R1`）。
4. 右栏收起、有选中时右栏开关有小圆点；打开右栏后小圆点消失；选中节点不自动打开右栏（`U.09.02-R1`）。
5. 选中 60 个节点后发消息：附带 50 个并注明原有 60 个（`C.10-R5`）。
6. 断开服务 3 秒以上：画布不能拖动、属性页不能编辑；恢复后可以（`U.14.05`）。

### 实施卡
- 要建 / 要改的文件：`web/src/state/uiStore.ts`、`web/src/state/uiStore.test.ts`。
- 不许碰的文件：`web/src/shell/`（`W.02.02` 只调用本 store）、`web/src/canvas/`、`web/src/panels/`、`web/src/lib/`。
- 函数签名：见 §4。
- 测试用例（内存 `Storage` 假实现）：
  - `W0303-T1 缺省值`：空存储、宽 1440 → `lsOpen=true`；空存储、宽 800 → `lsOpen=false`；已有 `hx:ls-open="1"`、宽 800 → `true`
  - `W0303-T2 非法值`：`hx:rs-tab="xyz"`、`hx:ls-fold="{"` → 缺省值；原值不被改写
  - `W0303-T3 专注模式`：同 `W0202-T3`；专注中刷新（新建 store）→ 回到进入专注前的开合
  - `W0303-T4 选中按会话分开`：§10 验收 2
  - `W0303-T5 跨层替换`：在 root 选中 2 个后 `select(key, {scope: X, …})` → 只剩 X 层的选中
  - `W0303-T6 相同值不 set`：同一个选中 `select` 两次 → 订阅回调 1 次；`setBp` 同值 → 0 次
  - `W0303-T7 小圆点`：§10 验收 4 的三种组合
  - `W0303-T8 附带上限`：60 个 → 50 个 + `truncatedFrom=60`；30 个 → 30 个、无 `truncatedFrom`
  - `W0303-T9 提示`：同 `groupKey` 替换；第 21 条挤掉第 1 条
  - `W0303-T10 选中不持久化`：选中后新建 store → `selections` 为空；localStorage 里没有选中相关的键
  - `W0303-T11 只读`：`setNet('reconnecting')` → `canvasReadonly=true`
  - `W0303-T12 存储不可用`：`getItem` 抛错 → 缺省值，action 照常
- 允许使用的依赖：`zustand`；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部；另：不在选中变化时打开右栏；不持久化选中；不在本 store 里拼接界面文案；不另建一套布局状态（`ShellLayout` 只在这里）。
- 完成标志：`G.14` 全部条件；§10 六条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `NetState` 注释写明四个值的含义 | `P.09` K91 |
