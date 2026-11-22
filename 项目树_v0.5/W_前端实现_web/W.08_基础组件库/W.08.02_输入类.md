# W.08.02 输入类

| 项 | 内容 |
|---|---|
| 编号 | W.08.02 |
| 类型 | 实施 |
| 上级 | W.08 基础组件库 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设10 §10.4–§10.7；设计规范 v0.3 `src/06_controls.css`（`.hx-input`、`.hx-step`）；demo v0.5（v0.5.11）`17_fix.css`（搜索框透明底、聚焦 `bg-2`）；`P.09` K125–K127 |
| 最后修改 | 2026-11-23 |

## 1. 职责
单行输入 `TextInput`、多行输入 `TextArea`、数字步进 `NumberStepper`、滑块 `Slider`、搜索框 `SearchInput`，以及它们共用的字段错误行 `FieldError`、数值计算 `stepMath.ts`、自动增高 `autosize.ts`。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 哪种参数用哪种控件、参数行的标签与布局、"由上游提供"的斜纹只读 | `C.03.02` §4、`W.07.03`（`U.11-R2`） |
| 把一次拖动合并成一条 Op（`gesture('step')`） | 调用方经 `W.05` 的 `ops.gesture`（本文只保证 `onStart` → `onChange`* → `onEnd` 成对出现，`U.11` §2） |
| 输入内容的业务校验（表达式语法、长度上限的提示文案） | 调用方（把结果放进 `error`） |
| YAML / 代码高亮编辑框 | `W.07.03` 的大编辑器（v1 用 `TextArea mono`，高亮不在本枝） |
| 对话框的发送键、`@` / `/` 菜单、草稿 | `W.07.07`（用 `TextArea` 的 `onKeyDown`、组字回调） |
| 节点上的内联数字 / 文本控件 | `W.06.03`（原生 DOM，外观与本文一致） |

## 3. 继承的上级约束
`W.08` §4–§6、`W.08-R1`–`R14`；`W.07` §4.3（`TextInput`、`TextArea`、`NumberStepper`、`Slider`、`SearchInput` 五行）；`W.02.04` §6.2 第 1 步（组字）、§7；`C.05.04` §4（拖动合并）；`G.06.01-R5`、`R8`；`U.11` §1、§2（数字步进、滑块、单行输入、多行输入）；`U.13.04-R6`；`U.14.03` §1（字段级错误）；`U.16-R3`、`R4`；`U.23-R5`；`U.07.04`；`P.09` K125–K127。

## 4. 接口

