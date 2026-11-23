# W.10 国际化与格式化

| 项 | 内容 |
|---|---|
| 编号 | W.10 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设18（只作参考）；`U.15`；`G.13`；`C.01` §3；`C.04.02`；demo v0.5.11 `39_monitor.js`、`32_sessions.js`、`36_composer.js`、`34_center.js`（数字与时间的写法，差异见 §6.3 末尾）；`P.09` Q9、Q15、K158–K165 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`web/src/lib/i18n/`：唯一的界面文案表 `zh.ts` 和取文案的 `t` / `useT`；由 `schema/builtin/messages/*.zh.yaml` 生成的错误文案与端口兼容提示；数字、token、金额、时长、字节、百分比、时间的格式化和金额输入的解析；相对时间的统一刷新；"组件里不写中文字面量"和文案表本身的检查。v1 只有简体中文（`P.09` Q15），不做语言切换；但所有文案都抽取出来，以后加语言只需要加一份文案表。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 各区域具体写什么字、用什么词 | 用词与句式按 `U.15`、`P.06`；各区域的键和文案由该区域的叶子在 `zh.ts` 自己的区段里写（§4.3）。本文只定稿 §4.4 列出的四组 |
| 错误码、端口兼容提示的文案内容 | `C.11`、`C.04.02` 与 `schema/builtin/messages/*.zh.yaml`（本节点只用生成物，`G.13-R5`） |
| 服务端返回的 `message`、诊断的 `msg` | 后端按同一份 yaml 渲染（`B.03.03`、`E.03.04`）；前端原样显示 |
| "复制错误详情"的内容 | `W.04.01` 的 `errorReport` |
| 快捷键组合的显示（`⌘` / `Ctrl`） | `W.02.04` 的 `keys.label` |
| 包、连接类型、设置项、模板、节点类型自带的 `label` / `help` / `description` | 它们是数据，原样显示（`W.09` §4.5、`U.15-R3`） |
| 用户和模型写的文字 | 原样作为文本节点渲染（`W.07-R3`） |
| 字体子集 | `tools/gen fonts`（`U.04-R2`）；本节点只保证 `zh.ts` 能被它扫描（§4.2） |
| 日期选择控件、时区设置 | v1 没有；一律按浏览器所在时区显示（INV-23） |

## 3. 继承的上级约束
`W-R9`、`R12`、`R13`；`W.01-R5`–`R8`；`W.02.04` §4.1（`label` 是文案键）；`W.03.03` §4（`Toast.text` 是翻译后的文案）；`W.04.04-R8`、`R10`；`W.05` §4.1（`Precheck.textKey`）、§6.2；`W.06` §4.2（`EngineDeps.t`）、`W.06-R8`（按 `P.09` K159 修改后）；`W.06.15` §6.2（数字格式由变量处理）；`W.07` §4.4、`W.07-R3`；`W.08` §4.6、`W.08-R1`；`W.09` §4.5；`G.06-R4`；`G.10-R1`、`R3`；`G.13-R2`、`R5`、`R8`；`G.02.05-R1`、`R26`、`R28`；`C.01-R8`–`R10`、`R18`；`C.04.02-R2`；`U.15` 全部；`U.14.01`（超过 2 秒写明在加载什么）；`U.04-R2`；`P.09` Q9、Q15；INV-23。

## 4. 接口

