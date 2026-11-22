# W.07.08 浮动回复

| 项 | 内容 |
|---|---|
| 编号 | W.07.08 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5（v0.5.11）`43_float.js`（①线条收拢 / 展开）、`23_tab.css`（回复标签、流动线条）、`21_flow.css`；`U.09.06-R4`、`U.09.01` ⑥、`U.24` #8、#16、#19、#24；`P.09` K111、K112 |
| 最后修改 | 2026-11-23 |

## 1. 职责
对话框上方只显示最近一条回复的浮动回复（最多 2 行，点它打开右栏对话页）；它右上角的回复标签（▾）和对话框右上角的小尾巴（▴）；收拢 / 展开时沿两块面板外轮廓流动的线条动画（路径生成、时长分配、打断规则、减少动效替代）；8 秒无操作自动收拢、悬停暂停、`Esc` 收拢、有新回复自动展开。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 浮动回复的位置（对话框正上方、有提议栏时在它上方）、`fitInsets` 里的高度 | `W.02.02` §6.2、§6.3 |
| 回复正文的渲染 | `W.07.04` `MessageView variant="float"` |
| 对话框本身 | `W.07.07`（它在右上角摆本文的 `FloatReplyTail`） |
| 最近一条回复的选取 | `W.03.05` `lastAssistant` |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`（特别是 R2 几何常量、R12 动画）；`W.02.02` §4.1、§6.2；`W.02.03`（`reducedMotion`）；`W.03.05` §4.2（`lastAssistant`）；`U.09.01` ⑥、R3；`U.09.02` §2（点浮动回复打开右栏对话页）；`U.09.06-R4`（全部）；`U.07.01`（§2 允许的属性、R3、R4）；`U.07.04`；`U.16-R5`、`R6`；`U.23-R6`；`U.24` #8、#16、#19、#24；`G.02.05` §补充（不在观察器回调里改被观察的属性）；`P.09` K112。

## 4. 接口

### 4.1 组件
```tsx
// web/src/panels/float-reply/FloatReplyProvider.tsx —— W.02.02 的 FloatLayer 用它包住自己的子元素（P.09 K111）
export function FloatReplyProvider(p: { children: ReactNode }): JSX.Element;
export function useFloatReply(): { state: FloatState; collapse(): boolean; expand(): boolean };   // collapse / expand 返回是否执行了
export type FloatState = 'none' | 'open' | 'tucked' | 'collapsing' | 'expanding';

