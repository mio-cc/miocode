# W.02.01 路由表

| 项 | 内容 |
|---|---|
| 编号 | W.02.01 |
| 类型 | 实施 |
| 上级 | W.02 应用外壳与路由 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引01 §3；`P.09` K27、K68；`U.13.06-R3`；`U.09.04-R7` |
| 最后修改 | 2026-11-27 |

## 1. 职责
定义前端全部路由、每条路由的解析规则，以及"进入层、返回、切换会话、切换图"和浏览器前进后退的对应关系。

## 2. 不做什么
- 不渲染页面内容（各页面归 `W.09`，会话页的内容归 `W.02.02` 外壳和 `W.07`）。
- 不实现进入 / 返回子图的转场和视图恢复（`W.06.13`）；本文只管 URL。
- 中心窗口、命令面板、预览浮层、右栏标签页的开合不进 URL（`G.06.02-R8`：URL 只放会话、图、层）。

## 3. 继承的上级约束
`G.06.02-R8`；`U.13.06-R3`、§4；`U.09.04-R7`；`C.10-R3`；`P.09` K27、K68。

## 4. 接口
### 4.1 路由表
| 路径 | 页面 | 解析规则 |
|---|---|---|
| `/` | 会话首页（`W.09.01` 的 `HomePage`） | 引导未完成 → 替换为 `/welcome`；有会话 → 替换为最近打开的会话（localStorage `hx:last-session`，不存在时取会话列表第一项）的 `/c/:sessionId`；没有会话 → 留在 `/`，显示第一次打开的空状态（`U.14.02`） |
| `/welcome` | 首次引导（`W.09.03`） | 引导已完成 → 替换为 `/` |
| `/c/:sessionId` | 会话页 | 会话有当前图 → 替换为 `/c/:sessionId/g/:activeGraphId`，带上 `?scope=` = `last_location.scope`（是 `root` 时省略）；没有图 → 留在本路径，画布显示"空白画布"空状态（`U.14.02`） |
| `/c/:sessionId/g/:graphId` | 会话页 | 查询参数 `scope`：省略 = 根图；否则为当前层的容器节点 ID（K68）。`graphId` 不属于这个会话 → 替换为 `/c/:sessionId`；`scope` 在图里不存在 → 替换为根图并提示"那一层已经不存在了" |
| 其他 | — | 替换为 `/` |

服务端对未命中的路径一律返回 `index.html`（`B.02` §5），所以以上路径都能直接刷新、直接打开。

### 4.2 导航函数
```ts
// web/src/routes/nav.ts —— 应用里所有改 URL 的地方只调这几个函数，不直接调用 navigate()
export type Location = { sessionId: Ulid; graphId: Ulid; scope: 'root' | Ulid };
export function toUrl(loc: Location): string;          // '/c/…/g/…' + (scope==='root' ? '' : '?scope=…')
export function parseUrl(url: URL): Partial<Location> | null;

export function useNav(): {
  enterLayer(containerId: Ulid): void;                  // 进入一层：push
  leaveTo(scope: 'root' | Ulid): void;                  // 返回到任一上层：见 §6.2
  switchSession(sessionId: Ulid): void;                 // push（U.09.04-R7）
  switchGraph(graphId: Ulid): void;                     // push，scope 回到 root
  replaceLocation(loc: Location): void;                 // 只改地址，不新增历史记录（解析、修正时用）
};
```
### 4.3 依赖
`react-router`（`G.10` §3.3）：`createBrowserRouter`、`useNavigate`、`useLocation`。`W.03.05` 会话列表与 `Session`、`saveLastLocation`、工作区 `activate` / `setLocation`。

### 4.4 会话页挂载的页面（`P.09` K146–K148）
`SessionRoute` 渲染 `<AppShell mode="session" canvasOverlay={…} cover={…} />`：
- `canvasOverlay`：`ui.tour` 为真 → 懒加载 `pages/welcome/Tour`（`W.09.03`）；否则 `pages/home/CanvasEmpty`（`W.09.01`，它自己判断显示哪一种空状态）。
- `cover`：`ui.history` 非空且 `history.sessionId` 是当前会话 → 懒加载 `pages/history/HistoryCover`（`W.09.05`）；地址里的会话或图变化时调 `ui.closeHistory()`。
- `/welcome`：`<AppShell mode="page" page={<WelcomePage/>} />`，`WelcomePage` 懒加载（`W.09.03`）。

## 5. 数据结构
`Location` 见 §4.2。路由参数 `sessionId`、`graphId`、`scope` 都必须匹配 ULID 正则 `^[0-9A-HJKMNP-TV-Z]{26}$`（`scope` 另可为省略），不匹配按"其他"处理。

## 6. 行为
### 6.1 历史记录规则
| 动作 | URL 变化 | 历史记录 |
|---|---|---|
| 进入子图（双击、Enter、预览里"进入编辑"） | `scope` 变为该容器节点 | push |
| 结构树直达、命令面板选中节点、"看这里"卡片 | `scope` 变为目标层 | push（跨多层也只 push 一条） |
| 返回上一层（Esc、`Alt+↑`、父图位置卡） | `scope` 变为上一层 | §6.2 |
| 面包屑点任一上层 | `scope` 变为那一层 | §6.2 |
| 切换会话、新建会话 | `sessionId` 变化 | push |
| 切换同一会话的另一张图（`U.09.04-R4`） | `graphId` 变化，`scope` 回根图 | push |
| 浏览器后退 / 前进 | 地址回到上一条 / 下一条 | 浏览器自己处理；应用按新地址恢复现场（§6.3） |