### 4.1 对外（唯一入口 `@/lib/i18n`）
```ts
// web/src/lib/i18n/index.ts —— 目录外只从这里导入（W.01-R8）
export type { TextKey, Vars, Translate } from './t';
export { t, useT, hasText } from './t';
export { CURRENCY, fmtCount, fmtTokens, fmtCost, fmtCostInput, fmtDuration, fmtBytes, fmtPercent,
         fmtRelTime, fmtAbsTime, parseCostInput } from './format';
export { useNow, setClock } from './clock';
export { RelTime } from './RelTime';
export { errorText } from './errors';

// web/src/lib/i18n/t.ts
import { zh } from './zh';
export type TextKey = keyof typeof zh;                 // 'top.run.start' | 'ui.close' | …（只含 zh.ts 里的键）
export type Vars = Readonly<Record<string, string | number>>;
export type Translate = {
  (key: TextKey, vars?: Vars): string;                // 代码里写死的键：拼错在编译期报错
  dyn(key: string, vars?: Vars): string;              // 运行时才知道的键：Precheck.textKey、EditBlock.textKey、FieldIssue.textKey、err.* / assign.*
};
export const t: Translate;
export function useT(): Translate;                    // 返回同一个 t：不订阅任何东西，不引起重渲染
export function hasText(key: string): boolean;        // W.02.04 检查快捷键 label、W.06 检查 canvas.* 用

// web/src/lib/i18n/format.ts —— 全部是纯函数
export const CURRENCY: { readonly symbol: '¥'; readonly code: 'CNY' };   // v1 固定人民币（P.09 Q9、K160）
export function fmtCount(n: number): string;          // 9999 → "9999"；12345 → "1.2 万"；150000000 → "1.5 亿"
export function fmtTokens(n: number): string;         // 规则同 fmtCount；"tokens"写在文案里（U.15-R4）
export function fmtCost(micros: number): string;      // 420000 → "¥0.42"；0 → "¥0"；1–4999 → "<¥0.01"
export function fmtCostInput(micros: number): string; // 金额输入框里的原值，不舍入、不带 ¥：35000 → "0.035"；2000000 → "2"（parseCostInput 的逆）
export function fmtDuration(ms: number): string;      // 400 → "<1 秒"；3200 → "3.2 秒"；12000 → "12 秒"；185000 → "3 分 05 秒"
export function fmtBytes(n: number): string;          // 512 → "512 B"；1288490189 → "1.2 GB"
export function fmtPercent(ratio: number): string;    // 0.724 → "72%"；0.004 → "<1%"
export function fmtRelTime(iso: string, now?: number): string;   // "刚刚""2 分钟前""3 小时前""昨天""4 天前""11-02""2025-03-01"
export function fmtAbsTime(iso: string, o?: { seconds?: boolean; zone?: boolean }): string;   // "2026-11-23 09:12:05"；zone → 末尾加"（UTC+08:00）"
export function parseCostInput(text: string): number | null;     // "0.42"、"¥0.42"、"１,２３４.５" → micros 整数；空、负数、超过 6 位小数、不是数字 → null

// web/src/lib/i18n/clock.ts
export function useNow(): number;                     // 每到整分钟变一次；全应用共用一个定时器（§6.4）
export function setClock(src: { now(): number; frozen?: boolean } | null): void;   // 测试与性能基准（W.11）注入；null 恢复 Date.now

// web/src/lib/i18n/RelTime.tsx
export function RelTime(p: { iso: string; className?: string }): JSX.Element;
// <time dateTime={iso} title={fmtAbsTime(iso, {zone: true})}>{fmtRelTime(iso, useNow())}</time>（U.15-R4：悬停显示本地绝对时间）

// web/src/lib/i18n/errors.ts
export type ErrorLike = { code: string; message?: string; details?: unknown } | { kind: 'network' | 'timeout' | 'aborted' };
export function errorText(e: ErrorLike): string;      // §6.2；ApiError、NetError（W.04.01）按结构传入，本目录不 import lib/protocol
```

### 4.2 文案表的写法
```ts
// web/src/lib/i18n/zh.ts —— 唯一的界面文案表（U.15-R5）；按 §4.3 的顺序分区段
export const zh = {
  // ── common. 通用（W.10）──
  'common.cancel': '取消',
  'common.retry': '重试',
  // ── top. 顶部条（W.07.01）──
  'top.run.start': '运行',
  'top.run.elapsed': '已运行 {ms:duration}',
  // …
} as const satisfies Record<string, string>;
```
- 平铺的一层对象，键是完整的 `区域.对象.用途`（`U.15-R6`），不嵌套——`TextKey` 就是 `keyof typeof zh`，扫描器也只需逐行读。
- 每个值是一行内的单引号字符串字面量：不拼接、不用模板字符串、不调函数（`tools/gen fonts` 逐行扫描取字，`U.04-R2`）。
- 变量写 `{名字}`；需要格式化的数字或时间写 `{名字:格式}`，格式只有 §6.1 表里的 8 种。
- 文案是纯文本：不含 HTML、Markdown；句中要放按钮或链接时，由组件把文字和按钮分开排（例如"AI 修改了 3 处 · 查看 · 全部撤销"是一段文案加两个按钮，`W.07.10`）。

### 4.3 键前缀与归属
文案键的第一段必须在下表里（`zh.test.ts` 检查）；`zh.ts` 按下表顺序分区段，每个区段只由"谁写"一列的叶子增删。

| 前缀 | 区域 | 谁写 |
|---|---|---|
| `common.` | 两个及以上区域共用的词（按钮、状态、网络错误） | `W.10` 定初始一批（§4.4.1）；以后任何叶子都可以加，条件是至少两个区域要用 |
| `fmt.` | 格式化函数里的字（"刚刚""分钟前""万"） | `W.10`（§4.4.2） |
| `shell.` | 启动、401 整页说明、版本更新提示、路由跳转提示 | `W.02`、`W.02.01`–`W.02.03` |
| `shortcut.` | 快捷键说明：`shortcut.<id>`，`<id>` 为 `shortcuts.yaml` 的 `id` | `W.02.04` |
| `ops.` | 修改图的结果提示；`ops.precheck.*` 由 `W.10` 定稿（§4.4.4） | `W.05` |
| `canvas.` | 画布引擎（只经 `deps.t`） | `W.06` |
| `top.` `ls.` `insp.` `chat.` `mon.` `dock.` `comp.` `float.` `appr.` `notice.` `menu.` | 面板 | `W.07.01`–`W.07.11`（与 `W.07` §4.4 同序） |
| `ui.` | 基础组件自带的读屏文字 | `W.08`；初始一批由 `W.10` 建（§4.4.3） |
| `home.` | 会话首页与空状态 | `W.09.01` |
| `center.` `set.` `lib.` | 中心窗口外壳、设置、资源库 | `W.09.02` |
| `welcome.` `tour.` | 首次引导、画布导览 | `W.09.03` |
| `pkg.` `conn.` | 包、连接 | `W.09.04` |
| `hist.` | 运行历史与回放 | `W.09.05` |
| `err.` `assign.` | 错误文案、端口兼容提示 | 生成物，不在 `zh.ts`（§4.5） |

