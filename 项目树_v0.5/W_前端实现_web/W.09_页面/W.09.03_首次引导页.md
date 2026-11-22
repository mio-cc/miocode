# W.09.03 首次引导页

| 项 | 内容 |
|---|---|
| 编号 | W.09.03 |
| 类型 | 实施 |
| 上级 | W.09 页面 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 §4.4；demo v0.5（v0.5.11）`35_inbox.js`（首次引导部分）；`U.18`；`B.06.04`；`P.09` K60、K147 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`/welcome` 的首次引导（欢迎与主题 → 连接模型 → 选一个起点 → 模板填空），完成后建出第一个会话；以及进入会话后的画布导览（最多 4 个导览提示），它也是"重新查看导览"的实现。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 判断要不要进引导、`/welcome` 与 `/` 的互相跳转 | `W.02`（启动时读 `GET /settings/onboarding`）、`W.02.01` |
| 页面模式下顶部条和左栏 `inert` | `W.02.02` §6.5 |
| 连接表单本身、测试连接 | `W.09.04`（本文用 `ConnectionForm`） |
| 模板卡片与"从模板创建" | `W.09.01`（本文用 `TemplateCards`、`startFromTemplate`） |
| 引导进度的存储、演示模式的切换、第一次运行后的总结消息 | 后端 `B.06.04`（总结消息由后端在引导会话第一次运行结束时写入对话，K147） |
| 顶部条上的"演示模式"标记 | `W.07.01`（K147） |
| "重新查看导览"的入口按钮 | `W.07.02`（账户菜单）、`W.09.02`（关于与诊断 › 帮助）——它们只调 `ui.setTour(true)` |

## 3. 继承的上级约束
`W.09` §4–§6、`W.09-R1`–`R6`；`W.02` §6（第 3–4 步）；`W.02.02` §4.1（`page`、`canvasOverlay`）、§6.5；`W.02.03`（`setMode`）；`W.02.04` §6.1（① modal 层：引导页打开期间只放行急停）；`W.03.03`（`tour`、`setTour`）；`W.03` §4.5、§4.6；`W.06.01`（`useCanvasCommands`：`focusNodes`）；`W.02.02` 的 `useCanvasAreaRect`；`U.18`（全部，R1–R5）；`U.14.02`；`U.19.07` 第 2–4 步；`U.16`（焦点、`U.16-R6`）；`U.23-R2`；`S.11-R2`（首次配置模型时告知内容会发给提供方）；`B.06.04`；`B.04.10`（`/settings/onboarding`）；`C.13.04`（`inputs`）；`P.09` Q17、K60、K147。