### 4.1 组件
```tsx
// web/src/components/ui/input/TextInput.tsx
type FieldBase = {
  size?: Size;                          // 缺省 'md'
  id?: string;                          // 缺省 useId()
  ariaLabel?: string;                   // 没有可见 <label for> 时必填（开发模式检查）
  disabled?: boolean;
  disabledReason?: string;
  readOnly?: boolean;
  lockReason?: string;                  // 有值 → 只读 + 右侧锁图标，悬停显示原因（U.11 §1）
  invalid?: boolean;                    // 底色 danger-weak、aria-invalid
  error?: string;                       // 下方一行红字（含 invalid 效果，U.14.03 §1）
  mono?: boolean;                       // 路径、表达式、类型名
};
export type TextInputProps = FieldBase & {
  value: string;
  onChange(v: string): void;
  onCommit?(v: string): void;           // Enter 或失焦（Esc 之后的失焦不算）
  onCancel?(): void;                    // Esc；调用方负责把 value 恢复
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
  inputRef?: React.Ref<HTMLInputElement>;
};
export function TextInput(p: TextInputProps): JSX.Element;

// web/src/components/ui/input/TextArea.tsx
export type TextAreaProps = FieldBase & {
  value: string;
  onChange(v: string): void;
  onCommit?(v: string): void;           // 失焦，或 Mod+Enter（onKeyDown 没有 preventDefault 时）
  onCancel?(): void;                    // Esc
  placeholder?: string;
  autoFocus?: boolean;
  minRows?: number;                     // 缺省 3
  maxRows?: number;                     // 缺省 12；超过后出现滚动条
  autosize?: boolean;                   // 缺省 true
  counter?: { max: number };            // 右下角"128 / 300"，超出变 danger，不截断（设10 §10.7）
  onKeyDown?(e: React.KeyboardEvent<HTMLTextAreaElement>): void;   // 先于内部处理；preventDefault 后内部不再处理
  onCompositionStart?(): void;
  onCompositionEnd?(): void;
  inputRef?: React.Ref<HTMLTextAreaElement>;
};
export function TextArea(p: TextAreaProps): JSX.Element;

// web/src/components/ui/input/NumberStepper.tsx
export type NumberStepperProps = Omit<FieldBase, 'mono'> & {
  value: number;
  min?: number;
  max?: number;
  step?: number;                        // 缺省 1；小数位数决定显示和取整精度
  onStart(): void;                      // 一次手势开始（调用方 ops.gesture('step')）
  onChange(v: number): void;            // 手势中的新值（每帧最多一次，值不变不调用）
  onEnd(v: number): void;               // 手势结束，带最终值
  format?(v: number): string;           // 显示用（单位、千分位）；缺省按 step 的小数位
  ariaLabel: string;
};
export function NumberStepper(p: NumberStepperProps): JSX.Element;

// web/src/components/ui/input/Slider.tsx
export type SliderProps = Omit<FieldBase, 'mono' | 'lockReason'> & {
  value: number; min: number; max: number; step: number;
  onStart(): void; onChange(v: number): void; onEnd(v: number): void;
  format?(v: number): string;           // 浮出数值的显示
  ariaLabel: string;
};
export function Slider(p: SliderProps): JSX.Element;

// web/src/components/ui/input/SearchInput.tsx
export type SearchInputProps = {
  value: string;
  onChange(v: string): void;
  onClear(): void;                      // 清空按钮、或 Esc（onEscape='clear' 且有内容时）
  inputRef?: React.Ref<HTMLInputElement>;   // 调用方用它聚焦（/ 键、命令面板打开）
  shortcut?: string;                    // 空且没聚焦时右侧淡显的按键（Kbd inline）
  placeholder?: string;
  ariaLabel: string;
  size?: Size;
  autoFocus?: boolean;
  onEscape?: 'clear' | 'none';          // 缺省 'clear'；'none' 时 Esc 不处理，交给外层浮层关闭
  onKeyDown?(e: React.KeyboardEvent<HTMLInputElement>): void;   // 先于内部处理（把方向键交给 Picker）
  ariaControls?: string;                // 有值 → role="combobox"、aria-expanded、aria-autocomplete="list"
  ariaActiveDescendant?: string;
};
export function SearchInput(p: SearchInputProps): JSX.Element;

// web/src/components/ui/input/FieldError.tsx —— 本目录内部用，也从 index 导出给 W.07 的自定义字段
export function FieldError(p: { id: string; text: string }): JSX.Element;
```
```ts
// web/src/components/ui/input/stepMath.ts —— 纯函数
export const DRAG_THRESHOLD = 3;        // px：小于它视为点击（设10 §10.4）
export const PX_PER_STEP = 4;           // 每 4px 改变 1 个 step
export const REPEAT_DELAY = 400;  export const REPEAT_EVERY = 60;   // ms：± 按钮长按
export const IDLE_END = 500;            // ms：方向键、滚轮连续操作在最后一次之后多久算结束
export const HINT_MS = 3000;            // ms：越界提示停留
export function decimals(step: number): number;                        // 0.05 → 2
export function roundTo(v: number, step: number): number;              // 按 step 的小数位四舍五入，消除 0.30000000000000004
export function clamp(v: number, min?: number, max?: number): number;
export function dragDelta(acc: number, movementX: number, mod: { shift: boolean; alt: boolean }): { steps: number; acc: number };   // Shift ×10、Alt ×0.1
export function nudge(v: number, dir: 1 | -1, step: number, big: boolean, min?: number, max?: number): number;   // 方向键 / 按钮 / 滚轮
export function parseTyped(text: string): number | null;               // 只认十进制数（可带正负号、小数点）；其余 null
// web/src/components/ui/input/autosize.ts
export function fitRows(el: HTMLTextAreaElement, minRows: number, maxRows: number): void;   // 写 style.height（几何值，G.06.03-R9）
```