### 4.4 本节点定稿的键

#### 4.4.1 `common.`
| 键 | 文案 | 用在 |
|---|---|---|
| `common.ok` | 确定 | 确认框的确认按钮（具体动作能说清时用动作，`U.15` §3） |
| `common.cancel` | 取消 | 确认框、表单 |
| `common.retry` | 重试 | 区域错误、加载失败（`U.14.03`） |
| `common.save` | 保存 | 表单 |
| `common.delete` | 删除 | 菜单、确认框 |
| `common.undo` | 撤销 | 提示里的撤销按钮 |
| `common.view` | 查看 | 提示里的定位按钮 |
| `common.copyDetails` | 复制错误详情 | `G.13-R4` |
| `common.openSettings` | 打开设置 | `G.13-R8` |
| `common.unknown` | 未知 | 不认识的枚举值（`W.04.04-R8`、`C.01-R18`） |
| `common.loadingWhat` | 正在加载{what}… | 加载超过 2 秒（`U.14.01`）；`what` 由调用方传入另一条文案 |
| `common.net.network` | 与 Harness 的连接已断开。连接恢复后再试 | `NetError.kind = 'network'`（与 `W.07.10` 离线横幅同一说法） |
| `common.net.timeout` | 服务没有及时响应。稍后重试 | `NetError.kind = 'timeout'` |
| `common.net.aborted` | 已取消 | `NetError.kind = 'aborted'`（一般不显示） |
| `common.scopeGone` | 那一层已经不存在了 | `W.02.01` §4.1 与 `W.06.13` §8 共用（`P.09` K159） |

#### 4.4.2 `fmt.`
| 键 | 文案 | 用在 |
|---|---|---|
| `fmt.justNow` | 刚刚 | `fmtRelTime` |
| `fmt.minAgo` / `fmt.hourAgo` / `fmt.dayAgo` | {n} 分钟前 / {n} 小时前 / {n} 天前 | `fmtRelTime` |
| `fmt.yesterday` | 昨天 | `fmtRelTime`（不带时刻，与 demo 会话列表一致） |
| `fmt.zone` | （UTC{offset}） | `fmtAbsTime({zone:true})` |
| `fmt.wan` / `fmt.yi` | {n} 万 / {n} 亿 | `fmtCount`、`fmtTokens` |
| `fmt.lt1s` / `fmt.sec` | <1 秒 / {n} 秒 | `fmtDuration` |
| `fmt.minSec` / `fmt.hourMin` | {m} 分 {s} 秒 / {h} 小时 {m} 分 | `fmtDuration` |

#### 4.4.3 `ui.`（`W.08` §4.6 原样建）
| 键 | 文案 |
|---|---|
| `ui.close` | 关闭 |
| `ui.clear` | 清空 |
| `ui.loading` | 加载中 |
| `ui.decrease` / `ui.increase` | 减少 / 增加 |
| `ui.locked` | 已锁定 |
| `ui.max` / `ui.min` | 最大为 {n} / 最小为 {n} |
| `ui.noMatch` | 没有匹配的选项 |
| `ui.filter` | 筛选 |
| `ui.submenu` | 展开子菜单 |
| `ui.ai` | AI |

