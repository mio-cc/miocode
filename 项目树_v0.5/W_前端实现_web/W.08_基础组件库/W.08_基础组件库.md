# W.08 基础组件库

| 项 | 内容 |
|---|---|
| 编号 | W.08 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | W.08.01 按钮类、W.08.02 输入类、W.08.03 选择类、W.08.04 浮层类、W.08.05 反馈类 |
| 状态 | 草稿 |
| 素材 | 设10；设计规范 v0.3 `src/06_controls.css`、`src/20_icons.js`；demo v0.5（v0.5.11）`21_flow.css`、`43_float.js`（流动高亮）、`15_art.css`、`17_fix.css`；`W.07` §4.3；`P.09` K121–K130 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`web/src/components/ui/`：全前端共用的、只拿 props 的基础控件——按钮、图标、输入、选择、浮层、提示与反馈，以及没有对应叶子的四个通用组件（`Icon`、`GlideGroup`、`ScrollArea`、`ErrorBoundary`）。`W.07` 面板、`W.09` 页面、`canvas/Canvas.tsx` 与 `CanvasOverlays.tsx` 只组合这些控件，不自建通用控件（`W.07` §4.3 末尾）。

本文一次定下：目录与五个叶子的分工、唯一出口、界面环境 `UiEnv`、共用类型、`W.07` §4.3 需求表逐条落在哪、样式 / 键盘 / 焦点 / 文案的共同约定。叶子只细化本文，不另起共用接口。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 读写 store、发请求、修改图、合并 Op（数据和回调都从 props 进来） | `W.03`、`W.04`、`W.05`；调用方是 `W.07` / `W.09`（`W.01-R7`） |
| 快捷键注册与分发、按键文字（`Ctrl+K` / `⌘K`） | `W.02.04`（本枝经 `UiEnv.pushOverlay` 压栈；按键文字由调用方用 `keys.label` 算好传入） |
| 主题与"减少动效"的设置和解析 | `W.02.03`（本枝只读 `<html data-motion>` 和 `UiEnv.reducedMotion()`） |
| 提示的排队、自动消失计时、堆叠位置 | `W.07.10` `ToastStack`（本枝的 `Toast` 只是一条的外观） |
| 业务控件：属性页参数行、节点库条目、会话项、对话框输入区、命令面板 | `W.07.*`（用本枝控件拼） |
| 节点上的内联参数控件（原生 DOM） | `W.06.03`（画布引擎不 import React，`W-R1`；外观令牌与本枝一致） |
| Markdown 渲染 | `W.07.04` `chat/Markdown`（`G.06.01-R10`） |
| 文案表、数字和时间的格式化 | `W.10`（本枝需要的 `ui.*` 键见 §4.6） |
| 图标的绘制与图标表的生成 | 设计方画 `design/icons/*.svg`；`tools/gen icons` 生成（`G.16`，`P.09` K122）；本枝只渲染 |

## 3. 继承的上级约束
`W-R1`、`R2`、`R9`；`W.01-R4`、`R5`、`R7`、`R8`、`R18`、`R19`；`W.01` §3.2；`W.02.04` §4.2、§6.1、§7；`W.07` §4.3（全部）、`W.07-R6`、`R7`、`R10`、`R12`、§6.5、§6.6 #14、#15；`G.06-R1`、`R2`、`R4`、`R5`；`G.06.01`（全部，特别是 R1、R2、R5、R6、R9）；`G.06.02-R1`、`R3`；`G.06.03`（全部）；`G.04.02`；`G.04.03`；`G.04.06`（全部）；`G.10` §3.3、§3.4；`G.02.05-R23`、`R25`、`R26`、`R27`、`R28`；`U.01`；`U.03.01`；`U.03.02`；`U.05-R5`；`U.06`；`U.07.01`；`U.07.04`；`U.08`；`U.11`；`U.13.05-R1`、`R2`；`U.14.01`；`U.14.02-R2`；`U.14.03` §1；`U.15`；`U.16`（全部）；`U.17` §1；`U.22-R11`；`U.23-R2`、`R5`、`R6`、`R10`、`R13`、`R20`、`R21`；`U.09.02-R9`、`R10`；INV-20；`P.09` K112、K118、K121–K130。