## 4. 接口
```tsx
// web/src/pages/welcome/WelcomePage.tsx —— /welcome：<AppShell mode="page" page={<WelcomePage />} />，由 W.02.01 懒加载
export default function WelcomePage(): JSX.Element;

export type OnbStep = 'welcome' | 'provider' | 'template' | 'inputs';
type StepProps = { onNext(): void; onBack?(): void; onSkip?(): void };
export function StepWelcome(p: StepProps): JSX.Element;
export function StepModel(p: StepProps & { onDemo(): void }): JSX.Element;
export function StepTemplate(p: StepProps & { value: Template | 'blank' | null; onPick(v: Template | 'blank'): void }): JSX.Element;
export function StepInputs(p: StepProps & { template: Template; value: Record<string, unknown>; onChange(v: Record<string, unknown>): void }): JSX.Element;

export function nextStep(s: OnbStep, pick: Template | 'blank' | null): OnbStep | 'finish';   // template 选了空白或模板没有 inputs → finish
export function serverStep(s: OnbStep | 'tour' | 'done'): string;   // B.06.04 的 onboarding.step 取值：welcome / provider / template / inputs / tour / done
export async function finishOnboarding(d: StartDeps & { completeOnboarding(): Promise<void> },
  pick: Template | 'blank', inputs: Record<string, unknown>): Promise<Ulid>;   // 建会话（并实例化模板）→ complete → setTour(true) → switchSession

// web/src/pages/welcome/Tour.tsx —— SessionRoute 在 ui.tour 为真时懒加载，作为 AppShell 的 canvasOverlay
export default function Tour(): JSX.Element | null;
type TourBubbleProps = { anchor: DOMRect; placement: 'top' | 'bottom' | 'left' | 'right'; index: number; total: number;
  text: string; primary: { label: string; onClick(): void }; onSkip(): void };
export function TourBubble(p: TourBubbleProps): JSX.Element;

// web/src/pages/welcome/tourSteps.ts
export type TourAnchor = 'canvas' | 'container' | 'composer' | 'run';
export type TourStep = { id: 'canvas' | 'nest' | 'composer' | 'run'; anchor: TourAnchor; textKey: string;
  when?: (c: TourCtx) => boolean;            // 不满足就跳过这一步
  advanceOn?: 'click' | 'runStarted' };     // runStarted：用户点了运行（当前运行进入 running）就进入下一步
export const TOUR_STEPS: readonly TourStep[];   // 最多 4 个（U.18 §2 第 5 步）
export type TourCtx = { firstContainer: Ulid | null; hasGraph: boolean };
export function anchorRect(a: TourAnchor, env: { canvasRect: DOMRect | null; fitInsets: { top: number; right: number; bottom: number; left: number };
  query: (sel: string) => DOMRect | null }): DOMRect | null;
```
### 4.1 依赖
`W.09` §4.6；`W.09.01` 的 `TemplateCards`、`starterTemplates`、`needsInputs`、`defaultInputs`、`startFromTemplate`；`W.09.04` 的 `ConnectionForm`；`W.09.02` 的 `FieldControl`、`fromTemplateInput`；`W.02.03` 的 `themeController`、`useTheme`；`W.02.04` 的 `keys.pushOverlay`；`W.03` §4.6 的 `connectionTypes`、`templates`、`load`、`patchSettings`、`onboarding`、`completeOnboarding`；`W.03` §4.5 的 `loadModels`、`models`；`W.03.03` 的 `tour`、`setTour`、`layout.fitInsets`；`W.03.05` 的 `create`；`W.03.04` 的 `current.status`；`W.03.01` 的 `nodesIn`；`W.06.01` 的 `useCanvasCommands`（`focusNodes`）；`W.02.02` 的 `useCanvasAreaRect`；`W.02.01` 的 `useNav`；`W.08` 的 `Button`、`Segmented`、`Select`、`Popover`、`Spinner`；`W.10` 的 `useT`。

## 5. 数据结构
`Template`、`ConnectionType`、`Connection`、`OnboardingState {step, done}` 从 `@/lib/protocol` 导入。本文私有：`OnbStep`、`TourStep`、`TourAnchor`、`TourCtx`。

## 6. 行为
### 6.1 页面
- 占满画布区域的页面（不是模态弹窗，`U.18-R2`）：居中一列，宽 `min(560, 100cqw − 2×--hx-float-inset)`；顶部 4 个步骤点（当前及之前实色）；底部一行：左"上一步"（第 1 步为"跳过"）、右"下一步"（最后一步为"开始"）。
- 按钮都用 `secondary`：一屏一个实心按钮留给运行和发送（`U.23-R2`）；`Enter`（焦点不在多行输入框里）= 下一步。
- 打开时 `keys.pushOverlay('modal', h)`：画布、对话框的快捷键不生效（`W.02.04` §6.1 ①），`h` 只处理 `Enter`。
- 进度：进入每一步时 `hub.patchSettings({'onboarding.step': serverStep(step)})`（`B.06.04` §4，失败不提示）；刷新后 `hub.onboarding()`（`GET /settings/onboarding`）的 `step` 决定从哪一步继续（`tour` / `done` 时直接 `finish` 后的路径）。

### 6.2 第 1 步 欢迎（可以跳过）
一句话介绍（"用积木搭一个会自己干活的 AI 系统……先花一分钟做两件事：连接一个模型，选一个模板"）；主题：`Segmented` 浅色 / 深色 / 跟随系统 → `themeController.setMode`（立即生效，`U.18` §2）。"跳过"= 进入第 2 步（欢迎页本身可跳过，不是跳过整个引导）。