#### 4.4.4 `ops.precheck.*`（`W.05` §6.2 的 `textKey`）
| `PrecheckReason` | `textKey` | 文案 | `vars` |
|---|---|---|---|
| `readonly` | `ops.precheck.readonly` | 离线或只读时不能修改图 | — |
| `frozen` | `ops.precheck.frozen` | 「{label}」已冻结。先解除冻结再修改 | `label` |
| `param_locked` | `ops.precheck.paramLocked` | 这个参数由节点类型固定，不能修改 | — |
| `unknown_type` | `ops.precheck.unknownType` | 找不到节点类型「{type}」。它所在的包可能已停用 | `type` |
| `no_port` | `ops.precheck.noPort` | 这个端口已经不存在了 | — |
| `direction` | `ops.precheck.direction` | 只能从输出端口连到输入端口 | — |
| `cross_scope` | `ops.precheck.crossScope` | 只能连接同一层里的节点 | — |
| `incompatible` | `assign.<rule>`（§4.5） | `assign.zh.yaml` 里对应规则的提示（`C.04.02-R2`） | `src`、`dst`、`producer`（类型和节点类型的界面名） |
| `cycle` | `ops.precheck.cycle` | 环只能通过循环节点形成 | — |
| `duplicate_edge` | `ops.precheck.duplicateEdge` | 这两个端口已经连着了 | — |
| `group_invalid` | `ops.precheck.groupInvalid` | 先选中同一层里至少 2 个节点 | — |
| `label_length` | `ops.precheck.labelLength` | 显示名要在 1–80 个字之间 | — |
| `too_many_tags` | `ops.precheck.tooManyTags` | 标签最多 16 个 | — |
| P9 `ok` 带 `replaces` | `ops.precheck.replaces` | 将替换原连线 | — |

`W.05` 的预检按上表填 `textKey` 和 `vars`；调用方一律 `t.dyn(textKey, vars)`。

### 4.5 生成的消息文案（`P.09` K158）
`go run ./tools/gen` 读 `schema/builtin/messages/errors.zh.yaml`、`assign.zh.yaml`，生成 `web/src/lib/i18n/generated/messages.ts`（生成物，禁止手改，`G.02.05-R1`、`G.16`）：
```ts
// 生成物（G.16）
export const ERRORS: Readonly<Record<string, string>>;   // 键 = C.11 §3 的错误码
export const ASSIGN: Readonly<Record<string, string>>;   // 键 = C.04.02 §2 有提示文案的规则号：C1、C2、C4、C6、C8、C10
```
- `t.dyn('err.graph_conflict', vars)` 取 `ERRORS.graph_conflict`；`t.dyn('assign.C2', vars)` 取 `ASSIGN.C2`。`err.` / `assign.` 前缀不能出现在 `zh.ts`。
- 诊断文案不生成：`Diag.msg` 是必填字段，服务端已渲染（`C.11` §5、`E.03.04`），前端原样显示。
- 前端自己的兼容判断（`W.05` 的 `ops/typecheck.ts`）返回的 `Assign.reason` 用 `t.dyn('assign.' + rule, vars)` 填，和后端同一份文案。

### 4.6 依赖
`react`（`useSyncExternalStore`，只在 `clock.ts`、`RelTime.tsx`、`useT`）；生成物 `generated/messages.ts`。本目录不 import `state`、`ops`、`lib/protocol`、`shell`、`panels`、`pages`、`canvas`、`components`（`W.01-R5`；`components/ui` 能用它，所以它不能反过来依赖任何界面目录）。
被依赖：`components/ui`（`W.08`）、`panels`（`W.07`）、`pages`（`W.09`）、`shell`、`routes`、`main.tsx`（`W.02`）、`ops`（`W.05`：`assign` 文案）、`canvas/Canvas.tsx`（把 `t.dyn` 作为 `EngineDeps.t` 交给引擎，`W.06.01`）。`canvas/core` 和 `lib/protocol` 不直接 import（`W.01-R6`、`W.04` §2）。

## 5. 数据结构
只有本节点私有的结构：文案表 `zh`（§4.2）、时钟的订阅表（§6.4）、已警告过的缺失键集合（§8）。不定义任何协议数据。

## 6. 行为

### 6.1 `t` 取文案
1. 查 `zh[key]`；没有时，`err.` 前缀查 `ERRORS`，`assign.` 前缀查 `ASSIGN`；都没有 → §8。
2. 替换占位符 `{名字}` / `{名字:格式}`（正则 `\{([a-zA-Z][a-zA-Z0-9_]*)(?::([a-z]+))?\}`）：
   - 变量按 `名字` 取；取不到时再按 snake_case / camelCase 的另一种写法取一次（yaml 里写 `{head_version}`、`details` 经 `fromWire` 后是 `headVersion`，`W.04.03`）。
   - 没有格式：字符串原样放入；数字用 `String(n)`（端口号、年份、版本号不能被写成"万"）。
   - 有格式：按下表调用格式化函数；变量类型不对（例：`cost` 收到字符串）→ 原样放入并在开发模式警告一次。

| 格式 | 调用 | 例 |
|---|---|---|
| `count` | `fmtCount` | `已选中 {n:count} 个节点` |
| `tokens` | `fmtTokens` | `{n:tokens} tokens` |
| `cost` | `fmtCost`（变量是 micros） | `本次运行 {c:cost}` |
| `duration` | `fmtDuration`（变量是毫秒） | `已运行 {ms:duration}` |
| `bytes` | `fmtBytes` | `占用 {b:bytes}` |
| `percent` | `fmtPercent`（变量是 0–1 的比例） | `已用预算的 {r:percent}` |
| `rel` | `fmtRelTime`（变量是 ISO 字符串） | `更新于 {at:rel}` |
| `abs` | `fmtAbsTime`（变量是 ISO 字符串） | `开始于 {at:abs}` |

   `W.06.15` 的"数字格式由 `deps.t` 的变量处理"即此：画布把原始数字传进来，格式写在文案里。
