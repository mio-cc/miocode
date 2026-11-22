# W.03.02 view store

| 项 | 内容 |
|---|---|
| 编号 | W.03.02 |
| 类型 | 实施 |
| 上级 | W.03 状态层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设18 §1.3（`view` 单独成 store，只给渲染层用）；demo `设计规范_v0.3/src/22_state.js`（`S.view {x, y, k}`）；demo v0.5 `32_sessions.js`（切换会话保存 / 恢复 `view`）；`U.09.04` §2、`U.13.06` §4（`P.09` K75）；`U.17-R9`、`R10` |
| 最后修改 | 2026-11-23 |

## 1. 职责
保存一个画布实例的当前层和平移缩放：按层记住视图，进入、返回、切换会话、刷新后恢复；写进 localStorage；给 React 提供节流后的缩放百分比。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 平移、缩放的交互和 `transform` 写入；"适应画布""聚焦节点"的计算；侧栏收展时的平移补偿 | `W.06.02`（引擎算好后写回本 store） |
| 决定当前层（URL 是唯一来源） | `W.02.01` → 工作区 `setLocation`（`W.03.05`）→ 本 store 的 `enterScope` |
| 进入 / 返回的转场动画 | `W.06.13` |
| 视图进图文档、产生 Op | 不做：视口不进图文档（`C.02.05` §2、`P.09` K14） |

## 3. 继承的上级约束
`W.03` §4.1、§6.4、§6.5；`G.06.02-R1`、`R2`（K76：view store 是"每个画布实例一份"的那部分）、`R4`、`R7`；`W-R2`；`C.02.05` §2；`U.09.04` §2（K75）；`U.13.06` §4；`U.10.01-R5`（缩放 0.2–2.5）；`U.17-R9`、`R10`。

## 4. 接口
```ts
// web/src/state/viewStore.ts
import type { Ulid } from '@/lib/protocol';
import type { Scope, ReadonlyStore } from './types';

export type View = { x: number; y: number; k: number };     // 屏幕坐标 = 世界坐标 × k + (x, y)
export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 2.5;                                // U.10.01-R5

export type ViewState = {
  graphId: Ulid;
  scope: Scope;
  view: View;
  needsFit: boolean;          // true：这一层没有记录，引擎挂载或切层后先"适应画布"，再调 markFitted
  zoomPct: number;            // Math.round(k × 100)，缩放停下 150ms 后才更新（给 React；缩放过程中不更新，U.17-R10）
};
export type ViewActions = {
  setView(v: View): void;               // 引擎在一帧处理完后调用；只改内存
  markFitted(v: View): void;            // 适应画布后写回：setView + needsFit=false
  enterScope(scope: Scope): void;       // 记下当前层的视图，切到新层：有记录就恢复，否则 needsFit=true
  flush(): void;                        // 立即写 localStorage（切走会话、页面隐藏、卸载前）
  dispose(): void;                      // flush + 移除监听和定时器
};
export type ViewStoreApi = ReadonlyStore<ViewState> & { actions: ViewActions };

export function createViewStore(o: {
  graphId: Ulid;
  scope: Scope;
  persist: boolean;                     // 主画布 true；预览浮层、回放画布 false
  storage?: Storage;                    // 缺省 window.localStorage；测试注入
  now?: () => number;
}): ViewStoreApi;

// web/src/state/hooks.ts（W.03 §4.2）
export function useZoomPercent(): number;   // 读 zoomPct；停靠栏的缩放显示用
```

### 4.1 依赖
无其他模块。由工作区（`W.03.05`）为主画布创建；`W.06.13` 打开预览浮层时用 `persist:false` 另建一份；`W.09.05` 回放页同样。

## 5. 数据结构
### 5.1 localStorage
- 键：`hx:view:<图 ID>:<层>`，层写 `root` 或容器节点 ID（`U.09.04` §2，K75）。
- 值：`{"x":-120.5,"y":40,"k":0.8,"t":1764000000000}`；`t` 是写入时间（毫秒），用于清理。
- 最多保留 300 条：写入一个**新**键之后，如果 `hx:view:` 开头的键超过 300 条，按 `t` 删掉最旧的 50 条。

### 5.2 内存
每个 store 实例自己有一张 `Map<Scope, View>`（不放进 zustand 状态，不通知任何人），记这个画布实例里每层最后的视图。

## 6. 行为
### 6.1 读记录
`recall(scope)`：先查内存 Map；没有且 `persist=true` 时读 localStorage。读到的值必须满足：`x`、`y`、`k` 都是有限数、`|x|`、`|y|` ≤ 10⁷、`k` 在 `[ZOOM_MIN, ZOOM_MAX]` 内；不满足就当没有记录（不修正、不报错）。

### 6.2 状态变化
| 调用 | 效果 |
|---|---|
| 创建 | `view = recall(scope)`；没有 → `view = {x:0, y:0, k:1}`，`needsFit = true` |
| `setView(v)` | `k` 夹到 `[ZOOM_MIN, ZOOM_MAX]`；写 `view`、内存 Map；安排写盘（§6.3）；`round(k×100)` 变了就安排更新 `zoomPct`：150ms 内没有新的 `setView` 才写（防抖，和 `U.17-R9` 的"停止 120ms 后恢复"同一思路），所以连续缩放期间 React 提交为 0 |
| `markFitted(v)` | 同 `setView`，并 `needsFit = false` |
| `enterScope(s)` | `s === scope` 时什么都不做；否则：把当前 `view` 记进 Map 并立即写盘 → `scope = s` → `recall(s)`：有 → `view` = 记录、`needsFit=false`；没有 → `needsFit = true`（`view` 保持不变，等引擎适应画布） |
| `flush()` | 有待写的视图时立即写 |
| `dispose()` | `flush()`，清理定时器和 `visibilitychange` 监听；之后再调用任何 action 都无效 |

