# W.06.11 自动布局

| 项 | 内容 |
|---|---|
| 编号 | W.06.11 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo `设计规范_v0.3/src/23_geom.js`（`topoLevels`、`layout`）；demo v0.5 `26_keys.js`（`autoLayout`：位移动画后记为一条 move op，超过 12 个节点每行 6 层）；`P.09` K102、K106 |
| 最后修改 | 2026-11-23 |

## 1. 职责
"整理布局"（`L`、停靠栏按钮、右键菜单、对话框 `/整理布局`）：把当前层的节点（或选中的节点）按数据流方向分层排好，播放一段位移动画，然后用一次 `move_nodes` 提交（`cmd.tidy`）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 节点尺寸 | `W.06.10`（本文只读 `geom.shape` / `geom.box`） |
| 快捷键 `L` 的注册、停靠栏按钮、菜单项 | `W.06.09`（经 `cmd.exec('layout.tidy')`）、`W.07.06`、`W.07.11` |
| 对话框里的 `/整理布局` 命令解析 | `W.07.07`（调 `cmd.tidy()`，不发给编排者） |
| 后端给模型新加的节点定坐标 | `E.17.02`（`U.05-R6`；与本文共用 `layout.yaml`，算法不同） |
| 撤销 | `W.05`（一次 `dispatch` = 一组，`Ctrl+Z` 一次撤回） |
| 便签的位置 | 不动（便签是用户自己摆的说明） |

## 3. 继承的上级约束
`W.06` §4.2（`cmd.tidy`）、§6.5、§6.6、`W.06-R3`、`R7`；`W.06.07` §6.3 第 7 步（`ctx.live` 的清空规则）；`U.05-R3`、`R4`；`U.13.04` §2（`L`）；`U.13.05` §1；`U.09.01` ③a；`U.07.01`；`U.07.04` §2；`U.10.02` §1（`frozen` 不可移动）；`C.02.05`（整数坐标）；`C.03.03-R5`；`C.05-R3`；INV-06；`P.09` K102、K106。

## 4. 接口
```ts
// web/src/canvas/core/layout/layered.ts —— 纯函数
export type LayoutNode = { id: Ulid; w: number; h: number; y0: number };     // y0：原来的 y，用于同层排序的初值
export type LayoutEdge = { from: Ulid; to: Ulid };
export type LayoutOpts = { gapX: number; gapY: number; band: number; cols: number };
export function layered(nodes: readonly LayoutNode[], edges: readonly LayoutEdge[], o: LayoutOpts): Map<Ulid, Pt>;   // §6.2；结果以 (0,0) 为左上角
export function optsFor(count: number): LayoutOpts;     // LAYOUT.tidy：count > wrap_over → cols = wrap_cols，否则不换行

// web/src/canvas/core/layout/tidy.ts
export const TIDY_MIN = 2;                              // 少于 2 个节点不整理
export function createTidy(ctx: EngineCtx): { tidy: EngineCommands['tidy']; busy(): boolean; finish(): void; dispose(): void };
```
`cmd.tidy(ids?)`：`ids` 有 ≥ 2 个节点时只整理它们，否则整理当前层全部节点；返回那一次 `dispatch` 的结果。

### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`geom`、`live`、`nodes.moveEl`、`edges.updateFor`、`frame`、`doc().ops`、`deps.theme`、`deps.t`、`deps.ui.actions.notify`、`pointer`）；`W.03.01` 的 `nodesIn`、`edgesIn`；`W.06.10` 的 `LAYOUT.tidy`；`@/lib/protocol` 的 `OpKind`。

## 5. 数据结构
- 布局参数：`schema/builtin/layout.yaml` 的 `tidy: { gap_x: 72, gap_y: 36, band: 96, wrap_over: 12, wrap_cols: 6 }`（`W.06.10` §5.1，与 demo 一致）。
- 动画状态（模块内部）：`anim: { from: Map<Ulid, Pt>; to: Map<Ulid, Pt>; t0: number; ms: number; resolve } | null`。

## 6. 行为