3. 返回字符串。`t` 不读 store、不碰 DOM、不抛错。

### 6.2 `errorText`
| 输入 | 返回 |
|---|---|
| 有 `kind`（`NetError`） | `common.net.<kind>` |
| `message` 非空 | `message`（服务端已按 yaml 渲染，`G.13-R5`；前端不再重排） |
| `ERRORS[code]` 存在 | 用 `details` 作为变量渲染 |
| 其他（新的错误码且没有 message，`C.01-R18`） | `ERRORS.internal` |

只给出"发生了什么、怎么办"的一句话（`G.13-R2`）。`NetError` 发生时离线横幅已经说明（`W.07.10`），调用方不再为它另弹提示，只在需要行内说明的地方（例如表单保存失败的那一行）用这句（`G.13-R7`：同一个问题只报一次）；要不要加"重试""打开设置""复制错误详情"按钮由调用方按 `U.14.03`、`G.13-R8` 决定。

### 6.3 格式化规则
四舍五入一律"四舍五入到指定位、末位 0 去掉"（`1.0 万` 写成 `1 万`）；进位后跨单位时用上一级单位（`99999` → `10 万`；`99 995 000` → `1 亿`）。输入是 `NaN`、`Infinity` 或无法解析的时间时一律返回 `—`，开发模式警告一次。不使用 `Intl.NumberFormat`：各浏览器的中文紧凑写法不一致（"1.2万"没有空格），和 `U.15-R4` 不符。

| 函数 | 规则 |
|---|---|
| `fmtCount` / `fmtTokens` | 取整；`< 10000` 原样（不加千分位）；`< 1 亿` → 除以 1 万，1 位小数，`fmt.wan`；否则除以 1 亿，1 位小数，`fmt.yi`；负数前加 `-` |
| `fmtCostInput` | 整数 micros → 十进制字符串：整数部分 + 去掉末尾 0 的 6 位小数（用整数除法和取余拼接，不用浮点）；负数前加 `-`；价格表、预算输入框显示原值用它，保证 `parseCostInput(fmtCostInput(x)) === x` |
| `fmtCost` | `micros` 先取整；`0` → `¥0`；`0 < micros < 5000`（不到半分钱）→ `<¥0.01`；否则按分四舍五入（整数运算：`Math.floor((micros + 5000) / 10000)`），固定 2 位小数，整数部分 ≥ 1000 时加千分位 `,`：`¥1,234.50`；负数 → `-¥0.42` |
| `fmtDuration` | `< 0` → `—`；`< 1000` → `fmt.lt1s`；`< 10 秒` → 1 位小数秒；`< 60 秒` → 整秒（向下取整，避免出现"60 秒"）；`< 1 小时` → `fmt.minSec`，秒补足两位；否则 `fmt.hourMin`，分补足两位 |
| `fmtBytes` | 1024 进制，单位 `B`、`KB`、`MB`、`GB`、`TB`；`< 1024` → 整数 `B`；数值 `< 100` 时 1 位小数，否则取整 |
| `fmtPercent` | `ratio × 100` 四舍五入取整，后接 `%`；`0 < ratio < 0.005` → `<1%`；允许超过 100%（超预算） |
| `fmtRelTime` | `diff = now − t`：`diff < −5 分钟`（时钟偏差太大）→ `fmtAbsTime(iso, {seconds:false})`；`diff < 45 秒` → `fmt.justNow`；`< 60 分钟` → `fmt.minAgo`（向下取整，至少 1）；`< 24 小时` → `fmt.hourAgo`（向下取整）；本地日期是昨天 → `fmt.yesterday`；本地日期相差 `< 7` 天 → `fmt.dayAgo`；同一年 → `MM-DD`；否则 `YYYY-MM-DD`（与 `fmtAbsTime` 同一种日期写法） |
| `fmtAbsTime` | 浏览器本地时区：`YYYY-MM-DD HH:mm:ss`（24 小时制、补零）；`seconds:false` → 到分钟；`zone:true` → 后接 `fmt.zone`，`offset` 由 `getTimezoneOffset()` 算成 `+08:00` |
| `parseCostInput` | ① 去首尾空白；全角数字、`．`、`，`、`￥` 转半角；② 去掉开头一个 `¥`；③ 去掉千分位 `,`；④ 必须匹配 `^\d{1,9}(\.\d{0,6})?$`，否则 `null`（空串、负号、科学计数法都是 `null`）；⑤ `整数部分 × 1 000 000 + 小数部分右侧补 0 到 6 位`，用字符串和整数拼，不用 `parseFloat`（`C.01-R9`） |

