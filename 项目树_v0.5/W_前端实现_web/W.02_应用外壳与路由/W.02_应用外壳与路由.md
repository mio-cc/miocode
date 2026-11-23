# W.02 应用外壳与路由

| 项 | 内容 |
|---|---|
| 编号 | W.02 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | W.02.01 路由表、W.02.02 外壳布局、W.02.03 主题切换、W.02.04 快捷键注册中心 |
| 状态 | 草稿 |
| 素材 | 设18 §2；demo v0.4 `30_layout.js`；demo v0.5（v0.5.11）`10_body.html`、`31_palette.js`、`26_keys.js` |
| 最后修改 | 2026-11-23 |

## 1. 职责
从浏览器打开页面到用户能操作为止的整条启动链，以及启动后一直存在的"骨架"：入口 `main.tsx` / `App.tsx`、启动时序、路由、外壳布局、主题、全局快捷键。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 顶部条、侧栏、对话框等各区域里面的内容 | `W.07`（外壳只提供挂载位置和尺寸） |
| 画布本身 | `W.06`（外壳只挂 `<Canvas>`） |
| 各 store 的数据结构 | `W.03` |
| 请求、SSE 连接、重连 | `W.04` |
| 首次引导页、中心窗口、运行历史页的内容 | `W.09` |
| 本机鉴权（`/?t=` 换 cookie） | `B.03.05`（服务端完成，前端只处理 401） |

## 3. 继承的上级约束
`W-R1`–`R14`；`W.01-R1`–`R19`；`U.09`（全部）、`U.03.04`、`U.03.05`、`U.13.04`、`U.13.06`、`U.14.01`、`U.14.05`、`U.17`；`G.06.02-R7`、`R8`；`S.02-R8`（CSP）。

## 4. 接口
### 4.1 对外提供
```ts
// web/src/main.tsx
// 1) 读 boot.js 已经设好的 <html data-*>；2) 创建路由；3) 渲染 <App/>。不做任何网络请求之外的初始化。

// web/src/App.tsx
export function App(): JSX.Element;               // <UiEnvProvider value={shellUiEnv}> 包住 <AppBootstrap> 包住 <RouterProvider>
//   中心窗口 CenterHost 外面包 W.11 的 <PerfRegion id="center">；开发模式与性能构建里，地址带 ?perf=1 时在 #hx-layers 末尾渲染 <PerfHud/>（W.11 §6.9，P.09 K167、K170）

// web/src/shell/uiEnv.ts —— 给基础组件库的界面环境（W.08 §4.3，P.09 K121）
export const shellUiEnv: UiEnv;                   // pushOverlay → keys.pushOverlay；reducedMotion → themeController.get().reducedMotion；portalRoot → body 末尾的 <div id="hx-layers">（没有就建）

// web/src/shell/bootstrap.ts
export type BootState =
  | { kind: 'loading' }
  | { kind: 'ready'; onboardingDone: boolean; settings: Settings; sessions: Page<Session> }
  | { kind: 'unauthorized' }                       // 401：token 失效或服务重启后变了（U.14.05）
  | { kind: 'offline' };                           // 连不上 harnessd
export function bootstrap(client: RestClient): Promise<BootState>;
```
### 4.2 依赖
| 依赖 | 用途 |
|---|---|
| `W.04.01` `RestClient` | `GET /settings/onboarding`、`GET /settings`、`GET /sessions` |
| `W.03` 各 store 工厂、`W.03.05` 会话工作区 | 路由进入会话时创建 / 复用工作区 |
| `W.10` `useT` | 文案 |
| `W.08.04` `UiEnvProvider`、`UiEnv` 类型；`W.02.04` `keys`；`W.02.03` `themeController` | `shell/uiEnv.ts` 组装界面环境 |
| 生成类型 `Settings`、`Session`、`Page<T>` | `lib/protocol/generated`（`W.04.04`） |

## 5. 数据结构
只使用生成类型和 `W.03` 的 store。本节点私有的只有上面的 `BootState`。