// web/src/panels/float-reply/FloatReply.tsx —— FloatLayer 里、提议栏上方
export function FloatReply(): JSX.Element | null;               // state='none' 时 null
// web/src/panels/float-reply/ReplyTab.tsx —— 从边框长出的小标签；variant 决定箭头方向和位置
type ReplyTabProps = { variant: 'reply' | 'composer'; onClick(): void; dot?: boolean; label: string };
export function ReplyTab(p: ReplyTabProps): JSX.Element;
export function FloatReplyTail(): JSX.Element | null;            // W.07.07 在对话框右上角渲染；只在 tucked 且有回复时出现
// web/src/panels/float-reply/FlowLine.tsx —— 覆盖整个浮动层的 SVG，只在动画期间可见
export function FlowLine(): JSX.Element;
```
```ts
// web/src/panels/float-reply/flowPath.ts —— 纯函数与几何常量（W.07-R2）
export type Box = { x: number; y: number; w: number; h: number; r: number };   // 相对浮动层左上角；r = 该面板的圆角半径（读 computed style 一次）
export const START_INSET = 30;      // 线条起点：浮动回复底边距右端 30
export const TAIL_INSET = 52;       // 线条终点：对话框上边距右端 52（= 小尾巴的中心：right 28 + 宽 48 / 2）
export const DROP = 14;             // 落下曲线的控制点离两端的竖直距离
export const STUB = 12;             // 收拢结束时留在小尾巴处的一小段
export const MID_SHARE = 0.18;      // 中间帧时线条头部进入对话框外轮廓的比例
export const MID_LEN = 0.42;        // 中间帧线条长度 = MID_LEN × min(Lb, Lc)
export const EXPAND_RATIO = 0.85;   // 展开时长 = 收拢时长 × 0.85
export const FADE_IN_AT = 0.72;     // 展开到 72% 时浮动回复内容开始淡入
export const AUTO_COLLAPSE_MS = 8000;   // 8 秒无操作自动收拢（行为计时，不是动画时长）
export const TAB_W = 48;  export const TAB_H = 14;
export const TAB_CLIP = 'M0 14C6.8 14 8 12 9.5 8.6L11 5.2C12.4 2 14.6 0 18 0H30C33.4 0 35.6 2 37 5.2L38.5 8.6C40 12 41.2 14 48 14Z';   // 两侧内凹圆弧的标签轮廓
export const TAB_RIGHT = { reply: 18, composer: 28 };    // 标签距面板右端
export function roundRectLoop(b: Box, start: { x: number; y: number }, dir: 'fromBottom' | 'fromTop'): string;   // 从边上一点出发、顺时针绕一整圈回到该点的 path 片段（不含 M）
export function flowPath(reply: Box, composer: Box): { d: string; Lb: number; Ld: number; Lc: number; T: number };
export function roundRectLen(b: Box): number;           // 2(w + h) − 8r + 2πr
export function flowKeyframes(g: { Lb: number; Ld: number; Lc: number; T: number }, dir: 'collapse' | 'expand'): Keyframe[];
```

### 4.2 依赖
`W.03` §4.2 的 hook；`W.03.05` 的 `lastAssistant`、`conversations`；`W.03.03` 的 `setRs`；`W.02.03` 的 `themeController`（`reducedMotion`、`subscribe`）；`W.07.04` 的 `MessageView`；`W.07` §4.2 的 `useShortcut`；`W.08` 的 `Tooltip`；`W.10` 的 `useT`。`--hx-t-flow`、`--hx-ease-flow`、`--hx-t-3`、`--hx-t-4`、`--hx-ease-out`、`--hx-bg-glass`、`--hx-blur-glass`、`--hx-accent`、`--hx-model` 令牌（`P.09` K112）。

## 5. 数据结构
- `FloatReplyProvider` 内部：`state: FloatState`、`shownId: Ulid | null`（当前显示的消息 ID）、`newDuringAnim: boolean`（动画中到达新回复 → 小尾巴上的模型色小点）、`hover: boolean`、`timer`（自动收拢）、正在进行的 `Animation` 句柄。
- 动画时长：构造时和 `themeController` 报告 `motion` 变化时用 `getComputedStyle(document.documentElement)` 读 `--hx-t-flow`、`--hx-ease-flow`、`--hx-t-3`、`--hx-t-4`、`--hx-ease-out` 一次并缓存（同 `W.06.02` 的做法）。

## 6. 行为

### 6.1 显示什么（`U.09.06-R4` 第 1 句、`U.09.01` ⑥）
- 内容：当前会话 `lastAssistant(conversation)`；流式中的回复也显示（随内容增长，最多 2 行，超出省略）。没有任何助手回复 → `state='none'`：不渲染浮动回复，也没有小尾巴（`U.09.06-R4` 最后两句）。
- 玻璃材质（`U.23-R6`）；宽度与对话框一致；水平中心是画布区域中心（`U.09.01-R3`，由 `W.02.02` 的浮动层保证）。
- 点正文 → `ui.setRs(true, 'chat')`（`U.09.02` §2）。浮动回复是 `role="status"` 的区域；新回复完成时由 `W.07.04` 的播报负责，本文不重复播报。
- 切换会话：直接显示那个会话的最近一条（`state='open'`，不播放线条动画），重新开始 8 秒计时；那个会话没有回复 → `none`。

### 6.2 状态与触发（`U.09.06-R4`、`U.24` #8、#16）
| 当前 | 触发 | 结果 |
|---|---|---|
| `open` | 点回复标签 ▾；8 秒无操作（指针悬停在浮动回复上时计时暂停，离开后重新从 8 秒开始）；焦点在对话框里按 `Esc` | `collapsing` → `tucked` |
| `tucked` | 点小尾巴 ▴ | `expanding` → `open` |
| `tucked` | 新回复到达（`shownId` 变化） | 自动 `expanding` → `open`，计时 8 秒 |
| `open` | 新回复到达 | 换内容，重新计时 8 秒 |
| `collapsing` / `expanding` | 新回复到达 | 不打断动画；`newDuringAnim = true`；动画结束后若是 `tucked`，小尾巴上亮模型色小点，直到下一次展开 |
| `collapsing` / `expanding` | 点标签、`Esc` | 忽略（动画 ≤ 1.2 秒，`U.07.01-R4` 允许的短暂不可操作只限这一个控件；其他操作照常） |
| 任何 | 会话没有回复了（清空对话） | `none` |
- `Esc` 的分工：`W.07.07` 的 `composer.blur` 处理函数先调 `useFloatReply().collapse()`，返回 true（执行了收拢）就不再失焦；返回 false 才失焦（`U.13.04` §4）。
- 不使用 `MutationObserver`；状态只由 React 状态和 store 订阅驱动（`U.24` #19、`G.02.05` §补充）。

### 6.3 线条路径怎么生成（`flowPath`）
动画开始时量一次（不在动画中途重量）：浮动回复卡片、对话框、浮动层三个元素的 `getBoundingClientRect()`，换成相对浮动层的坐标；两块面板的圆角半径各读一次 `getComputedStyle(el).borderTopLeftRadius`，再夹到 `min(r, h / 2)`。
```
R = 浮动回复 {x: bx, y: by, w: bw, h: bh, r: rb}      C = 对话框 {x: cx, y: cy, w: cw, h: ch, r: rc}
起点 P0 = (bx + bw − START_INSET, by + bh)           // 浮动回复底边、靠右
终点 E  = (cx + cw − TAIL_INSET,  cy)                // 对话框上边、小尾巴正下方
dB = "M P0" + roundRectLoop(R, P0, 'fromBottom')    // 沿底边向左 → 左下圆角 → 左边向上 → 左上圆角 → 顶边向右 → 右上圆角 → 右边向下 → 右下圆角 → 底边回到 P0
dD = "C P0.x,(P0.y + DROP)  E.x,(E.y − DROP)  E.x,E.y"   // 平滑落到对话框上沿
dC = roundRectLoop(C, E, 'fromTop')                 // 沿顶边向右 → 右上圆角 → 右边向下 → 右下 → 底边向左 → 左下 → 左边向上 → 左上 → 顶边回到 E
d  = dB + dD + dC                                   // 一条连续路径：先绕浮动回复一圈，落下，再绕对话框一圈
Lb = roundRectLen(R)   Lc = roundRectLen(C)          // 圆角矩形周长 = 2(w + h) − 8r + 2πr
Ld = 落下那段贝塞尔的长度（在一个不可见的 <path> 上 getTotalLength()，只这一段需要测）
T  = Lb + Ld + Lc
```
圆角用 SVG `A r,r 0 0 1 x,y` 弧线；所有坐标保留 1 位小数。

### 6.4 线条怎么动（`flowKeyframes`）
- 两条叠在一起的路径，`d` 相同：`.hx-flowline__glow`（`stroke: var(--hx-accent)`、7px、透明度 0.18、`filter: blur(3px)` 静态样式）和 `.hx-flowline__line`（`stroke: var(--hx-accent)`、1.6px、圆头圆角）——"主色 1.6px + 7px 柔光"（`U.09.06-R4`）。线宽是几何量，写在 `flowPath.ts` 常量里，经 `style.setProperty('--_w', …)` 交给 CSS（`W.07-R2`）。
- 用 Web Animations API 同时驱动两条路径的 `stroke-dasharray` 与 `stroke-dashoffset`（`U.07.01` §2，K112 补充了 `stroke-dasharray` 只用于本动画）。设 `big = 2T`、`lm = MID_LEN × min(Lb, Lc)`：
  | 关键帧 | offset | `stroke-dasharray` | `stroke-dashoffset` | 看到的样子 |
  |---|---|---|---|---|
  | k0 | 0 | `Lb big` | `0` | 线段正好是浮动回复的整个外轮廓 |
  | k1 | 0.5 | `lm big` | `−(Lb + Ld + MID_SHARE × Lc − lm)` | 线段缩短，头部已落到对话框并绕进 18% |
  | k2 | 1 | `STUB big` | `−(T − STUB)` | 只剩小尾巴处 12 长的一小段 |
  - 收拢：k0 → k1 → k2，时长 `--hx-t-flow`（1.2 秒）、曲线 `--hx-ease-flow`、`fill: 'forwards'`。
  - 展开：k2 → k1 → k0（倒放），时长 `--hx-t-flow × EXPAND_RATIO`（约 1.02 秒），曲线相同。
- 同步的其他动作（都只动 `opacity` / `transform`）：
  | 时刻 | 收拢 | 展开 |
  |---|---|---|
  | 开始 | 小尾巴隐藏；浮动回复内容 `opacity 1 → 0`、`scale 1 → .985`，`--hx-t-3` | 小尾巴立即隐藏；浮动回复设为可见但内容 `opacity: 0` |
  | 进行中 | — | 到 `FADE_IN_AT`（72%）时内容 `opacity 0 → 1`、`scale .985 → 1`，`--hx-t-3` |
  | 结束 | 浮动回复 `hidden`（`state='tucked'`）；小尾巴出现并播"落地"：`translateY(5px) scaleX(.35)`、`opacity 0` → 60% 处 `translateY(-1px) scaleX(1.06)`、`opacity 1` → `none`，`--hx-t-4`、`--hx-ease-out` | `state='open'`，开始 8 秒计时 |
  | 收尾 | 线条 SVG 透明度在 `--hx-t-2` 内淡出，然后 `cancel()` 两条路径上的动画、清空 `d` | 同左 |
- `FlowLine` 的 SVG：`position: absolute; inset: 0; pointer-events: none; overflow: visible`，层级 `--hx-z-composer`，在浮动层里排在对话框之后（同层级下位于对话框之上，线条能盖在对话框边框上）。平时 `opacity: 0`、没有 `d`。

### 6.5 回复标签与小尾巴（`ReplyTab`）
- 都是"从边框长出的一截"：48×14，`clip-path: path(TAB_CLIP)`（两侧内凹圆弧）；与所在面板同一块玻璃材质；内部一条描边轮廓（`color-mix(in srgb, var(--hx-text-1) 10%, transparent)`，1px）和一个 10×6 的箭头。位置：`top: −13`（贴住边框，几何常量），`right: TAB_RIGHT[variant]`。
  | variant | 在哪 | 箭头 | `aria-label` / 提示框 | 点击 |
  |---|---|---|---|---|
  | `reply` | 浮动回复右上角（只在 `open`） | ▾ | "收起回复" | `collapse()` |
  | `composer`（小尾巴） | 对话框右上角（只在 `tucked` 且有回复） | ▴ | "展开最近回复" | `expand()` |
- 悬停：文字色 `text-1`、`translateY(-1px)`、轮廓变为主色 60%（`--hx-t-1`）；键盘焦点：轮廓 `--hx-accent`（`U.16-R4`）。
- 小尾巴的模型色小点：`newDuringAnim` 为真时显示（4px，`--hx-model`），展开后清除（`U.09.06-R4`）。
- 两个标签都是 `<button>`，`pointerdown` 阻止冒泡（不让画布收到）。

### 6.6 减少动效与降级（`U.07.04`、`U.09.06-R4` 末句）
- `reducedMotion` 为真：收拢、展开都直接切换（没有线条、没有淡入淡出、小尾巴没有落地动画）；8 秒自动收拢照常。
- 量不到几何（任一面板宽度为 0、对话框被隐藏）、`Element.prototype.animate` 不存在、`getTotalLength` 抛错：同上，直接切换，`console.warn` 一次。
- 线条动画期间窗口尺寸变化：不重算，动画照常结束（≤ 1.2 秒）；结束后布局由 CSS 恢复。

## 7. 不变量
- 任何时候最多显示一条回复（`U.09.06-R4`）。
- 没有回复时既没有浮动回复也没有小尾巴。
- 浮动回复上没有关闭 ×（`U.24` #16）；收拢只经回复标签、8 秒计时、`Esc`。
- 同一时刻最多一个线条动画；动画结束后 SVG 上没有残留的 `Animation`。
- 对话框获得焦点不会让浮动回复重新出现（`U.24` #8）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 几何或动画 API 不可用 | §6.6 直接切换 |
| 动画被浏览器中断（标签页切到后台） | `finished` Promise 拒绝时按"已完成"处理到终态 |
| 显示的那条消息被删除（清空对话） | `none` |

## 9. 性能与资源
- 线条动画全程由合成线程处理 `stroke-dash*`；开始时一次布局读取（三个 `getBoundingClientRect` + 两个 `getComputedStyle` + 一次 `getTotalLength`），≤ 1ms。
- 动画期间 React 提交只有开始和结束两次（状态切换）；流式回复的内容更新由 `MessageView` 自己处理。
- 8 秒计时只有一个 `setTimeout`，悬停时清除、离开时重设。

## 10. 验收标准
1. 新回复出现：浮动回复显示最近一条、最多 2 行；8 秒不动后线条从浮动回复的边框流下，绕对话框一整圈，收在右上角并长出小尾巴，全程约 1.2 秒（`U.09.06-R4`）。
2. 指针停在浮动回复上超过 8 秒：不收拢；移开后 8 秒收拢。
3. 点小尾巴：线条倒着流回，浮动回复重新出现；点浮动回复正文打开右栏对话页。
4. 收拢状态下来了新回复：自动展开；动画进行中来了新回复：小尾巴上亮模型色小点。
5. 焦点在对话框里按 `Esc`：浮动回复展开时只收拢、不失焦；再按一次输入框失焦。
6. 打开减少动效：收拢 / 展开直接切换，没有线条。
7. 没有任何回复的新会话：既没有浮动回复也没有小尾巴。
8. 录制收拢动画（Performance）：期间没有布局计算、React 提交 2 次。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/float-reply/FloatReplyProvider.tsx`、`FloatReply.tsx`、`ReplyTab.tsx`、`FloatReplyTail.tsx`、`FlowLine.tsx`，每个同名 `.css`、`.test.tsx`；`web/src/panels/float-reply/flowPath.ts`、`flowPath.test.ts`；`web/tests/e2e/float-reply.spec.ts`；`web/tests/visual/float-reply.spec.ts`（展开、收拢、动画第 0 / 50% / 100% 帧，浅色 / 深色）。
- 不许碰的文件：`web/src/state/`、`web/src/shell/`（`FloatLayer` 用 `FloatReplyProvider` 包住子元素由 `W.02.02` 的实施者做）、其他 `panels/` 目录、`design/tokens.css`（新令牌由 `U.07.01`、`U.03.01`、`U.06` 登记后进 `tokens.css`）。
- 函数签名：见 §4。
- 测试用例：
  - `W0708-T1 roundRectLen`：`{w:200,h:60,r:16}` → `2(260) − 128 + 32π`；`r=0` → `2(w+h)`
  - `W0708-T2 flowPath`：给定两个盒子 → `d` 以 `M{bx+bw−30},{by+bh}` 开头、包含一段 `C`、以终点 `{cx+cw−52},{cy}` 结尾；`T = Lb + Ld + Lc`
  - `W0708-T3 关键帧`：收拢 3 帧的 `dasharray` 依次为 `Lb`、`lm`、`12`，`dashoffset` 依次为 `0`、`−(Lb+Ld+0.18Lc−lm)`、`−(T−12)`；展开为倒序且中间帧 `offset=0.5`
  - `W0708-T4 状态机`：§6.2 表每一行一条（假时钟、假 `animate`）
  - `W0708-T5 自动收拢与悬停`：8 秒 → `collapsing`；悬停中 20 秒 → 仍 `open`；离开后 8 秒 → 收拢
  - `W0708-T6 动画中新回复`：`collapsing` 中 `shownId` 变化 → 不打断，结束后小尾巴 `dot`；展开后清除
  - `W0708-T7 Esc 分工`：`open` 时 `collapse()` 返回 true；`tucked` 时返回 false
  - `W0708-T8 减少动效`：`reducedMotion=true` → `animate` 调用 0 次，状态直接到终态
  - `W0708-T9 降级`：对话框宽度 0 → 直接切换且 `console.warn` 1 次
  - `W0708-T10 没有回复`：`lastAssistant` 为 undefined → 不渲染浮动回复和小尾巴
  - `W0708-T11 切换会话`：切到有回复的会话 → `open`、没有动画调用
  - `W0708-T12 端到端与视觉`：§10 验收 1、3、4（Playwright，`--fake-llm`）；动画三帧截图
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 §补充的观察器规则）；另：不加关闭 ×；不用 `MutationObserver`；不对 `width` / `height` / `top` / `left` / `filter` 做动画；线条颜色只用 `--hx-accent`；动画时长只来自 `--hx-t-flow` 等令牌。
- 完成标志：`G.14` 全部条件（含减少动效检查）；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版：线条路径、关键帧、时长分配、打断规则、降级 | 第 8 棒；`P.09` K111、K112 |