### 6.3 第 2 步 连接模型（可以跳过 → 演示模式）
1. 选择提供方：`hub.load('connectionTypes')` 后取 `group` 为"模型"的连接类型，每个一张卡片（名称、说明），按接口返回顺序；最后一张"演示模式"（"先不配置，所有模型调用都是模拟的，不花钱"）。不写具体厂商名（`W.09-R3`）。
2. 选中某个类型 → 下方 `ConnectionForm`（`compact`、`submitLabel` "测试连接"）；表单上方两行说明："密钥只保存在你的电脑上"（`U.18` §2）、"你发给 AI 的消息、图和工具结果会发送给你选的模型提供方"（`S.11-R2`）。
3. 保存并测试成功：`TestResult` 列出可用模型；下方 `Select`"默认使用的模型"（缺省第一个）→ `hub.patchSettings({'models.default': ref, 'models.orchestrator': ref})`（`P.09` Q17：用户在引导里选）；然后 `catalog.loadModels()`；"下一步"可用。测试失败：显示原因，"下一步"仍可用（连接已保存，可以之后在连接里改），旁边小字"也可以先用演示模式"。
4. 选"演示模式"并下一步，或点"跳过"：`hub.patchSettings({'models.demo_mode': true})`（`B.06.04` §5：fake 提供方设为默认，顶部条显示"演示模式"）；提示"已进入演示模式，配置真实模型后可以关闭"。
5. 密钥：`ConnectionForm` 提交后已清空；回到上一步再前进不会保留密钥（`W.09-R5`）。

### 6.4 第 3 步 选一个起点（不可以跳过，可以选空白）
`TemplateCards`（`starterTemplates` 三张：闭环迭代、生成-评审、代码评审，`T.02`–`T.04` 带 `starter` 标签，K148；`blank`；`layout='row'`）；每张显示一句话说明和预计花费（`cost_hint`，`U.18` §2）。必须选中一项"下一步"才可用。

### 6.5 第 4 步 模板填空（可以跳过 → 用默认值）
选的模板有 `inputs` 时才出现：每项一个 `FieldControl`（`fromTemplateInput`，默认值预填，如"你想调研什么？"）；必填为空时"开始"不可用；"跳过"= 用 `defaultInputs`（必填且没有默认值的模板不显示"跳过"）。

### 6.6 完成（`finishOnboarding`）
1. `session.create()`。
2. 选了模板：`startFromTemplate(d, t, {sessionId, inputs})`（`W.09.01` §6.6；`ui.tour` 已为真时它不弹"撤销"提示）。选了空白：只建会话。
3. `hub.completeOnboarding()`（`POST /settings/onboarding/complete`）。
4. `ui.setTour(true)`；`nav.switchSession(sessionId)`（`/welcome` → `/c/…`，`W.02.01`）。
5. 任何一步失败：停在当前页，错误提示；已建的会话保留（下次 `/` 会进入它），不重复建会话（第二次"开始"复用第 1 步得到的 `sessionId`）。