**和 demo v0.5.11 的差异（`P.09` K163）**：全应用每种量只有上表一种写法，窄列（监控页的运行列表、瀑布的步骤用时）也不另设紧凑写法。demo 里以下写法按 `U.15-R4` 改为上表的写法，demo 下一版一并修改：
| demo 里 | 位置 | 改为 |
|---|---|---|
| `4.2s`、`58s`、`4m12`、`0.0s` | `39_monitor.js` 运行列表与步骤用时、`27_panels.js`、`28_run.js` | `4.2 秒`、`58 秒`、`4 分 12 秒` |
| `4 分 12`（缺"秒"） | `39_monitor.js` `fmtD` | `4 分 12 秒` |
| `12.3k / 200k tokens`、`3.2k tokens` | `36_composer.js` 上下文用量、`27_panels.js`、`28_run.js` | `1.2 万 / 20 万 tokens`、`3200 tokens` |
| `18.6M`、`输入 15.1M` | `34_center.js` 预算与用量 | `1860 万`、`输入 1510 万` |
| `¥ 3.18`（¥ 后有空格） | `34_center.js` `money` | `¥3.18` |
| `今天 21:40`、`11-19`（运行记录）、`20:00`（通知中心） | `33_config.js`、`35_inbox.js` | 相对时间，悬停显示绝对时间（`U.15-R4`） |
| 模型上下文长度 `128k` | `34_center.js`、`38_hub.js` | `12.8 万`（`W.09.04` 用 `fmtTokens`） |

demo 与本文一致、照搬的：`刚刚` / `N 分钟前` / `N 小时前` / `昨天` / `N 天前`、`3 分 05 秒`（秒补两位）、`¥0.42`（无空格、两位小数）、`<1%`、`38 KB` / `2.1 MB`。

### 6.4 相对时间的刷新
- 全应用一个时钟：有订阅者且页面可见时，用一个 `setTimeout` 对齐到下一个整分钟后 50ms 触发，通知所有订阅者，再排下一次；没有订阅者或 `document.hidden` 时不排定时器；页面变回可见时立即通知一次再对齐。
- `useNow()` 经 `useSyncExternalStore` 订阅；只有显示相对时间的小组件（`RelTime`）订阅，整分钟时只有这些小组件重渲染，不带动列表或面板。
- `setClock({now, frozen:true})` 后不排定时器、`useNow` 不再变化：单元测试和 `W.11` 的性能基准用它，基准期间不会出现时钟引起的 React 提交。

### 6.5 检查
1. **中文字面量**（`G.06-R4`）：自定义规则 `hx/no-cjk-literal`（`G.06.04` §1；实现放在 `tools/lint/eslint/`，在 `web/eslint.config.js` 启用，`W.12` §6.4，`P.09` K173），作用于 `web/src/**`，排除 `web/src/lib/i18n/zh.ts`、`web/src/lib/i18n/generated/**`、`**/*.test.ts(x)`、`web/tests/**`。规则按源码原文匹配这三类节点（转义写法 `\uFFE5` 不会误报）：`Literal[raw=/[\u3400-\u9fff\u3000-\u303f\uff01-\uff5e]/]`、`TemplateElement[value.raw=/…/]`、`JSXText[raw=/…/]`；提示"界面文案放进 lib/i18n/zh.ts（W.10）"。注释不检查。
2. **文案表**（`zh.test.ts`）：
   - 键匹配 `^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*){1,3}$`，第一段在 §4.3 表里，且不是 `err` / `assign`；区段顺序与 §4.3 一致。
   - 值非空、首尾没有空白、没有 `<` `>`、花括号成对且占位符格式合法、格式名在 §6.1 表里。
   - 不含感叹号（`!`、`！`，`U.15` §1）。
   - 汉字和数字、拉丁字母之间有空格（`12 秒`、`AI 修改了`，`U.15-R4`）；占位符两侧不检查（`{m}月{d}日` 是日期写法）。
   - 不含 `terms.ts` 里登记的"不要叫"用词（`U.15-R1`、`G.02.05-R26`）。`terms.ts` 的内容与 `项目树_v0.5/tools/术语检查.json` 的 `rules` 一致，只收不会误报的词；`P.06` 改了要两处一起改。
   - 每行一个键值、单引号字面量（§4.2，字体子集扫描依赖它）。
3. **生成物**：`messages.test.ts` 检查 `ASSIGN` 恰好有 C1、C2、C4、C6、C8、C10 六条；`ERRORS` 有 `internal`。错误码与文案一一对应由生成器保证（`C.11` §6）。
4. **快捷键说明**：`W.02.04` 的测试用 `hasText` 检查每个 `label`（`W.02.04` §10）；本节点只提供 `hasText`。