## 4. 接口

### 4.1 目录与分工
```
web/src/components/ui/
├─ index.ts                 W.08（实现写在 W.08.01 实施卡）  唯一出口：重新导出下面每个目录的公开组件、类型和 iconSvg
├─ types.ts                 W.08（同上）                      §4.4 共用类型
├─ base.css                 W.08.01                           焦点环、禁用、两种尺寸的共用类（§6.1）
├─ button/                  W.08.01   Button、IconButton、Kbd
├─ icon/                    W.08.01   Icon.tsx、iconSvg.ts（给画布引擎的 EngineDeps.icon）
├─ glide/                   W.08.01   GlideGroup.tsx、glide.ts（流动高亮）
├─ input/                   W.08.02   TextInput、TextArea、NumberStepper、Slider、SearchInput、FieldError；stepMath.ts、autosize.ts
├─ select/                  W.08.03   Select、Segmented、Switch、Tabs、Picker；listNav.ts
├─ overlay/                 W.08.04   UiEnv.tsx、Overlay、Popover、Menu、Dialog、Tooltip；layerStack.ts、position.ts、focus.ts
└─ feedback/                W.08.05   Toast、Badge、StatusDot、Spinner、ProgressBar、EmptyState、ScrollArea、ErrorBoundary
```
- 四个没有对应叶子的组件的归属（`P.09` K128）：`Icon`、`GlideGroup` 归 `W.08.01`（图标和流动高亮首先服务于按钮与条目）；`ScrollArea`、`ErrorBoundary` 归 `W.08.05`（区域容器与出错反馈）。界面环境 `UiEnv` 与浮层根容器归 `W.08.04`。
- 一个文件一个组件，旁边放同名 `.css` 和 `.test.tsx`（`G.06.01-R1`）；写了 `.ts` 的是纯函数或 hook。
- 叶子之间的依赖（实现顺序按这个来）：`W.08.01` 的 `Icon` 与 `W.08.05` 的 `Spinner` 不依赖其他文件 → `W.08.04` 的 `UiEnv`、`Overlay`、`Tooltip` → `W.08.01` 其余（`IconButton` 用 `Tooltip`、`Button` 用 `Spinner`）→ `W.08.02`、`W.08.03`（`Select` 用 `Popover`）→ `W.08.04` 其余（`Dialog` 用 `Button`、`Menu` 用 `Kbd`）→ `W.08.05` 其余。

### 4.2 唯一出口
```ts
// web/src/components/ui/index.ts —— 调用方只写 import { Button, Popover } from '@/components/ui'
export { Button, IconButton, Kbd } from './button/…';             // W.08.01
export { Icon } from './icon/Icon';  export { iconSvg } from './icon/iconSvg';
export { GlideGroup } from './glide/GlideGroup';
export { TextInput, TextArea, NumberStepper, Slider, SearchInput, FieldError } from './input/…';   // W.08.02
export { Select, Segmented, Switch, Tabs, Picker, pickerOptionId } from './select/…';  // W.08.03
export { UiEnvProvider, Overlay, Popover, Menu, Dialog, Tooltip } from './overlay/…';  // W.08.04
export { Toast, Badge, StatusDot, Spinner, ProgressBar, EmptyState, ScrollArea, ErrorBoundary } from './feedback/…';  // W.08.05
export type * from './types';
export type { ButtonProps, IconButtonProps, KbdProps } from './button/…';  // 以及每个组件的 XxxProps
export type { MenuItem, MenuEntry, PickerGroup, PickerItem, PickerHandle, SelectOption, UiEnv } from './…';
```
（`…` 处写实际文件名；一个组件一个文件，这里只示意分组。）`components/ui` 以外不 import 它的子目录（ESLint `no-restricted-imports`：`@/components/ui/*` 只允许 `@/components/ui`）。