### 6.2 返回时怎么写历史
目标层等于"上一条历史记录"的地址时，调用 `history.back()`，不 push——这样"进入 → Esc 返回 → 浏览器后退"不会在同一层来回跳。否则 push 目标地址。实现上 `nav.ts` 在内存里维护一个和浏览器历史对应的地址栈（监听 `popstate` 同步）。

### 6.3 地址变了以后
1. `parseUrl` → 和当前会话工作区比较：会话不同 → 切换工作区（`W.03.05`）；图不同 → 加载新图；只有 `scope` 不同 → 通知画布引擎切换层（`W.06.13`）。
2. 调 `W.03.05` 的 `saveLastLocation(sid, {graphId, scope})`：它在 1 秒内没有再变时 `PATCH /sessions/{sid}` 写 `last_location`（节流 1 秒，`C.10-R3`）；路由代码不直接发请求（`W.01-R13`）。
3. 写 localStorage `hx:last-session = sessionId`。
4. 页面标题：`{会话名} · Anywhere Door`；有待审批时前面加"（待审批）"（`U.14.04` §2）。

## 7. 不变量
- 任何时候，地址栏里的 `sessionId / graphId / scope` 与画布正在显示的会话、图、层一致。
- 应用代码里除了 `nav.ts` 没有其他地方改 URL（ESLint 禁止在 `routes/nav.ts` 以外 import `useNavigate`）。
- 刷新页面后停留在同一层（`U.13.06` §6 验收 3）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 会话不存在（404 `not_found`） | 替换为 `/`，提示"这个会话已经删除或不存在" |
| 图不属于这个会话 | 替换为 `/c/:sessionId` |
| `scope` 指向的容器节点不存在（被删、被解散） | 替换为根图，提示"那一层已经不存在了" |
| `PATCH last_location` 失败 | 不提示（界面现场，不影响数据）；下一次层变化时重试 |

## 9. 性能与资源
地址变化到画布显示新层 ≤ 100ms（不含转场，`U.17` §1）；`PATCH last_location` 每个会话每秒最多 1 次。

## 10. 验收标准
1. `U.13.06` §6 验收 1、3 全部通过（预览、进入、结构树直达第 3 层、面包屑返回、Esc 返回、浏览器后退；刷新后停留同层）。
2. 进入第 3 层 → Esc 两次回根图 → 浏览器后退：回到第 2 层（不是回到根图又前进）。
3. 会话 A 第 3 层 → 切到 B → 浏览器后退：回到 A 的第 3 层。
4. 手动把地址里的 `scope` 改成不存在的 ID：回到根图并提示。
5. 引导未完成时打开 `/c/…`：先进入 `/welcome`。

### 实施卡
- 要建 / 要改的文件：`web/package.json`、`web/pnpm-lock.yaml`、`web/src/routes/index.tsx`、`web/src/routes/nav.ts`、`web/src/routes/SessionRoute.tsx`、`web/src/routes/nav.test.ts`、`web/src/routes/SessionRoute.test.tsx`、`web/eslint.config.js`
- 说明：`web/package.json`、`web/pnpm-lock.yaml` 只安装已登记的 `react-router`；`web/eslint.config.js` 只加一条禁止在 `routes/nav.ts` 以外 import `useNavigate` 的规则；未实现的 `W.03.05`/`W.09.*` 经依赖注入接口解耦（`P.09` K305）。
- 不许碰的文件：`web/src/lib/protocol/generated/`、`web/src/canvas/`、`web/src/state/`、`schema/`
- 函数签名：见 §4.2。
- 测试用例：
  - `W0201-T1 toUrl / parseUrl 往返`：`{s,g,root}`、`{s,g,X}`、非法 ULID → `null`
  - `W0201-T2 / 解析`：引导未完成 → `/welcome`；有会话 → 最近会话；无会话 → 留在 `/`
  - `W0201-T3 返回不重复入栈`：§10 验收 2
  - `W0201-T4 跨会话后退`：§10 验收 3
  - `W0201-T5 scope 不存在`：§10 验收 4
  - `W0201-T6 last_location 节流`：1 秒内 5 次层变化只发 1 次 PATCH，内容是最后一次
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `web/tests/e2e/routes.spec.ts`：`W.12`（第 ⑫ 片 Playwright e2e，`P.09` K305）
- 允许使用的依赖：`react`、`react-router`、`zustand`（`G.10` §3.3）；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部；另：不把中心窗口、预览、右栏标签放进 URL；不在 `nav.ts` 以外改 URL。
- 完成标志：`G.14` 全部条件；§10 验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §6.3 第 2 步改为调用 `W.03.05` 的 `saveLastLocation`（节流在 session store 里做），路由不直接发请求 | `W.01-R13`；写 `W.03.05` 时对齐 |
| 2026-11-23 | 新增 §4.4：`SessionRoute` 挂载空状态、画布导览、运行历史；`/welcome` 懒加载引导页 | 第 9 棒写 `W.09`；`P.09` K146–K148 |
| 2026-11-27 | 状态改为"冻结"：M1 第 ⑨c 片 `m1-web-shell` squash 合并进代码仓库 `main`，提交 `2c2d8465a059267659e776e8d7d04d2a56bfb277`（`G.02.06-R21`、`P.09` K305、K308、K309） | 两轮独立评审通过（`docs/relay/m1-web-shell.review.md`）；单二进制冒烟通过；Codex 合并推送；前端线余额用完，由主线（Quick）代写冻结 |