### 4.2 依赖
`W.08` §4.4 的 `Size`；`W.08.01` 的 `Icon`、`Kbd`；`W.08.04` 的 `Tooltip`（禁用原因、锁定原因）；`@/lib/i18n` 的 `useT`（`ui.clear`、`ui.decrease`、`ui.increase`、`ui.locked`、`ui.max`、`ui.min`）。

## 5. 数据结构
本文私有：§4.1 的 props；组件内部状态——`TextInput` / `TextArea` 的"本次 Esc 后不提交"标记（`useRef`）；`NumberStepper` 的 `mode: 'idle' | 'dragging' | 'repeat' | 'keys' | 'wheel' | 'editing'`、拖动累计量、编辑中的文字（`useState`，只在 `editing` 时）、越界提示文字；`Slider` 的 `active: boolean`（浮出数值是否显示）。

## 6. 行为

### 6.1 共同外观（`U.11` §1、`W.08` §6.1）
- 高 `--_h`（`md` 28 / `sm` 24），底 `bg-4`、无边框、圆角 `r-sm`；悬停 `bg-5`；获得焦点时底 `bg-2`（文本类，demo `17_fix.css`）、`:focus-visible` 外环；占位 `text-3`；`mono` 用 `--hx-font-mono`、`fs-12`。
- `error` / `invalid`：底 `danger-weak`；`aria-invalid="true"`；`error` 有值时下方 `FieldError`（`<p class="hx-ferr" id>`，`danger`、`fs-12`），输入元素 `aria-describedby` 指向它（`设10` §10.6："不要只变色不说原因"）。
- `lockReason`：`readOnly`，右侧 `Icon name="lock" size=14`（`text-3`，`aria-label = t('ui.locked')`），整个控件外包 `Tooltip content={lockReason}`。
- `disabledReason`：同 `W.08.01` §6.1：`aria-disabled`、`readOnly`，可聚焦，悬停 / 聚焦显示原因；没有原因时原生 `disabled`。
- 所有组件在 `e.nativeEvent.isComposing` 或 `keyCode === 229` 时不处理 Enter、Esc、方向键（`U.13.04-R6`）。

### 6.2 `TextInput`
- `onChange` 每次输入都调（受控）；`Enter` → `onCommit(value)`，`preventDefault`；失焦 → `onCommit(value)`；`Esc` → 有 `onCancel` 时调用并 `stopPropagation`，置"本次不提交"标记，然后 `blur()`——随后的失焦不再 `onCommit`；没有 `onCancel` 时不处理 `Esc`（交给外层浮层）。
- 是否真的保存（值没变就不提交）由调用方判断；本组件不比较。
- `maxLength` 用原生属性；超出由浏览器阻止。

### 6.3 `TextArea`
- 行高 1.55、`fs-13`（`mono` 时 `fs-12`）；`autosize` 时每次 `value` 变化后在 `useLayoutEffect` 里 `fitRows`：先写 `height: auto` 读 `scrollHeight`，夹到 `[minRows, maxRows] × 行高 + 上下内边距` 再写回；行高在挂载时从计算样式读一次。超过 `maxRows` 时 `overflow-y: auto`，滚动条按 `W.08.05` `ScrollArea` 同一规则隐藏（`.hx-textarea` 复用 `hx-scroll` 的滚动条样式类）。
- 按键顺序：先调 `onKeyDown`，`e.defaultPrevented` 为真就结束；否则：`Esc` → 同 `TextInput`；`Mod+Enter`（`ctrlKey` 或 `metaKey`）→ `onCommit(value)`、`preventDefault`；普通 `Enter` 换行（浏览器默认）。对话框的发送键由 `W.07.07` 在 `onKeyDown` 里处理并 `preventDefault`。
- 失焦 → `onCommit(value)`（Esc 后的除外）。
- `counter`：右下角 `text-3` `fs-11` mono"{长度} / {max}"，长度 > max 时 `danger`；不截断输入。
- `onCompositionStart` / `End` 原样转发（`W.07.07` 用它判断是否在组字）。