### 4.3 界面环境 `UiEnv`（实现写在 `W.08.04`，`P.09` K121）
`components/ui` 不能 import `shell/`（`W.01-R5` 依赖只能向下），但浮层打开时要经 `keys.pushOverlay` 压栈（`W.02.04` §6.1）。所以外壳在应用根放一个 Provider，把需要的能力注入进来：
```ts
// web/src/components/ui/overlay/UiEnv.tsx
export type UiEnv = {
  /** W.02.04 的 keys.pushOverlay：浮层打开时压栈，返回出栈函数 */
  pushOverlay(kind: 'modal' | 'popover', handler: (e: KeyboardEvent) => boolean): () => void;
  /** 当前是否减少动效（W.02.03 的 themeController.get().reducedMotion） */
  reducedMotion(): boolean;
  /** 浮层挂载的顶层容器（缺省 document.body 下的 <div id="hx-layers">，首次使用时创建） */
  portalRoot(): HTMLElement;
};
export function UiEnvProvider(p: { value: UiEnv; children: ReactNode }): JSX.Element;
export function useUiEnv(): UiEnv;     // 没有 Provider 时返回 FALLBACK_ENV
export const FALLBACK_ENV: UiEnv;      // pushOverlay 不做事并在开发模式 console.warn 一次；reducedMotion 读 <html data-motion="reduce">；portalRoot 同上
```
```ts
// web/src/shell/uiEnv.ts（W.02 负责，W.02 §4.1 已登记）
export const shellUiEnv: UiEnv = {
  pushOverlay: (kind, h) => keys.pushOverlay(kind, h),
  reducedMotion: () => themeController.get().reducedMotion,
  portalRoot: () => layersRoot(),      // index.html 里没有就在 body 末尾建 <div id="hx-layers">
};
// App.tsx：<UiEnvProvider value={shellUiEnv}> 包住 <AppBootstrap>
```
测试里用 `<UiEnvProvider value={fakeEnv}>`，`fakeEnv.pushOverlay` 记录压栈并允许测试直接调用处理函数（模拟 `W.02.04` 的分发）。

### 4.4 共用类型
```ts
// web/src/components/ui/types.ts
export type Size = 'md' | 'sm';                     // md = --hx-ctl-h（28），sm = --hx-ctl-h-sm（24，节点内、表格内、停靠栏）
export type Tone = 'neutral' | 'accent' | 'ok' | 'danger' | 'wait' | 'model';   // 语义色（U.03.02）
export type Point = { x: number; y: number };       // 视口坐标（clientX / clientY）
export type Anchor = HTMLElement | DOMRect;          // 弹层锚点；DOMRect 宽高为 0 时就是一个点
export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'right-start' | 'left-start';
export type Layer = 'popover' | 'modal' | 'toast' | 'tooltip' | 'pane';   // 对应 --hx-z-*（U.06 §3）
export type CloseReason = 'esc' | 'outside' | 'tab' | 'action';
export type { IconName } from '@/styles/icons';     // 生成物（P.09 K122）
```