### 6.1 `tidy(ids?)`
1. 只读（`W.06` §6.6）→ 返回 `{status:'blocked', reason:'readonly'}`。正在拖动、框选、拖线（`pointer.mode() ≠ 'idle'`）→ 不处理，返回 `blocked`。上一次整理的动画还在播 → 先 `finish()`。
2. 集合：`ids` 里属于当前层的节点（≥ 2 个），否则当前层全部节点；去掉 `frozen` 的（`U.10.02` §1）。剩下 < `TIDY_MIN` → 不提交，提示"没有可以整理的节点"，返回 `{status:'applied', version: graph.serverVersion}`（什么都没改）。
3. 输入：每个节点 `geom.box(id)`（宽高含状态脚）；连线只取两端都在集合里的。
4. `pos = layered(...)`；整体平移到原集合包围盒的左上角，再 `geom.snap(…, true)`（结果是 20 的倍数，`U.05-R4`）。
5. 和原位置相同的节点去掉；全部相同 → 不提交，返回 `{status:'applied', version: graph.serverVersion}`。
6. 动画（§6.3），结束后一次 `ops.dispatch(move_nodes{moves})`（`C.05-R3`：一次整理 = 一组，撤销一次回到原样）。
7. 有 `frozen` 节点被跳过时提示"有 N 个冻结的节点没有移动"。

### 6.2 分层算法（`layered`，纯函数，确定性）
1. **分层**：Kahn 拓扑排序；每个节点的层号 = 所有前驱层号最大值 + 1，没有前驱的为 0。图里只有循环节点能成环，而循环体在子图里（INV-06），所以当前层没有环；万一有（无效图），剩下的节点放在最后一层之后一层。
2. **拉近源头**：没有前驱、但有后继的节点，层号改为"后继层号最小值 − 1"（不小于 0），避免资源、配方这类源头节点都堆在第 0 列（demo `layout`）。
3. **同层排序**：先按 `y0` 排；然后两轮重心法：从左到右按"前驱在上一层里的位置的平均值"重排，再从右到左按后继的平均值重排；没有前驱 / 后继的保持原顺序；相同重心按 `y0`、再按 ID 排（保证同样的输入得到同样的结果）。
4. **坐标**：第 `l` 层的 `x` = 前面各层的列宽之和，列宽 = 该层最宽节点 + `gapX`；同层从上到下 `y += h + gapY`。
5. **换行**：层数超过 `cols` 时，每 `cols` 层一段，下一段放在上一段最低点之下 `band` 处，`x` 从 0 重新开始（demo：节点多于 12 个时每段 6 层）。
6. 没有连线的孤立节点在第 0 层，按 `y0` 排在其他节点之后。

### 6.3 动画
- 时长 `--hx-t-4`、曲线 `--hx-ease-out`（与 `W.06.02` 一样在构造和 `motion` 变化时读一次）。每帧（`input` 阶段）按进度插值写 `ctx.live`，调 `nodes.moveEl`、`edges.updateFor`；`W.06-R3`：动画期间不写 store、没有 React 提交。
- 减少动效（`deps.theme.reducedMotion()` 或时长为 0）：直接跳到终点（`U.07.04` §2）。
- 动画中有 `pointerdown`、滚轮、按键：`finish()` 立即跳到终点并提交（`U.07.01-R4`：动画不阻塞操作）。
- 提交后 `ctx.live` 的清空按 `W.06.07` §6.3 第 7 步：graph store 到达最终位置或 `dispatch` 完成后清空；结果为 `rejected` / `dropped` / `blocked` → 立即清空，节点回到 store 的位置，提示由 `W.05` 负责。

### 6.4 与其他功能的关系
- 整理只改坐标（`move_nodes` 属于 `op.view`，档位 1 及以上不产生提议，`C.02.05-R4`）；不改连线、不改便签。
- 整理后不自动"适应画布"：用户按 `1` 或停靠栏按钮再适应（避免视图突然跳动）。
- 子图里的入口、出口节点没有特殊处理：入口没有前驱，自然在第 0 层；出口没有后继，自然在最后（不按类型名写分支）。