## 7. 不变量
- `t`、`errorText` 和全部格式化函数不抛错、不读 store、不碰 DOM；同样的输入（同一时区、同一时钟）得到同样的输出。
- `useT()` 每次返回同一个函数对象；取文案永远不会引起重渲染。
- 金额从输入到显示全程整数 micros（`C.01-R9`）；本目录不出现 `parseFloat`、`toFixed` 处理金额。
- 时间只以 ISO 字符串（UTC）和毫秒数进出本目录；不返回、不缓存 `Date` 对象（`W.04.04-R10`、INV-23）。
- `web/src/**` 里，汉字字面量只出现在 `zh.ts`、生成物和测试里。

## 8. 错误处理
| 错误 | 触发 | 结果 |
|---|---|---|
| 文案键不存在 | `t.dyn` 收到未登记的键（`t` 的写死键在编译期就会报错） | 开发模式：返回 `⟦键名⟧`，每个键 `console.warn` 一次；生产：返回键名本身，每个键 `console.error` 一次。不抛错，界面不崩 |
| 变量缺失 | 文案里有 `{x}`，`vars` 里没有 | 保留 `{x}` 原样，开发模式警告一次（与后端 `E.03.04` §5 一致） |
| 变量类型不对 | `{c:cost}` 收到字符串 | 原样放入，开发模式警告一次 |
| 无法解析的时间、`NaN` / `Infinity` | 服务端数据异常或调用方传错 | 返回 `—`，开发模式警告一次 |
| 金额输入不合法 | 负数、字母、超过 6 位小数、超过 9 位整数 | `parseCostInput` 返回 `null`；调用方显示红字（`W.09.02`） |
| 新的错误码且没有 `message` | 服务端比前端新（`C.01-R18`） | `ERRORS.internal` |

## 9. 性能与资源
- `t`：一次对象查找 + 有占位符时一次正则替换；没有 `vars` 时不分配新字符串。格式化函数单次 ≤ 2µs（`vitest bench`，1 万次 `fmtRelTime` ≤ 20ms，`W.11` 收集）。
- 体积：`lib/i18n` 全部（含 `zh.ts`、`generated/messages.ts`）在首屏包里 ≤ 25KB（gzip），由 `W.11` 的包体积检查把关；文案表不按页面拆分（只有一种语言，拆分得不偿失）。
- 定时器：任何时候最多 1 个；没有 `RelTime` 挂载或页面隐藏时为 0。

## 10. 验收标准
1. §6.3 每个函数的每条边界都有用例，输出与表一致（含进位跨单位、负数、`NaN`、跨午夜的"昨天"）。
2. 组件文件里写 `'运行'`、`` `运行` ``、`<b>运行</b>` 任一种 → ESLint 报错；同样的字写在 `zh.ts`、`*.test.ts`、注释里不报错；`'\uFFE5'` 不报错。
3. `t` 对 `zh` 键、`err.*`、`assign.*` 返回正确文案；8 种格式占位符按 §6.1 格式化；snake_case 占位符能取到 camelCase 变量；缺键、缺变量按 §8。
4. `zh.test.ts` 的全部检查在初始文案表上通过；人为加入一条违规（错前缀、感叹号、"不要叫"用词、汉字紧贴数字）各自失败。
5. `RelTime` 只在整分钟时重渲染一次；页面隐藏时不重渲染、没有定时器；`setClock` 冻结后不再变化。
6. `parseCostInput(fmtCostInput(x)) === x`（x 取 0、1、35000、420000、2000000、123456789 等）；`'0.1'`、`'0.2'`、`'0.3'` 解析为 100000、200000、300000（没有浮点误差）；`'-1'`、`'1e3'`、`''`、`'0.1234567'` 为 `null`。
7. 生产构建里 `lib/i18n` 的体积不超过 §9。