### 4.5 `W.07` §4.3 需求表的落实
`W.07` §4.3 的每一行都在下表的叶子里实现，props 名称与类型以叶子 §4 的代码块为准。表里"补充"一列是写叶子时发现 `W.07` §4.3 不够用而增加的（可选 props，不改原有的；`P.09` K126 已同步改 `W.07` §4.3）。
| 组件 | 叶子 | 补充 |
|---|---|---|
| `Button` | W.08.01 | `type`（`button` / `submit`，缺省 `button`）、`ariaLabel`、`fullWidth` 改为 `width?: 'auto' \| 'full'` |
| `IconButton` | W.08.01 | `tipPlacement`、`ariaHasPopup`、`ariaExpanded`（打开菜单 / 弹层的按钮） |
| `Kbd` | W.08.01 | `variant?: 'inline' \| 'key' \| 'tip'`（菜单项右侧 / 速查面板 / 提示框里） |
| `TextInput`、`TextArea`、`NumberStepper`、`Slider`、`SearchInput` | W.08.02 | 共有 `size`、`ariaLabel`、`id`、`disabled`、`disabledReason`；`TextInput` 加 `maxLength`；`SearchInput` 加 `onEscape?: 'clear' \| 'none'`、`ariaControls`、`ariaActiveDescendant`（配合 `Picker`）；`TextArea` 加 `counter?: {max}`（字数，`10.7`） |
| `Select`、`Segmented`、`Switch`、`Tabs`、`Picker` | W.08.03 | `Select` 加 `placeholder`、`size`、`invalid`、`lockReason`；`Switch` 加 `labelPosition?: 'left' \| 'none'`；`Tabs` 加 `ariaLabel`；`Picker` 加 `listId`、`query`（加粗匹配字）、`disabledReason`、`ref: PickerHandle`（外部输入框把方向键交给它） |
| `Overlay`、`Popover`、`Menu`、`Dialog`、`Tooltip` | W.08.04 | `Overlay` 加 `onKey`、`initialFocus?: 'first' \| 'container' \| 'none'`、`restoreFocus` 可传元素、`scrim`、`anchorEl`（不算"外部"的元素）；`Menu` 的 `at` 也可以是元素，`MenuItem` 加 `run`、`checked`、`model`（AI 类条目用模型色，`10.20`）；`Dialog` 加 `dismissible`、`busy`、`error`；`Tooltip` 加 `placement`、`disabled` |
| `Toast` | W.08.05 | `action` 改为 `actions`（最多 3 个，`W.03.03` 的 `Toast.actions` 与 `W.07.10` §6.3 要多个动作）；加 `onHover(on)`（`W.07.10` 悬停暂停计时）、`role` 由 `level` 决定 |
| `Badge`、`StatusDot`、`Spinner`、`ProgressBar`、`EmptyState` | W.08.05 | `Badge` 加 `dot`；`ProgressBar` 加 `ariaLabel`；`Spinner` 加 `label`（读屏文字，缺省"加载中"） |
| `Icon`、`GlideGroup` | W.08.01 | `Icon` 加 `label`（有含义时的读屏文字，缺省 `aria-hidden`）、`size` 加 32（空状态，`U.14.02-R2`）；`GlideGroup` 加 `className` |
| `ScrollArea`、`ErrorBoundary` | W.08.05 | `ScrollArea` 加 `axis?: 'y' \| 'x' \| 'both'`、`className`、`ref`（调用方保存 / 恢复 `scrollTop`，`W.07.03` §6.1）；`ErrorBoundary` 加 `resetKey`（变化时自动重试，切换会话用） |

### 4.6 需要 `W.10` 提供的文案键（前缀 `ui.`）
组件可见的文字全部由调用方传入（`W.07` §4.3）；只有组件自带的读屏名称和少数固定说明用 `useT()`（`@/lib/i18n`）取，键名如下（`U.15-R6`；`W.10` 定稿时建这些键）：
| 键 | 文案（说明用） | 用在 |
|---|---|---|
| `ui.close` | 关闭 | `Toast` 的 ×（`Dialog` 没有 ×，用"取消"按钮和 `Esc`） |
| `ui.clear` | 清空 | `SearchInput` 的清空按钮 |
| `ui.loading` | 加载中 | `Spinner` 缺省读屏文字、`Button` 加载中 |
| `ui.decrease` / `ui.increase` | 减少 / 增加 | `NumberStepper` 的 − / + |
| `ui.locked` | 已锁定 | 锁图标的读屏文字（悬停说明由 `lockReason` 给） |
| `ui.max` / `ui.min` | 最大为 {n} / 最小为 {n} | `NumberStepper`、`Slider` 输入越界时的提示 |
| `ui.noMatch` | 没有匹配的选项 | `Select` 过滤无结果 |
| `ui.filter` | 筛选 | `Select` 过滤框的读屏名称 |
| `ui.submenu` | 展开子菜单 | `Menu` 有子菜单的项的读屏提示 |
| `ui.ai` | AI | `Toast level='model'` 的 AI 字样 |