### 6.4 `NumberStepper`（`U.11` §2、`设10` §10.4、`C.05.04` §4）
结构：`<div class="hx-step hx-ctl" role="group">[−] <span class="hx-step__v" role="spinbutton" tabindex="0" aria-valuenow aria-valuemin aria-valuemax aria-valuetext aria-label>{format(value)}</span> [+]</div>`；`−` / `+` 是 `tabIndex=-1` 的 `<button>`（`aria-label` 为 `ui.decrease` / `ui.increase`），焦点只停在数值上。数值 mono、`tabular-nums`、居中；悬停数值时 `cursor: ew-resize`。

一次"手势"总是 `onStart()` → 若干次 `onChange(v)`（值变化才调）→ `onEnd(最终值)`，中间不会穿插另一手势：
| 操作 | 手势开始 | 每次变化 | 手势结束 |
|---|---|---|---|
| 在数值上按下并水平拖动 ≥ 3px | 越过阈值时；`requestPointerLock()`（失败就用指针捕获） | 每帧最多一次：`dragDelta` 累计 `movementX`（`Shift` ×10、`Alt` ×0.1），按 `step` 取整、夹到范围 | 松开、`pointercancel`、失去指针锁 |
| 点 `−` / `+` | 按下 | 按下立即一步；按住 400ms 后每 60ms 一步 | 松开、指针离开按钮 |
| 数值有焦点时方向键（`↑` `→` +1 步，`↓` `←` −1 步；`Shift` 或 `PageUp` / `PageDown` ×10；`Home` / `End` 到 `min` / `max`） | 第一次按键 | 每次按键（含自动重复） | 最后一次按键后 500ms，或失焦 |
| 数值有焦点时滚轮（每格 1 步，`Shift` ×10） | 第一格 | 每格 | 最后一格后 500ms，或失焦 |
| 双击数值或按 `Enter` → 变成输入框（全选），`Enter` 提交 | 提交时 | 提交时一次（`parseTyped` 成功；越界先夹紧并显示"最大为 32"3 秒） | 提交后立即 |
- 拖动中：数值区底 `bg-5`；显示的数字直接写进 `.hx-step__v` 的文本（不 `setState`，`W.08` §7）；上方浮出当前值（与提示框同样式的数值标签，用 `Overlay layer='tooltip'`）。
- 滚轮只在数值**已有焦点**时生效（避免和画布、面板滚动冲突），用元素自己的 `wheel` 监听（`passive: false`，挂在 `.hx-step__v` 上），有焦点时 `preventDefault`。
- 输入框编辑：`Esc` 取消回到原值（`stopPropagation`），`parseTyped` 失败 → 错误态（`danger-weak` 底），不提交，不退出编辑；失焦等同 `Enter`。
- 到达 `min` 时 `−` 按钮置灰（原生 `disabled`），`max` 同理；拖动越界停在边界，不抖动。
- 禁用 / 锁定：不响应任何手势；锁定时右侧锁图标代替 `+` 按钮的位置之后（`U.11` §1）。

### 6.5 `Slider`（`U.11` §2、`设10` §10.5）
- 原生 `<input type="range">` 自定义外观：轨道高 4px（`var(--hx-s-2)`）、底 `bg-5`、圆角 `r-full`；已填充部分 `text-2`（不用强调色）：`background: linear-gradient(to right, var(--hx-text-2) var(--_p), var(--hx-bg-5) var(--_p))`，`--_p` 由组件按值写百分比（几何值，`G.06.03-R9`）；拇指 12px（`var(--hx-s-5)`）圆、`bg-3`、`shadow-node`；悬停拇指 `transform: scale(1.17)`。
- 手势：`pointerdown` → `onStart`；`input` 事件 → `onChange(Number(v))`；`pointerup` / `pointercancel` → `onEnd`。键盘（浏览器原生：方向键 1 步、`PageUp` / `PageDown` 10 步、`Home` / `End`）：第一次按键 `onStart`，`input` → `onChange`，最后一次按键后 500ms 或失焦 → `onEnd`。
- 拖动中和键盘调整后 500ms 内，拇指上方浮出数值（`format(value)`，`Overlay layer='tooltip'` 跟随拇指位置）。
- `aria-label`、`aria-valuetext = format(value)`。
- 减少动效：拇指不缩放。