## 7. 不变量
- 一次 `tidy` 最多一次 `dispatch`，且只含 `move_nodes`。
- 结果坐标都是整数且是 `L.grid` 的倍数；`frozen` 节点的位置不变。
- 同样的节点、连线、尺寸和原位置，`layered` 得到同样的结果。
- 动画结束后 `ctx.live` 中本次整理的条目被清空（按 §6.3 的规则）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 只读、指针操作进行中 | 返回 `blocked`，不提示（停靠栏按钮本来就置灰） |
| 可整理的节点 < 2 | 提示"没有可以整理的节点"，不提交 |
| 当前层有环（无效图） | 按 §6.2 第 1 步处理，照常整理 |
| `dispatch` 结果为 `rejected` / `dropped` | 节点回到 store 的位置；提示由 `W.05` 负责 |
| 动画中当前层被整图替换或换层 | 取消动画、清空 `ctx.live`，不提交 |

## 9. 性能与资源
- `layered`：200 节点 300 连线 ≤ 5ms；1000 节点 ≤ 30ms（只在用户按下时算一次，不在帧任务里）。
- 动画每帧：200 个节点 `moveEl` + 相连连线 `d` ≤ 6ms（与拖动 20 个节点同级的路径，`W.06` §9）。

## 10. 验收标准
1. 示例图（`graph_loop.json`）乱放后按 `L`：节点按数据流从左到右分层排开，无重叠；动画结束后服务端只收到 1 次 `move_nodes`，操作历史 1 条，`Ctrl+Z` 一次回到原样。
2. 选中 3 个节点按 `L`：只有这 3 个移动，整理后的左上角与原来这 3 个节点的左上角相同。
3. 13 个以上节点的长链：每 6 层换一段。
4. 含 `frozen` 节点：它不动，提示"有 1 个冻结的节点没有移动"。
5. 打开减少动效：节点直接跳到新位置。
6. 整理动画中点击画布：立即到终点并提交，之后的点击照常生效。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/layout/layered.ts`、`tidy.ts`，以及 `layered.test.ts`、`tidy.test.ts`；`web/tests/e2e/canvas-tidy.spec.ts`。
- 不许碰的文件：`web/src/canvas/core/geom/`（只调用）、`render/`、`interact/`、`schema/`（`layout.yaml` 由 `W.06.10` 建）、`web/src/state/`、`web/src/ops/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0611-T1 分层`：A→B→C、A→C → 层号 0、1、2；资源节点只连到第 2 层 → 被拉到第 1 层
  - `W0611-T2 排序确定`：同一输入跑 10 次结果相同；交换输入数组顺序结果相同
  - `W0611-T3 重心`：两条平行链交叉连线 → 整理后交叉数为 0
  - `W0611-T4 列宽`：一层里有 `ui.width=400` 的节点 → 下一层的 `x` = 400 + 72
  - `W0611-T5 换行`：14 个节点的直链 → 第 7 个节点在第二段，`y` = 第一段最低点 + 96
  - `W0611-T6 有环兜底`：人为构造 A↔B → 不抛错，两者都有坐标
  - `W0611-T7 只整理选中`：选中 3 个 → 只有 3 条 `moves`，包围盒左上角不变；坐标都是 20 的倍数
  - `W0611-T8 frozen`：集合含 `frozen` 节点 → 它不在 `moves` 里；提示 1 次
  - `W0611-T9 一次提交`：假时钟播完动画 → `dispatch` 1 次，参数只有 `move_nodes`；动画期间 `dispatch` 0 次、`setView` 0 次
  - `W0611-T10 打断`：动画进行到一半调 `finish()` → 立即 `dispatch`，`ctx.live` 中的坐标是终点
  - `W0611-T11 减少动效`：`reducedMotion()=true` → 不申请动画帧，直接 `dispatch`
  - `W0611-T12 只读`：`readonly()=true` → `blocked`，不 `dispatch`
  - `W0611-T13 端到端`：§10 验收 1、2、6（Playwright，`harnessd --fake-llm`）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R6、R9、R25）；另：不移动便签；不在动画中 `dispatch` 或建手势；不按节点类型名决定位置；不在整理后自动改视图。
- 完成标志：`G.14` 全部条件；§10 六条验收通过。