### 4.7 依赖
| 依赖 | 用途 |
|---|---|
| `react`、`react-dom`（`createPortal`）（`G.10` §3.3） | 组件、浮层挂到顶层容器 |
| `@floating-ui/dom`（`G.10` §3.3，只在 `overlay/position.ts`） | `Popover`、`Menu`、`Tooltip`、`Select` 弹层的定位、翻转、避让视口边缘 |
| `@/lib/i18n` 的 `useT`（`W.10`） | §4.6 的 `ui.*` 文案 |
| `@/styles/icons`（生成物，`P.09` K122） | `ICONS` 图标表、`IconName` |
| `@/styles/tokens.css`（生成物） | 令牌；组件 CSS 只写 `var(--hx-*)` |
| 测试：`vitest`、`jsdom`（`G.10` §3.4） | 用 `react-dom/client` 的 `createRoot` 与 `react` 的 `act` 渲染（不引入测试库，`G.10-R1`） |

被依赖：`W.07` 全部叶子、`W.09` 全部叶子、`W.06.01`（`Canvas.tsx` 取 `iconSvg` 放进 `EngineDeps.icon`，`CanvasOverlays.tsx` 用 `Popover`、`Picker`）、`W.02`（`App.tsx` 放 `UiEnvProvider`）。

## 5. 数据结构
- 本枝不使用任何协议类型（`W.01-R7`）；只有 §4.4 的共用类型和各组件的 `XxxProps`。
- 组件内部的临时状态（输入中的文字、拖动中的值、弹层是否在动画中）用 `useState` / `useRef`（`G.06.02-R1`）；不读写 localStorage、不建 store。
- 模块级共享的状态只有三处，都只在本目录内：`overlay/layerStack.ts`（打开着的浮层栈，判断"外部点击"与嵌套）、`overlay/Tooltip.tsx` 的"提示框暖场"计时（已有提示框时移到相邻目标立即切换）、`icon/iconSvg.ts` 的已解析 SVG 模板缓存。

## 6. 行为

### 6.1 外观的共同约定（`U.11` §1、`U.23-R5`、`P.09` K118、K127）
| 状态 | 外观 |
|---|---|
| 默认 | 填充色 `bg-4`（幽灵类为透明）；没有边框、没有外框 |
| 悬停 | 底色加深一级（`bg-4` → `bg-5`；透明 → `bg-4`），过渡 `--hx-t-1` `--hx-ease`；不出现外框 |
| 按下 | `transform: scale(.97)`（按钮）；`bg-5` |
| 键盘焦点 | 只在 `:focus-visible` 时：`outline: var(--hx-s-1) solid var(--hx-focus); outline-offset: var(--hx-s-1)`；不写没有替代的 `outline: none`（`U.16-R4`）。共用类 `.hx-focusring` 写在 `base.css` |
| 禁用 | 透明度 0.5、`cursor: not-allowed`；有原因时用 `aria-disabled="true"`（仍可聚焦、悬停和聚焦都显示原因提示框，点击不触发），没有原因时用原生 `disabled`（`U.11` §1、`设10` §10.0.4） |
| 锁定 | 只读 + 右侧锁图标（`Icon name="lock"`，`text-3`），悬停显示 `lockReason`（"由节点类型定义"等，调用方传入） |
| 错误 | 底色 `danger-weak`，下方一行 `danger` 色 `fs-12` 文字（`U.14.03` §1"控件外框 `danger`"按 `U.23-R5` 改为底色，`P.09` K127） |
| 加载 | 内容换成旋转弧，宽度锁定不跳（量一次当前宽度写进 `--_w`） |

- 两种尺寸：`md` 高 `--hx-ctl-h`、字号 `fs-13`、图标 16；`sm` 高 `--hx-ctl-h-sm`、字号 `fs-12`、图标 14（`设10` §10.0.1）。同一行控件尺寸一致由调用方保证。
- 尺寸、间距只用令牌或令牌的 `calc()` 组合（例如徽标高 18 写 `calc(var(--hx-s-7) - var(--hx-s-1))`，`G.06.03-R2`）；新尺寸先登记令牌（`U.02-R5`）。
- 浮在画布上的面板才用玻璃材质（`U.23-R6`）：本枝只有 `Popover glass`、`Toast glass` 两处开关，缺省关闭；开时 `background: var(--hx-bg-glass); backdrop-filter: blur(var(--hx-blur-glass)) saturate(1.6)`，`@supports not (backdrop-filter: blur(1px))` 退回 `--hx-bg-2`。
- 放在 `GlideGroup` 里的条目自己不画悬停底色：本枝的 `Button`（`ghost`）、`IconButton` 在 `.hx-glide` 内的悬停底色为透明（规则写在 `glide/GlideGroup.css`，只作用于 `.hx-glide` 后代，`G.06.03-R4`）；`W.07` 的行条目在自己的 CSS 里同样写 `.hx-glide .hx-xxx:hover { background-color: transparent }`，当前项 / 选中项保留自己的底色（`U.23-R21`、`W.07.02` §6）。