### 6.6 `SearchInput`
- 左侧 `Icon name="search" size=14`（`text-3`），右侧：有内容时清空按钮（`<button class="hx-search__clear">`、`Icon x`、`aria-label = t('ui.clear')`，`tabIndex=-1`，点击 → `onClear()` 并把焦点留在输入框）；没内容、没聚焦且有 `shortcut` 时淡显 `Kbd inline`。
- 底色：平时透明，悬停 `bg-4`，聚焦 `bg-2`（侧栏、节点库的搜索框，`demo 17_fix.css`）。
- 按键：先调 `onKeyDown`（`defaultPrevented` 就结束）；`Esc`：`onEscape='clear'` 且有内容 → `onClear()`、`stopPropagation`；没内容 → `blur()`，不拦截（外层浮层可以接着关闭）；`onEscape='none'` → 不处理。
- `<input type="text" role="searchbox">`；有 `ariaControls` 时改为 `role="combobox"`、`aria-expanded="true"`、`aria-controls`、`aria-autocomplete="list"`、`aria-activedescendant`（配合 `W.08.03` `Picker`，焦点留在输入框）。

## 7. 不变量
- `NumberStepper` 与 `Slider` 的每个 `onStart` 都恰好对应一个 `onEnd`（包括被禁用、卸载、失焦打断时：卸载前补发 `onEnd(当前值)`）。
- 一次拖动 / 长按 / 连续方向键只产生一对 `onStart` / `onEnd`，所以调用方合并成一条 Op（`U.11` §2、`C.05.04` §4）。
- 组字中按 `Enter` 不会触发 `onCommit`。
- Esc 取消之后不会再触发 `onCommit`。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `requestPointerLock` 被拒绝或不支持 | 改用 `setPointerCapture`，按 `clientX` 差值计算（`dragDelta` 用差值代替 `movementX`） |
| `value` 超出 `min` / `max`（数据来自旧版本） | 照样显示；第一次用户操作时从夹紧后的值开始（`W.08` §8） |
| `step ≤ 0` 或不是有限数 | 开发模式抛错；生产模式按 1 处理并 `console.error` 一次 |
| 输入框编辑时解析失败 | 错误态，不提交（§6.4） |
| 手势进行中组件被卸载 | 补发 `onEnd(当前值)`，退出指针锁、清计时器（`G.06.01-R8`） |

## 9. 性能与资源
- 拖动 `NumberStepper` 2 秒：`onChange` ≤ 120 次（每帧最多一次），组件自身 React 提交 0 次（数值直接写文本节点）。调用方用 `gesture('step')` 时，提交给服务端的次数由 `W.05` 的 250ms 节流决定（`W.05` §6.8）。
- `TextArea` 自动增高每次输入一次布局读写（`scrollHeight`），500 行内容 ≤ 2ms。

## 10. 验收标准
1. `TextInput`：Enter 提交一次；失焦提交一次；Esc 调 `onCancel` 且之后失焦不提交；用中文输入法组字时 Enter 选词不提交（`W.02.04` §10 验收 3）。
2. 字段错误：`error="找不到字段 achived"` → 下方红字、`aria-describedby` 指向它、读屏读出错误；没有红色外框（`U.23-R5`）。
3. `NumberStepper`：拖动 2 秒只有 1 对 `onStart` / `onEnd`；`Shift` 拖动变化快 10 倍；`0.1 + 0.2` 显示 `0.3`；双击输入 `abc` 不提交、输入 `99`（max 32）提交 32 并提示"最大为 32"；滚轮只在聚焦后生效；方向键连按 5 次只产生 1 对手势。
4. `Slider`：拖动时上方浮出数值；键盘方向键能调整；已填充部分是 `text-2` 色。
5. `SearchInput`：有内容时出现清空按钮；Esc 第一次清空、第二次失焦；`onEscape='none'` 时 Esc 关闭外层弹层。
6. `TextArea`：内容从 1 行增加到 20 行，高度从 3 行涨到 12 行后出现滚动条（滚动条平时隐藏）；`counter` 超出变红但不截断。
7. 锁定的输入框：只读、右侧锁图标、悬停说明原因。