### 实施卡
- 要建 / 要改的文件：`web/src/lib/i18n/index.ts`、`t.ts`、`t.test.ts`、`zh.ts`（建骨架：§4.3 全部区段的注释头，§4.4 四组的键值；其他区段由各叶子填）、`zh.test.ts`、`terms.ts`、`format.ts`、`format.test.ts`、`clock.ts`、`clock.test.ts`、`RelTime.tsx`、`RelTime.test.tsx`、`errors.ts`、`errors.test.ts`、`messages.test.ts`；生成物 `web/src/lib/i18n/generated/messages.ts`（由 `tools/gen` 产出，不手写）；`tools/gen/messages/`（生成器的 messages 部分，`G.16`）；`tools/lint/eslint/no-cjk-literal.js` 及其 `RuleTester` 测试（§6.5 第 1 条）、`web/eslint.config.js`（启用该规则）；`web/tests/bench/i18n.bench.ts`。
- 不许碰的文件：`schema/`（只读 `schema/builtin/messages/`）、`web/src/lib/protocol/`、`web/src/state/`、`web/src/ops/`、`web/src/canvas/`、`web/src/panels/`、`web/src/pages/`、`web/src/components/`、`web/src/shell/`；`zh.ts` 里 §4.4 以外的区段。
- 函数签名：见 §4.1、§4.5。
- 测试用例（`vitest` + `jsdom`；时区固定为 `Asia/Shanghai`，另跑一遍 `America/New_York`）：
  - `W10-T1 取文案`：`t('common.cancel')` → "取消"；`t.dyn('err.internal')`、`t.dyn('assign.C2', {dst:'上下文包', producer:'上下文装配'})` 返回生成物文案；`useT()` 两次返回同一对象
  - `W10-T2 占位符`：`{n}` 收到 18080 → "18080"；`{n:count}` 收到 12345 → "1.2 万"；8 种格式各一例；`{head_version}` 能取到 `headVersion`
  - `W10-T3 缺键与缺变量`：开发模式 `t.dyn('x.y')` → "⟦x.y⟧"，`console.warn` 只调 1 次（连续调 3 次）；生产模式返回 "x.y"；缺变量保留 `{x}`
  - `W10-T4 fmtCount / fmtTokens`：0、9999、10000、12345、99999（→"10 万"）、99 995 000（→"1 亿"）、150 000 000、-12345、NaN
  - `W10-T5 fmtCost / fmtCostInput`：0、1、4999、5000、420000、1 234 500 000（→"¥1,234.50"）、-420000、非整数输入；`fmtCostInput`：35000 → "0.035"、2000000 → "2"、1 → "0.000001"、-420000 → "-0.42"
  - `W10-T6 fmtDuration`：-1、0、999、1000、3200、9999、10 000、59 999（→"59 秒"）、60 000、185 000、3 599 999、3 600 000、3 900 000
  - `W10-T7 fmtBytes / fmtPercent`：0、1023、1024、1 288 490 189、1023.95 KB 进位到 MB；0、0.004、0.005、0.724、1.2、NaN
  - `W10-T8 fmtRelTime`：30 秒前、44 秒前、45 秒前、59 分钟前、3 小时前、跨午夜 2 小时前（仍是"2 小时前"）、25 小时前且是昨天（→"昨天"）、6 天前、7 天前（→ `MM-DD`）、去年（→ `YYYY-MM-DD`）、未来 3 分钟（→"刚刚"）、未来 10 分钟（→ 绝对时间）、非法字符串（→"—"）
  - `W10-T9 fmtAbsTime`：补零、`seconds:false`、`zone:true` 在两个时区下的偏移
  - `W10-T10 parseCostInput`：§10 第 6 条全部；全角 "１,２３４.５" → 1 234 500 000；"￥0.42"；"1,2,3"（去千分位后合法 → 123 000 000）；10 位整数 → null
  - `W10-T11 errorText`：`NetError` 三种 kind；有 `message` 原样返回；无 `message` 有 `ERRORS[code]` 用 `details` 渲染；未知码 → `ERRORS.internal`
  - `W10-T12 时钟`：假定时器下 `RelTime` 跨整分钟重渲染 1 次；`document.hidden=true` 时没有待执行的定时器；可见后立即刷新；`setClock` 冻结后 5 分钟内不重渲染；卸载最后一个 `RelTime` 后定时器为 0
  - `W10-T13 文案表检查`：§10 第 4 条（正例为初始 `zh.ts`，反例逐条构造）
  - `W10-T14 中文字面量 lint`：`web/tests/lint/` 下的正例、反例文件跑 ESLint，结果与 §10 第 2 条一致
  - `W10-T15 生成物`：§6.5 第 3 条
  - `W10-T16 体积`：§10 第 7 条（`W.11` 的包体积检查里登记 `lib/i18n` 一项）
- 允许使用的依赖：运行时只用 `react`（`G.10` §3.3）；测试用 `vitest`、`jsdom`、`eslint`（`G.10` §3.4）。不引入任何 i18n、日期或数字格式化库（`G.10-R3`）。
- 禁止事项：`G.02.05` 全部（特别是 R1、R26、R28）；另：不用 `Intl.NumberFormat`、`toLocaleString` 输出界面数字；金额不用浮点运算；`zh.ts` 里不拼接、不写函数值；不做语言切换和语言设置（Q15、K151）；不在本目录 import 任何界面目录或 `lib/protocol`。
- 完成标志：`G.14` 全部条件；§10 七条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 10 棒；`P.09` K158–K162 |
| 2026-11-23 | 对照全树与 demo v0.5.11 复查：相对时间改为 24 小时内写小时、"昨天"不带时刻、旧日期用 `MM-DD`；新增 `fmtCostInput`；网络错误文案与离线横幅一致并说明不重复提示；§6.3 末尾列出 demo 的差异 | 第 10 棒复查；`P.09` K163 |
| 2026-11-23 | §6.5 第 1 条改为自定义规则 `hx/no-cjk-literal`（与 `G.06.04` 一致） | 第 10 棒写 `W.12` 时发现；`P.09` K173 |