### 6.2 键盘与焦点
- 控件在**自己的元素**上用 React `onKeyDown` 处理控件内部的键：输入框的 Enter / Esc、数字步进与滑块的方向键、分段与标签页的左右键（`W.02.04` §7 只禁止全局监听；`W.07.06` §6.1 第 4 步同一做法）。
- 浮层的按键（`Esc`、方向键、`Enter`、`Tab` 循环）一律在 `Overlay` 打开时经 `UiEnv.pushOverlay` 压栈处理：`layer='modal'` 压 `modal`，`popover` / `pane` 压 `popover`；`toast`、`tooltip` 不压栈（`W.02.04` §6.1）。这样 `Esc` 的顺序"关弹层 → 取消选中 → 返回上一层"由注册中心保证。
- 控件处理掉的键 `stopPropagation()`，避免落到 `window` 的注册中心再触发一次（例如 `TextInput` 有 `onCancel` 时的 `Esc`、数字步进的方向键）；没处理的键不拦。
- `e.isComposing` 为真时，所有组件都不处理 `Enter`、`Esc`、方向键（`U.13.04-R6`）。
- 焦点：浮层打开时移入（`initialFocus`），关闭后回到触发元素（`restoreFocus`）；模态浮层内 `Tab` / `Shift+Tab` 循环（`U.16-R6`）。组合框式的弹层（对话框的 `/`、`@` 菜单，搜索框下的结果）焦点留在输入框，用 `aria-activedescendant` 指向当前项（`initialFocus='none'`，WAI-ARIA combobox 做法）。
- 所有可点击元素是 `<button type="button">`（`G.06.01-R6`、`U.16-R3`）；最小点击区域 24×24（`U.05-R5`）。

### 6.3 减少动效（`U.07.04`）
- CSS：组件的过渡和动画写在常规规则里，`html[data-motion="reduce"]` 下改为替代效果（只有透明度、静态图形）；`@media (prefers-reduced-motion: reduce)` 不单独写（`boot.js` 与 `themeController` 已把系统设置解析进 `data-motion`，`W.02.03` §6.1）。
- JS 动画（`GlideGroup` 的位置、`Segmented` 的滑块、浮层的进入）在开始前读 `UiEnv.reducedMotion()`。
| 原动效 | 替代 |
|---|---|
| 浮层缩放进入 | 只做透明度 `--hx-t-2` |
| 流动高亮滑动 | 直接到位，只做透明度 |
| 分段滑块滑动 | 直接切换 |
| 旋转弧（`Spinner`、`Button` 加载） | 静态半圆弧 |
| 呼吸点（`StatusDot`） | 静态实色 |
| 按下缩放 | 不缩放 |

### 6.4 文案
- 组件里不写中文字面量（`G.06-R4`）；按钮文字、占位、提示框内容、空状态标题都由 props 传入（调用方已经 `t()` 过）；§4.6 的少数固定读屏文字用 `useT()`。
- 用户和模型写的文字只作为文本节点渲染（`G.06.01-R10`）；`ReactNode` 类型的 props（`children`、`footer`、`content`）由调用方负责内容安全。