### 6.3 写盘
- `persist=false` 时从不读写 localStorage。
- 写盘在最后一次 `setView` 之后 500ms 进行（防抖）；`enterScope`、`flush`、页面 `visibilitychange` 变为 `hidden`、`pagehide` 时立即写。
- `localStorage` 抛错（隐私模式、配额满）时吞掉，本次会话里不再尝试写盘，只用内存。

### 6.4 引擎怎么用
```ts
const v = view.getState();
if (v.needsFit) engine.fit().then((nv) => view.actions.markFitted(nv)); else engine.applyView(v.view);
view.subscribe((s) => s.view, (nv) => engine.applyView(nv));      // 只有 store 被别人改时才会触发（例如切层恢复）
// 拖动画布、滚轮缩放：引擎先改自己的 transform，帧末再 view.actions.setView(…)；applyView 对相同的值什么都不做
```

## 7. 不变量
- `view.k` 始终在 `[0.2, 2.5]`。
- 除 `zoomPct` 外，没有任何 React 组件订阅本 store（没有 `useViewStore`）。
- 平移、缩放不发请求、不产生 Op、不改图版本（`C.02.05` §2）。
- `persist=false` 的实例不碰 localStorage。
- 切层之前离开的那一层的视图一定已经写进内存 Map（持久化实例还写进 localStorage）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| localStorage 值不是 JSON、字段缺失、越界 | 当作没有记录：`needsFit = true` |
| localStorage 不可用或写入抛错 | §6.3 最后一条 |
| `setView` 收到 `NaN` / `Infinity` | 忽略这一次，开发模式 `console.error` |

## 9. 性能与资源
- `setView` ≤ 0.05ms，不分配新的 Map；`zoomPct` 每次缩放手势结束只更新 1 次。
- 每次写盘 ≤ 1ms；清理（扫描 `hx:view:` 键）只在写入新键时做，≤ 5ms（300 条）。
- localStorage 占用 ≤ 300 × 80 字节。

## 10. 验收标准
1. 在会话 A 的第 3 层平移缩放后切到 B 再切回 A：视图与离开前一致（`U.09.04` §5 验收 2）。
2. 刷新页面后停留在同一层且视图恢复；从未到过的层打开时"适应画布"（`U.13.06` §6 验收 3，K75）。
3. 进入子图再返回：上一层恢复到离开前的位置（`U.13.06` §4）。
4. 连续平移、缩放 5 秒（每帧 `setView`）：期间 React Profiler 提交次数为 0；停下后缩放百分比更新 1 次、localStorage 写 1 次（`U.17-R10`）。
5. 预览浮层的平移缩放不影响主画布，也不写 localStorage。

### 实施卡
- 要建 / 要改的文件：`web/src/state/viewStore.ts`、`web/src/state/viewStore.test.ts`；`web/src/state/hooks.ts` 里只加 `useZoomPercent`（hooks 文件的其余部分归 `W.03.05`）。
- 不许碰的文件：`web/src/canvas/`（引擎的 `fit`、`applyView` 在 `W.06.02`）、`web/src/lib/protocol/`、`web/src/state/` 的其他 store。
- 函数签名：见 §4。
- 测试用例（用内存 `Storage` 假实现和假时钟）：
  - `W0302-T1 内存恢复`：root 设视图 → `enterScope(A)` → `enterScope('root')` → 视图恢复，`needsFit=false`
  - `W0302-T2 跨实例恢复`：实例 1 写入后 `dispose` → 新建实例 2（同图同层）→ 视图相同
  - `W0302-T3 非法记录`：值为 `"abc"`、`{"x":1}`、`k=9`、`x=1e9` → `needsFit=true`
  - `W0302-T4 防抖写盘`：1 秒内 60 次 `setView` → 停下 500ms 后只写 1 次；`enterScope` 立即写
  - `W0302-T5 清理`：预置 300 条记录后写一个新键 → 剩 251 条，删掉的是 `t` 最小的 50 条
  - `W0302-T6 zoomPct 防抖`：1 秒内每 16ms 改一次 `k` → 期间 `zoomPct` 订阅回调 0 次，停下 150ms 后 1 次且值正确；只改 `x` 时 0 次
  - `W0302-T7 不持久化`：`persist:false` 时 `Storage` 的 `getItem` / `setItem` 调用次数为 0
  - `W0302-T8 存储抛错`：`setItem` 抛 `QuotaExceededError` → 不抛出，之后不再调用 `setItem`，内存恢复照常
  - `W0302-T9 页面隐藏`：派发 `visibilitychange`（hidden）→ 立即写盘
  - `W0302-T10 夹紧`：`setView({k: 5})` → `k=2.5`；`setView({x: NaN})` → 忽略
- 允许使用的依赖：`zustand`；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部（特别是 R25）；另：不提供通用 React hook；不把视图写进图文档或任何请求；不在 localStorage 存视图以外的东西。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。