### 6.7 画布导览（`Tour`，`U.18` §2 第 5 步、R3）
| # | 锚点 | 文案 | 何时跳过 | 下一步的条件 |
|---|---|---|---|---|
| 1 | 画布区域中心 | "这是画布，每个方块是一个节点" | 当前图为空 | 点"下一步" |
| 2 | 第一个容器节点（根图里第一个有子图的节点）：先 `cmd.focusNodes([id])` 把它移到可见区域中心，锚点为可见区域中心 | "这个循环里面还有一层，双击进去看看" | 根图里没有容器节点 | 点"下一步"，或用户进入了它（`scope` 变化） |
| 3 | 对话框（`[data-tour="composer"]`，`W.07.07`） | "在这里用文字告诉 AI 怎么改" | — | 点"下一步" |
| 4 | 运行按钮（`[data-tour="run"]`，`W.07.01`） | "点这里运行" | 当前图为空 | 当前运行进入 `running`（`advanceOn: 'runStarted'`）或点"知道了" |
- 导览提示：`Popover`（不加 `glass`）`bg-2`、`shadow-pop`，指向锚点、按锚点在屏幕上的位置自动选 `placement`，不遮挡锚点（`U.18-R3`）；没有全屏遮罩，画布、对话框照常可用；每个导览提示都有"跳过导览"（`U.18` §2）。
- 锚点矩形由 `anchorRect` 计算：画布区域用 `useCanvasAreaRect()`，可见区域再减去 `fitInsets`；对话框和运行按钮用 `document.querySelector('[data-tour=…]').getBoundingClientRect()`——只读位置，不改这些元素（K147）。锚点找不到（被隐藏、窄屏）→ 跳过这一步。窗口缩放、侧栏收展时用 `ResizeObserver` 重新计算（rAF 合并）。
- 结束（最后一步完成、"跳过导览"、切换到别的会话、离开会话页）：`ui.setTour(false)`。`hx:tour` 由 `W.03.03` 持久化，刷新后从第 1 步重新开始导览。
- 演示模式下运行能完整跑通模板（`U.18-R5`，由 `--fake-llm` 录放数据保证，前端无特殊处理）；第一次运行结束后的总结消息由后端写入对话（`U.18-R4`，K147）。

### 6.8 重新查看导览（`U.18-R1`）
任何地方调 `ui.setTour(true)` 即在当前会话页开始导览，不回到 `/welcome`、不重置引导进度和数据（`B.06.04` §5"只重置 tour"在前端就是这个开关，不发请求）。当前不在会话页（例如在首页没有会话）时，导览在第一次进入会话页时开始。

## 7. 不变量
- 引导完成后不会再被强制进入引导（`B.06.04` §6）：`completeOnboarding` 成功之后本页不再出现，除非服务端 `done=false`。
- 引导页里没有实心主色按钮；没有全屏遮罩。
- 导览同一时间只显示一个导览提示；导览不阻止用户的任何操作。
- 密钥不跨步骤保留。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `connectionTypes` 加载失败 | 第 2 步显示"没有加载出提供方 · 重试"和"演示模式"卡片（仍可继续） |
| 测试连接失败 | 见 §6.3 第 3 步 |
| `PATCH onboarding.step` 失败 | 不提示 |
| `completeOnboarding` 失败 | 错误提示，停在最后一步，可重试（会话不重复创建） |
| 模板缺依赖（422） | 第 3 步卡片下方列出缺失项；可以选别的模板或空白 |
| 连不上 harnessd | `W.02` §6.1 的横幅与重试；本页置灰 |

## 9. 性能与资源
- 引导页 chunk ≤ 20KB gzip（不含 `ConnectionForm`、`TemplateCards` 已有的部分）；`Tour` 单独 chunk ≤ 6KB gzip。
- 从打开 `/welcome` 到第 1 步可交互 ≤ 1.5 秒（`U.17` §1 首屏）。
- 导览在画布平移缩放时不重渲染：锚点 2 只在步骤开始时计算一次（`focusNodes` 之后）；锚点 1、3、4 只在尺寸变化时重算。

## 10. 验收标准
1. 新数据目录：打开后进入 `/welcome`；顶部条和左栏可见但不可聚焦、不可点击（`U.18-R2`）。
2. 第 1 步切到深色立即生效；第 2 步选 OpenAI 兼容，填地址和密钥测试成功，选默认模型；第 3 步选闭环迭代；第 4 步用默认值；"开始"后进入会话，画布上是模板图，导览导览提示依次出现，第 4 个指向运行按钮；点运行后导览结束。
3. 第 2 步点"跳过"：进入演示模式，顶部条显示"演示模式"；完成引导后运行模板能完整跑通（`U.18-R5`）。
4. 第 3 步选空白画布：进入空会话，导览只出现第 3 步（对话框）。
5. 引导到第 3 步时刷新：回到第 3 步。
6. 引导完成后刷新：不再进入引导；账户菜单"重新查看导览"→ 在当前会话开始导览，没有回到 `/welcome`。
7. 导览期间平移画布、在对话框里输入都正常；任一导览提示点"跳过导览"立即结束。
8. 引导中输入过的密钥在 localStorage、store 快照、`console` 里都找不到。