### 6.5 规则
| 编号 | 规则 |
|---|---|
| W.08-R1 | `components/ui/**` 只 import：`react`、`react-dom`、`@floating-ui/dom`（只在 `overlay/position.ts`）、`@/lib/i18n`、`@/styles/icons` 和本目录文件；不 import `state`、`ops`、`lib/protocol`、`shell`、`panels`、`pages`、`canvas`、`routes`（`W.01-R5`、`R7`，ESLint 检查，`P.09` K121） |
| W.08-R2 | 目录外只从 `@/components/ui` 导入（§4.2）；每个公开组件都有 `XxxProps` 类型导出（`G.04.02`） |
| W.08-R3 | 类名一律 `hx-块__元素`、变体 `hx-块--变体`、状态 `is-*` / `has-*`（`G.04.06-R1`）；块名只用：`hx-btn`、`hx-iconbtn`、`hx-kbd`、`hx-icon`、`hx-glide`、`hx-input`、`hx-textarea`、`hx-step`、`hx-slider`、`hx-search`、`hx-ferr`、`hx-select`、`hx-seg`、`hx-switch`、`hx-tabs`、`hx-picker`、`hx-ov`、`hx-pop`、`hx-menu`、`hx-dialog`、`hx-tip`、`hx-toastcard`、`hx-badge`、`hx-dot`、`hx-spin`、`hx-progress`、`hx-empty`、`hx-scroll`、`hx-errb`（与 `W.07-R1` 的块名不重叠：提示堆叠是 `W.07.10` 的 `hx-toast`，单条提示是本枝的 `hx-toastcard`） |
| W.08-R4 | 样式只用令牌（`G.06.03-R1`、`R2`）；不用 `!important`、不用 id 选择器、不写 `[data-theme]` / `[data-palette]` 分支（`G.04.06-R3`、`G.06.03-R5`）；减少动效的替代只写在 `html[data-motion="reduce"]` 下 |
| W.08-R5 | 控件不画边框和外框，悬停只加深底色；只有 `:focus-visible` 显示焦点外环（`U.23-R5`、`U.16-R4`，§6.1） |
| W.08-R6 | 动画只动 `transform`、`opacity`（`U.07.01` §2）；时长只用 `--hx-t-1`…`--hx-t-4`、`--hx-t-glide`，持续动画用 `--hx-t-spin`、`--hx-t-breath`（`P.09` K123、K124）；每个动画都有 §6.3 的替代（`U.07.04-R1`） |
| W.08-R7 | 组件全部受控：值、打开状态由 props 给，变化只通过回调告诉调用方；组件只保存"正在编辑、正在拖动"的临时值（`G.06.02-R1`） |
| W.08-R8 | 浮层一律经 `Overlay` 渲染到 `UiEnv.portalRoot()`，层级只用 `--hx-z-*`（`G.06.01-R9`、`G.06.03-R8`、`U.06-R4`）；`popover` / `modal` / `pane` 打开时经 `UiEnv.pushOverlay` 压栈，关闭或卸载时出栈（§6.2） |
| W.08-R9 | 组件不监听 `window` / `document` 的 `keydown` / `keyup`（`W.02.04` §7）；浮层的"外部点击"用 `pointerdown` 捕获阶段监听（只在浮层打开期间，关闭时移除，`G.06.01-R8`） |
| W.08-R10 | 所有可点击元素是 `<button type="button">`；图标按钮必须有 `label`（`aria-label` 与提示框，`G.06.01-R6`、`U.08-R5`）；状态不只靠颜色（`StatusDot` 有形状差异和读屏文字，`U.16-R2`） |
| W.08-R11 | 组件里不写中文字面量（`G.06-R4`）；不用 `dangerouslySetInnerHTML`（`G.06.01-R10`）；`Icon` 用生成好的图标数据创建元素，不插入字符串 HTML |
| W.08-R12 | 布尔 props 用 §4.5 与各叶子 §4 列出的名称（与 HTML / ARIA 同名的 `disabled`、`checked`、`readOnly`、`autoFocus`、`open`、`pressed`、`invalid`，以及 `loading`、`glass`、`mono`、`danger`、`model`、`breathing`、`filterable`、`autosize`、`trapFocus`、`closeOnOutside`、`scrim`、`dismissible`、`busy`），不另加 `is` 前缀（`G.04.02` 的例外，`P.09` K125）；新增布尔 props 按 `G.04.02` 加 `is` / `has` / `can` |
| W.08-R13 | `ErrorBoundary` 是全前端唯一允许的 class 组件（React 19 的错误边界只能用 class 写，`G.06-R2` 的例外，`P.09` K129） |
| W.08-R14 | 组件测试用 `vitest` + `jsdom`，渲染用 `react-dom/client` 的 `createRoot` 与 `act`，浮层定位相关的用例 `vi.mock('@floating-ui/dom')`；不引入未登记的测试库（`G.10-R1`） |