## 6. 行为：启动时序
| # | 时刻 | 做什么 | 落实 |
|---|---|---|---|
| 1 | HTML 解析到 `<head>` | 同步执行 `/boot.js`：设 `data-palette`、`data-theme`、`data-motion`；渲染前完成，首屏不闪 | `W.02.03`、`U.03.04-R3` |
| 2 | `main.tsx` 执行 | 按 `W.04` §6.1 组装协议层（`createProtocol`、`createAppStores`、`bindNet`），然后立即渲染外壳骨架（顶部条、左栏框架、空画布区域），不等数据 | `U.14.01-R2` |
| 3 | 同时并行请求 | `GET /settings/onboarding`、`GET /settings`、`GET /sessions` | — |
| 4 | 三个请求返回 | `onboardingDone=false` → 路由到 `/welcome`；否则按 `W.02.01` 解析当前地址 | `B.06.04` |
| 5 | 设置返回后 | 主题与服务端配置对齐（`W.02.03` §6.3）；快捷键注册中心启用全局键 | — |
| 6 | 进入会话路由 | 创建会话工作区，连会话流、图协同流（`W.04.02`），画布挂载 | `W.01-R15` |

- 第 2–6 步之间的任何加载状态按 `U.14.01`：300ms 内不显示，300ms–2s 局部旋转弧，超过 2s 写明在加载什么。
- 首屏可交互（打开到能操作）≤ 1.5 秒（`U.17` §1）。首屏不加载的模块用动态 `import()`：中心窗口（`W.09.02`、`W.09.04`）、首次引导（`W.09.03`）、运行历史（`W.09.05`）、命令面板（`W.07.11`）。`App.tsx` 在 `ui.center` 第一次非空时 `lazy(() => import('@/pages/center/CenterHost'))` 并渲染在路由之外的顶层（中心窗口不进 URL，`W.09` §6.1，`P.09` K141）。

### 6.1 失败分支
| 情况 | 界面 |
|---|---|
| 任意请求 401（启动时由 `bootstrap` 返回 `unauthorized`；启动后由 `ui.net === 'closed'` 触发，`W.04.05`） | 整页说明"Harness 已重新启动或访问凭证已更换。请回到启动 Harness 时打开的地址，或在命令行运行 `harnessctl open`。"；不显示外壳（`U.14.05`） |
| 连不上 harnessd | 外壳保留，顶部条下方黄色横幅（`U.14.05`），每 2 秒重试 `GET /settings/onboarding`，成功后从第 4 步继续 |
| 其他错误 | 外壳保留，对应区域显示错误和"重试"（`U.14.03`） |

## 7. 不变量
- 外壳骨架在第一个网络请求返回之前就已渲染。
- 启动过程中不调用任何会改变服务端状态的接口（只有 GET）。
- 401 时不重试、不跳转到任何登录页（v1 没有登录页，`S.02-R3`）。

## 8. 错误处理
| 错误 | 触发 | 处理 |
|---|---|---|
| `unauthorized` 401 | token 失效 | §6.1 整页说明 |
| 网络错误 | 服务没启动、休眠唤醒 | §6.1 横幅 + 重试 |
| `internal` 500 | 服务端缺陷 | 区域错误 + "复制错误详情"（`G.13-R4`） |

## 9. 性能与资源
首屏 JS（gzip）≤ 350KB（`U.17` §1）；本枝的入口、外壳、主题、快捷键代码合计 ≤ 40KB（gzip），由 `W.11` 的包体积检查把关。

## 10. 验收标准
1. 冷启动在 `U.17` 规定的环境下 ≤ 1.5 秒可交互（`W.11` 基准）。
2. 断开网络后打开页面：先看到外壳和横幅，服务恢复后自动进入。
3. 使用过期 token 打开：显示 §6.1 的整页说明，控制台无未处理异常。
4. 首屏 JS 体积不超过 §9。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §6 第 2 步写明协议层组装；§6.1 的 401 行补上启动后的触发方式 | `P.09` K91（写 `W.04.05` 时对齐） |
| 2026-11-23 | §4.1 新增 `shell/uiEnv.ts` 的 `shellUiEnv`，`App.tsx` 外层放 `UiEnvProvider` | 第 9 棒写 `W.08`；`P.09` K121 |
| 2026-11-23 | §6 写明 `App.tsx` 懒加载中心窗口的方式 | 第 9 棒写 `W.09.02`；`P.09` K141 |
| 2026-11-23 | §4.1 `App.tsx`：`center` 性能区域与开发用性能浮层 | 第 10 棒写 `W.11`；`P.09` K167、K170 |