### 实施卡
- 要建 / 要改的文件：`web/src/pages/welcome/WelcomePage.tsx`、`StepWelcome.tsx`、`StepModel.tsx`、`StepTemplate.tsx`、`StepInputs.tsx`、`Tour.tsx`、`TourBubble.tsx`，各自同名 `.css`、`.test.tsx`；`web/src/pages/welcome/flow.ts`（`nextStep`、`serverStep`、`finishOnboarding`）、`flow.test.ts`、`tourSteps.ts`、`tourSteps.test.ts`；`web/tests/e2e/onboarding.spec.ts`（新数据目录 + `--fake-llm`）。
- 不许碰的文件：`web/src/routes/`、`web/src/shell/`（`W.02.01`、`W.02.02` 接入本页和 `Tour`）、`web/src/panels/`（`data-tour` 属性由 `W.07.01`、`W.07.07` 加）、`web/src/state/`、`web/src/ops/`、`web/src/canvas/`、`web/src/components/`、`web/src/lib/protocol/`、`web/src/pages/` 下本目录以外的文件、`design/tokens.css`、`schema/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0903-T1 nextStep`：`template` + 空白 → finish；+ 无 inputs 的模板 → finish；+ 有 inputs → `inputs`；`welcome` → `provider`
  - `W0903-T2 进度`：进入第 3 步 → `patchSettings({'onboarding.step': 'template'})`；`onboarding()` 返回 `inputs` → 首次渲染在第 4 步
  - `W0903-T3 提供方来自数据`：夹具 `connectionTypes` 有 2 个模型类型 + 1 个搜索类型 → 2 张提供方卡片 + 演示模式；源码里没有厂商名字面量
  - `W0903-T4 告知与密钥`：第 2 步渲染两行说明（`S.11-R2`）；提交后 `SecretField` 为空；返回第 1 步再前进，密钥仍为空
  - `W0903-T5 默认模型`：测试成功返回 3 个模型 → 选择第 2 个 → `patchSettings({'models.default': m2, 'models.orchestrator': m2})`
  - `W0903-T6 演示模式`：点"跳过" → `patchSettings({'models.demo_mode': true})` 一次
  - `W0903-T7 第 3 步必选`：未选 → "下一步"禁用；没有"跳过"
  - `W0903-T8 第 4 步跳过`：全部有默认值 → 有"跳过"，用默认值；存在必填无默认 → 没有"跳过"
  - `W0903-T9 finish 顺序`：`create` → `instantiateTemplate` → `completeOnboarding` → `setTour(true)` → `switchSession`；`completeOnboarding` 失败后重试不再 `create`
  - `W0903-T10 导览跳过规则`：根图没有容器节点 → 没有第 2 步；空图 → 只剩第 3 步
  - `W0903-T11 第 4 步推进`：当前运行进入 `running` → 导览结束、`setTour(false)`
  - `W0903-T12 锚点`：`anchorRect('canvas')` = 画布区域减去 `fitInsets` 后的中心；`[data-tour="run"]` 不存在 → null（跳过）
  - `W0903-T13 不遮挡`：锚点在屏幕下方时导览提示 `placement='top'`，导览提示矩形与锚点矩形不相交
  - `W0903-T14 没有主色按钮`：引导页和导览提示里没有 `variant="primary"`
  - `W0903-T15 重新查看导览`：`setTour(true)` 后在会话页出现第 1 个导览提示；没有任何请求
  - `W0903-T16 端到端`：§10 验收 1–4、6（Playwright）
- 允许使用的依赖：`react`、`react-router`、`zustand`（`G.10` §3.3）；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R20、R23、R26）；另：引导页不做成模态弹窗；不加全屏遮罩；不写厂商名和模板名；不保存密钥；不修改被锚定的元素；不在本文发 `POST /settings/onboarding/complete` 以外的引导接口。
- 完成标志：`G.14` 全部条件；§10 八条验收通过；`P.01` 成功标准 1 的可用性测试（`U.18` §4）由 `Q` 枝安排，本叶子提供可运行的流程。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 9 棒（B）；`P.09` K147、K148 |