## 7. 不变量
- `components/ui` 里没有任何 import 指向 `state`、`ops`、`lib/protocol`、`shell`、`panels`、`pages`、`canvas`、`routes`。
- 任何时刻打开着的浮层都挂在 `UiEnv.portalRoot()` 下，且每个 `popover` / `modal` / `pane` 浮层在 `W.02.04` 的栈里恰好有一项；浮层卸载后栈里没有它。
- 本枝组件在平移、缩放、拖动、运行状态更新期间不产生任何 React 提交（它们不订阅任何外部数据，`U.17-R10`）；`GlideGroup` 的移动、`NumberStepper` 拖动中的数值显示只写 DOM 样式，不 `setState`（`NumberStepper` 的 `onChange` 由调用方决定是否提交）。
- 组件 CSS 里没有颜色、尺寸、时长的裸值（stylelint 通过）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `Icon` 的 `name` 不在图标表里 | 显示"扩展"图标（`U.08-R4`），开发模式 `console.warn` 一次（与 `W.06.03` §8 同一规则） |
| 没有 `UiEnvProvider` | `FALLBACK_ENV`：浮层照常显示，但不经注册中心处理按键（只有开发和测试会出现），开发模式 `console.warn` 一次 |
| `Popover` 的锚点元素已从页面移除 | 调 `onClose('outside')`（`autoUpdate` 发现锚点不在文档里时） |
| 组件渲染抛错 | 不在组件内吞掉；由调用方外层的 `ErrorBoundary` 接住（`W.07` §8） |
| 受控值不合法（`NumberStepper` 的 `value` 超出 `min` / `max`、`Select` 的 `value` 不在选项里） | 照样显示传入的值（`Select` 显示 `placeholder`），开发模式 `console.warn` 一次；不自动改值、不回调 |

## 9. 性能与资源
- 首屏会用到的组件（按钮、图标、输入、选择、浮层、反馈）合计 ≤ 30KB（gzip，不含 `@floating-ui/dom`），由 `W.11` 的包体积检查把关；图标表按需引用，不内联进 CSS。
- `Picker`、`Select` 选项超过 200 项时只渲染可见部分加上下各 10 项（`W.07` §9）；打开 ≤ 50ms（500 项）。
- 浮层打开到第一帧 ≤ 16ms（定位计算在 `useLayoutEffect` 里同步完成，避免闪到左上角）。
- `GlideGroup` 每次指针移动最多一次 `requestAnimationFrame` 回调、一次 `elementFromPoint`、两次 `getBoundingClientRect`。

## 10. 验收标准
1. 五个叶子的验收全部通过。
2. `W.07` §4.3 表中每一个组件、每一个 props 都存在且类型一致（`W0801-T1`…`W0805-T*` 中的"props 对照"用例；补充 props 见 §4.5）。
3. ESLint：`components/ui/**` import `@/state/x`、`@/shell/keys`、`@/lib/protocol` 都报错；目录外 import `@/components/ui/button/Button` 报错。
4. stylelint：组件 CSS 没有裸值、没有 `!important`、没有 `[data-theme]`；类名全部符合 `G.04.06` 的模式与 W.08-R3 的块名表。
5. 浅色 / 深色 × 四套配色截图（`W.07` 各叶子的 visual 用例覆盖）：控件没有边框；键盘 Tab 时有焦点外环，鼠标点击时没有。
6. 打开减少动效：§6.3 表中每一项都换成替代效果，状态仍可分辨（`U.07.04-R1`）。
7. 只用键盘能操作每一个组件（Tab 进入、Enter / 空格 / 方向键 / Esc），读屏能读出名称、状态和值（`U.16-R3`、`R5`）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版：目录与分工、唯一出口、`UiEnv`、共用类型、`W.07` §4.3 落实表、外观 / 键盘 / 动效 / 文案约定、W.08-R1–R14 | 第 9 棒；`P.09` K121–K130 |