### 实施卡
- 要建 / 要改的文件：`web/src/components/ui/input/TextInput.tsx`、`TextArea.tsx`、`NumberStepper.tsx`、`Slider.tsx`、`SearchInput.tsx`、`FieldError.tsx`，每个同名 `.css`、`.test.tsx`；`input/stepMath.ts`、`stepMath.test.ts`、`autosize.ts`、`autosize.test.ts`；`web/src/components/ui/index.ts`（只加本文的导出行）。
- 不许碰的文件：`web/src/components/ui/` 的其他子目录、`types.ts`、`base.css`（需要新的共用类时上报 `W.08.01`）；`web/src/styles/`（生成物）；`state/`、`ops/`、`shell/`、`panels/`、`pages/`、`canvas/`、`lib/protocol/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0802-T1 props 对照`：五个组件含 `W.07` §4.3 对应行的全部 props（`expectTypeOf`）；补充 props 与 `W.08` §4.5 一致
  - `W0802-T2 提交与取消`：Enter → `onCommit` 1 次；blur → 1 次；Esc → `onCancel` 1 次、随后 blur 0 次 `onCommit`；没有 `onCancel` 时 Esc 事件冒泡（`stopPropagation` 未调用）
  - `W0802-T3 组字`：`keydown{key:'Enter', isComposing:true}` 与 `keyCode=229` → 不提交
  - `W0802-T4 错误与锁定`：`error` → `.hx-ferr` 文本、`aria-invalid`、`aria-describedby`；`lockReason` → `readOnly`、锁图标、提示框文字
  - `W0802-T5 stepMath`：`decimals(0.05)=2`；`roundTo(0.1+0.2, 0.1)=0.3`；`clamp(40, 1, 32)=32`；`dragDelta(0, 9, {shift:false,alt:false})` → `{steps:2, acc:0.25}`；`shift` → `steps:22`；`alt` + 整数 step → 至少 1 步的累计规则；`parseTyped('3*2')=null`、`parseTyped(' -1.5 ')=-1.5`
  - `W0802-T6 拖动手势`：按下后移动 2px → 无 `onStart`；再移动到 10px → `onStart` 1 次、`onChange` 带新值；30 次 `pointermove` 在同一帧 → `onChange` ≤ 1 次；松开 → `onEnd` 1 次；组件渲染次数不变
  - `W0802-T7 长按`：按住 `+` 1 秒（假时钟）→ 按下立即 1 次，第 400ms 起每 60ms 1 次（400、460…1000），`onChange` 共 12 次；`onStart` / `onEnd` 各 1
  - `W0802-T8 方向键合并`：连按 `↑` 5 次（间隔 100ms）→ `onStart` 1、`onChange` 5、500ms 后 `onEnd` 1；`Shift+↑` 一次 +10 步；`End` → max
  - `W0802-T9 滚轮`：未聚焦时 `wheel` 不改值、不 `preventDefault`；聚焦后改值并 `preventDefault`
  - `W0802-T10 输入编辑`：双击 → 输入框全选；输入 `abc` + Enter → 不提交、错误态；输入 `99` + Enter（max 32）→ `onChange(32)`、提示文字 `ui.max`
  - `W0802-T11 卸载补发`：拖动中卸载 → `onEnd` 被调用 1 次
  - `W0802-T12 Slider`：`pointerdown` → `onStart`；`input` → `onChange`；`pointerup` → `onEnd`；`--_p` 为 `(value−min)/(max−min)` 的百分比
  - `W0802-T13 SearchInput`：有值 Esc → `onClear` 且 `stopPropagation`；无值 Esc → blur 且不拦截；`onEscape='none'` → 不处理；`ariaControls` → `role="combobox"`
  - `W0802-T14 TextArea`：`onKeyDown` 里 `preventDefault` 的 Enter → 内部不处理；`Mod+Enter` → `onCommit`；`fitRows`（mock `scrollHeight`、行高 20）→ 高度夹在 3–12 行
- 允许使用的依赖：`react`、`react-dom`；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部；另：不用 `eval` / `new Function` 解析输入（`parseTyped` 只认数字）；拖动中不 `setState`；不给输入框加边框、错误外框；不在 `window` / `document` 上监听键盘或滚轮。
- 完成标志：`G.14` 全部条件；§10 七条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 9 棒；`P.09` K125–K127 |
