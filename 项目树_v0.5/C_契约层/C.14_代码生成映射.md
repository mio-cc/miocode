# C.14 代码生成映射

| 项 | 内容 |
|---|---|
| 编号 | C.14 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引01§4 |
| 最后修改 | 2026-11-27 |

## 1. 职责
定义 `schema/` 到 Go 代码和 TypeScript 代码的生成规则，特别是生成器处理不好的情况（判别联合、可空、开放对象）怎么办；实现生成器 `tools/gen`。生成流程和生成物清单见 `G.16`。本叶子是 `tools/gen` 唯一的负责叶子：`G.16` 清单里以后要补的生成物（令牌、主题、图标、字体、布局常数、快捷键），源文件出现后由本叶子改回"已审"再实施（`P.09` K234）。

## 2. 工具与输出
生成器是自研的 Go 程序 `tools/gen`（一个 `package main`），读 `schema/*.schema.json`、`schema/builtin/` 和 `design/`，同时输出 Go 和 TS/CSS；不用第三方生成工具，不依赖 Node（`P.09` K234、K303）。`go run ./tools/gen` 一次生成下表全部文件；`tokens`、`icons` 子命令分别只生成令牌/主题和图标表；`fonts` 子命令在字体源文件出现前报"还没有源文件"并以 1 退出。

| 输出 | 内容 |
|---|---|
| `gen/types.go` | 全部 schema 类型（§3）、`ApplyDefaults` |
| `gen/union.go` | 判别联合的解码、`DecodeAs`（§4） |
| `gen/consts.go` | 常量（§5.2） |
| `gen/tables.go` | 数据表与状态机转换函数（§5.3） |
| `web/src/lib/protocol/generated/types.ts` | 全部 schema 类型、`withDefaults…`；与类型同名的常量对象（`RunStatus.Done`） |
| `web/src/lib/protocol/generated/consts.ts` | 与类型不同名的常量对象：`Ev`、`ErrCode`、`DiagCode`、`Act`、`SseControl`、`NodeType` |
| `web/src/lib/protocol/generated/tables.ts` | 数据表（`AUTHZ_MATRIX`、`SHORTCUTS` 等）与转换函数 |
| `web/src/lib/protocol/generated/wire.ts` | 前端字段映射表 `WIRE_TYPES`（§5.1，按类型） |
| `web/src/lib/i18n/generated/messages.ts` | `ERRORS`、`ASSIGN`（`W.10` §4.5） |
| `web/src/styles/tokens.css` | 设计令牌副本（源 `design/tokens.css`，`U.02-R1`） |
| `web/src/styles/themes.css` | 四套配色 × 浅色 / 深色的主题样式（源 `design/themes/*.css`，`U.03.05` §4） |
| `web/src/styles/themes.ts` | `THEMES` 列表与 `DEFAULT_PALETTE`（`U.03.05` §4、`W.02.03` §4.3） |
| `web/src/styles/icons.ts` | 图标表 `ICONS`、`IconName`、`IconShape`、`ICON_FALLBACK`（源 `design/icons/`，`U.08-R2`、`W.08.01` §4.2） |

Go 包名 `gen`（`github.com/mio-cc/anywhere-door/gen`）。Go 输出经 `go/format` 格式化；每个文件第一行是生成标记（`G.04.03`）。

## 3. 映射规则
| JSON Schema | Go | TS |
|---|---|---|
| `object` + `properties`（`additionalProperties: false`） | `struct`，字段按名字排序 | `interface` |
| 开放对象（`"x-open": true`，`C.01-R19`） | `map[string]json.RawMessage` | `{ [key: string]: unknown }` |
| 只有 `additionalProperties: <schema>`、没有 `properties` 的对象 | `map[string]T` | `{ [key: string]: T }` |
| `array` | `[]T` | `T[]` |
| `$ref: Ulid` | `type Ulid string` | `type Ulid = string & { readonly __brand: "Ulid" }` |
| `$ref: Timestamp` | `type Timestamp struct{ time.Time }`，`MarshalJSON` 输出 UTC 毫秒 `2006-01-02T15:04:05.000Z`，`UnmarshalJSON` 接受 RFC 3339 并转成 UTC | `string` |
| 其他字符串 `$defs`（带 `pattern`） | `type X string` | `type X = string` |
| 具名枚举（`$defs` 里的 `enum`） | `type X string` + 常量（§5.2） | 字符串字面量联合 + 同名常量对象 |
| 属性里的内联枚举、`const` | `string` | 字面量联合 / 字面量 |
| `integer` / `number` / `boolean` / `string` | `int64` / `float64` / `bool` / `string` | `number` / `number` / `boolean` / `string` |
| `type: [string, number]` | `json.RawMessage` | `string \| number` |
| 没有类型约束（`{}`、只有 `description`） | `json.RawMessage` | `unknown` |
| `anyOf: [X, {type: null}]` | `*X`，必填时不加 `omitempty` | `X \| null` |
| 可选字段 | 一律指针（`*T`）+ `omitempty`；`json.RawMessage` 不加指针 | `?:` |
| 带 `default` 的可选标量字段 | `ApplyDefaults()` 把空指针设为默认值 | `withDefaults<类型>(v)`：`{ 字段: 默认值, ...v }` |
| 内联的对象 | 具名类型：所在类型名 + 字段名（`Note.size` → `NoteSize`），数组元素再加 `Item`，映射的值加 `Value` | 同名 `interface` |
| `$ref` 指到 `properties` 里（`graph.schema.json#/$defs/Note/properties/size`） | 那个位置的类型（`NoteSize`） | 同左 |
| `$ref: "#"` | 本文件的根类型 | 同左 |
| `allOf` 里只有 `$ref` 的项 | 把被引用对象的字段合并进来，本对象写的同名字段优先 | 同左 |
| 判别联合 | §4 | §4 |
| 其他 `allOf` / `if` / `then`、`oneOf`、`not`、`propertyNames` 等 | 只用于校验，不影响类型 | 同左 |

`$defs` 的名字全部 schema 文件里唯一；有根结构的文件，根类型名写在 `schema/builtin/aliases.yaml` 的 `roots`（`graph.schema.json` → `Graph` 等）。生成器发现重名（含内联类型名）、根类型名没登记、遇到表里没有的写法时，报出位置并失败，不猜。

## 4. 判别联合
Op 的 `payload`、事件的 `data`、`MessageBlock`、`MessageRef`、`NodeDef.impl` 都是"按某个字段取值决定结构"。
- **C.14-R1** schema 里统一写成：外层对象有判别字段（`kind` 或 `type`），`allOf` 里每个取值一条 `if: {required: [kind], properties: {kind: {const: "x"}}}`，`then` 是以下两种之一（同一个联合只用一种）：
  - **字段联合**：`then: {properties: {payload: {$ref: "#/$defs/PayloadX"}}}`（`then` 里可以还有别的约束，如事件的 `seq`、`required: [loc]`）：判别字段在外层，只有一个字段（`payload`、`data`）随取值变；
  - **整体联合**：`then: {$ref: "#/$defs/BlockX"}`：整个对象随取值变。
  分支定义的名字照各 C 文档（`PayloadAddNode`、`DataNodeState`、`BlockGraph`、`RefNode`、`ImplBuiltin`）。不满足这个形状的 `if/then` 只用于校验（如 `Expiry`、`DataNodeState` 里按 `to` 约束 `cause`）。
- **C.14-R2** Go：
  - 判别字段是内联枚举时生成具名类型：所在类型名 + 字段名（`RunEventKind`、`MessageBlockKind`、`ImplType`）；已经是具名枚举的（`OpKind`）照用。
  - 字段联合：外层是普通 `struct`，联合字段是 `json.RawMessage`；生成 `func (v *Op) DecodePayload() (any, error)`（按判别值解出 `*PayloadX`；事件为 `DecodeData`）。
  - 整体联合：`type MessageBlock struct { Kind MessageBlockKind; Raw json.RawMessage }`，`MarshalJSON` 原样输出 `Raw`，`UnmarshalJSON` 保存原文并读出判别值；生成 `Decode() (any, error)`。
  - 通用函数 `func DecodeAs[T any](raw json.RawMessage) (*T, error)`：严格解码（不认识的字段报错）。不认识的判别值返回错误，不崩溃（`C.01-R18`）。
- **C.14-R3** TS：生成真正的判别联合，`switch (op.kind)` 时各分支自动收窄：字段联合是 `OpCommon & ({ kind: "add_node"; payload: PayloadAddNode } | …)`（`OpCommon` 是去掉判别字段和联合字段的外层），整体联合是 `BlockGraph | BlockProposal | …`；事件流同理（`RunEventCommon` 含合并进来的 `Event` 字段，本流必填的 ID 为必填）。
- **C.14-R4** 往返测试：Go 侧在本叶子做——第 4 片全部合法向量和合法示例、内置资产，逐条"解码 → 联合解码 → 编码"与原文语义相同，所有联合的所有分支都覆盖；TS 侧（Go 编码 → TS 解码 → TS 编码）等前端测试框架就绪后在 `W.04.03` 做（`P.09` K234）。

## 5. 命名
- **C.14-R5** Go 类型名 = `$defs` 名或 `aliases.yaml` 登记的根类型名；字段名由 snake_case 转 PascalCase，缩写按 Go 习惯：`id`→`ID`、`ids`→`IDs`、`url`→`URL`、`http`→`HTTP`、`json`→`JSON`、`mcp`→`MCP`、`llm`→`LLM`、`api`→`API`、`ui`→`UI`、`sse`→`SSE`。TS 类型名同 Go，字段名保持 snake_case（`W.04.03` 转换）。
- **C.14-R6** 常量命名：事件 `EvNodeState`（`node.state`）、Op `OpAddNode`、错误码 `ErrCodeGraphConflict`、诊断码 `DiagV09`、动作 `ActOpAddNode`（`tool.L0` → `ActToolL0`）、SSE 控制帧 `SseResync`、`SseShutdown`、节点类型 `NodeTypeResource`；其他具名枚举为类型名加取值（`RunStatusDone`）。名字由取值按 `.`、`_`、`-`、`:` 切开后各段首字母大写拼成，Go 套用 R5 的缩写，TS 不套（`Ev.LlmCall`）。TS 里同名常量对象：`Ev.NodeState`、`OpKind.AddNode`、`ErrCode.GraphConflict`、`DiagCode.V09`、`Act.OpAddNode`、`SseControl.Resync`、`NodeType.Resource`；其他枚举的常量对象与类型同名，如 `RunStatus.Done`（`W.04.04-R7`，`P.09` K85）。Go 的事件常量按流取类型（`EvNodeState RunEventKind`），三条流的事件名不能重名。
- **C.14-R7** 中文枚举值（节点类型名）生成常量时用拼音或英文别名，表定义在 `schema/builtin/aliases.yaml` 的 `nodes`：`资源 → Resource`、`上下文装配 → ContextAssembly`、`扇出 → Fanout`、`汇合 → Join`、`聚合 → Aggregate`、`分支 → Branch`、`循环 → Loop`、`账本 → Ledger`、`人工 → Human`、`子图端口 → SubPort`、`子图引用 → SubRef`、`工具 → Tool`、`Agent → Agent`。属性里的其他中文内联枚举（`category`、`group`）不生成常量。

### 5.1 前端字段映射表（`P.09` K84）
前端在 `lib/protocol/mapping.ts` 把 snake_case 字段名转成 camelCase（`W.04.03`）。哪些位置的值不能转换，由生成器从 schema 算出，前端不手写名单：
- **C.14-R8** `tools/gen` 输出 `generated/wire.ts`：**按类型**列出每个结构类型和判别联合的每个字段的值怎么转换（`WIRE_TYPES`、`WireTypeName`、`WireNode`），不按字段名汇总——同一个字段名在不同类型里含义不同（`Node.params` 是开放对象、`NodeDef.params` 是参数定义表；`Mandate.overrides` 是结构、`SubgraphRef.overrides` 是映射），按名字取最保守的一种会让结构里的 snake_case 字段不转换（`P.09` K235，取代 K84 的按名字汇总）。字段的写法：`"raw"`（值整体原样：标量、开放对象、没有类型约束、值都不用转换的数组或映射）、`{t: 类型名}`、`{list: …}`、`{map: …}`（键是数据、原样，值按 …）；判别联合另写 `union: {disc, field?, branches}`，有 `field` 的是字段联合（`payload`、`data` 的值按 `disc` 的取值查分支类型），没有的是整体联合。
- **C.14-R9** 生成器检查每个字段名都能无损往返 `snake_case → camelCase → snake_case`：`C.01-R4` 之外，再拒绝"下划线后面紧跟数字"（`x_2`）和连续下划线（`a__b`）。不满足时生成失败。

### 5.2 常量
来源：每个具名枚举（`$defs` 里的 `enum`）；三条事件流根上的 `kind` 枚举（`Ev`）；`schema/builtin/aliases.yaml` 的 `nodes`（`NodeType`）；`schema/builtin/sse_control.yaml`（`C.06.01` §4 的两种控制帧，`SseControl`）。生成的常量名之间、和类型名之间重名时生成失败。

### 5.3 数据表
| 来源 | Go | TS |
|---|---|---|
| `container_rules.yaml` | `ContainerRules []ContainerRule` | `CONTAINER_RULES` |
| `widget_map.yaml` | `WidgetRules []WidgetRule` | `WIDGET_MAP` |
| `category_map.yaml` | `Categories`、`CategoryRules []CategoryRule` | `CATEGORY_MAP` |
| `aggregate_ops.yaml` | `AggregateOps map[string]string` | `AGGREGATE_OPS` |
| `authz_matrix.yaml` | `AuthzRows []AuthzRow`（每行 `Actions []Action`、`Levels [5]AuthzCell`，格是判定或 `{If, Then, Else}`）、`AuthzFixed map[Action]ActorKind`、`AuthzOpActions map[OpKind]string` | `AUTHZ_MATRIX` |
| `state_machine.yaml` | `RunCanTransition(from, to RunStatus) bool`、`RunIsTerminal`、`NodeCanTransition`、`NodeIsTerminal` | `STATE_MACHINE`、`runCanTransition`、`runIsTerminal`、`nodeCanTransition`、`nodeIsTerminal` |
| `shortcuts.yaml` | —（只给前端） | `SHORTCUTS` |

Go 侧按固定结构读这些 YAML，不认识的键报错；`authz_matrix.yaml` 里的动作、Op 种类、actor 必须是枚举里的值，状态机里的状态必须是 `RunStatus` / `NodeState` 的值，`shortcuts.yaml` 非空且每项必填 `id`、`keys`、`layer`、`label`、`group`（`id` 唯一、`layer ∈ {global, canvas, nest, composer}`、`keys` 符合 `W.02.04` §5.1 修饰键顺序与物理键语法、同层组合不冲突、不占 `U.13.04-R2` 保留键、非 `composer` 层单键不能 `in_input: true`），否则生成失败；`label` 在 `W.10` 文案表中的存在性由 `W.02.04`（`W0204-T2`）在写入 `shortcut.*` 文案时逐条校验。TS 侧照 YAML 原样输出（`as const`，键不转换，只有 `lib/protocol` 读它们，`W.04.04-R1`）。

### 5.4 设计令牌、主题与图标（`P.09` K303）
- 令牌与主题（`go run ./tools/gen tokens` 及默认 `go run ./tools/gen`）：读 `design/tokens.css` 与 `design/themes/{paper,graphite,whale}.css`，检查 4 套配色 × 明暗共 8 组全部定义 `U.03.05` §5 与 `U.03.01` 颜色令牌、主题文件不定义非颜色/阴影令牌（`U.03.05-R6`）、对比度满足 `U.03.05-R3`（`text-1..3`/`accent-strong`/`ok`/`danger`/`wait`/`model` 在 `bg-1`/`bg-2` ≥ 4.5:1，在 `bg-4` 上 `text-3` ≥ 4.0:1 其余 ≥ 4.5:1；`primary-fg` 在 `primary` ≥ 4.5:1；8 种 `type-*` 与 6 种 `mark-c1..c6` 在 `bg-3` ≥ 3.0:1）及 `accent` 与 `model` HSL 色相差 ≥ 35°（K303）；校验通过后生成 `web/src/styles/tokens.css`、`web/src/styles/themes.css`、`web/src/styles/themes.ts`。
- 图标表（`go run ./tools/gen icons` 及默认 `go run ./tools/gen`）：读 `design/icons/*.svg`、`design/icons/node/*.svg` 与 `schema/builtin/aliases.yaml`（13 个原子节点按别名换回中文名，`node/Extension.svg` 映射为 `扩展`）；检查 `U.08-R1`、`R4`（`viewBox="0 0 16 16"`、只允许 `path`/`circle`/`rect`/`line`/`polyline` 五种形状、禁止 `<script>`/`style`/`on*`/外链、非 `solid` 图标禁止颜色 `fill`），生成 `web/src/styles/icons.ts`（`IconShape`、`ICONS`、`IconName`、`ICON_FALLBACK`）。
`messages.ts`：`ERRORS` 的键恰好是 `ApiErrorCode` 的全部取值，`ASSIGN` 的键恰好是 C1、C2、C4、C6、C8、C10（`G.16`），否则生成失败。

## 6. 不允许
- 手改任何生成文件（`G.02.05-R1`）。生成结果不满意时，改 schema 或改生成工具。
- 在 `gen/` 以外重复定义与 schema 相同的结构（`G.02.05-R2`）。内部需要额外字段时用组合（嵌入生成的类型），不复制。

## 7. 验收标准
1. `make gen` 两次结果完全相同（确定性）。
2. 所有判别联合的往返测试通过（Go 侧，R4）。
3. CI 里 `make gen && git diff --exit-code` 通过。

### 实施卡
- 要建 / 要改的文件：`tools/gen/main.go`、`tools/gen/`、`schema/builtin/aliases.yaml`、`schema/builtin/sse_control.yaml`、`schema/builtin/shortcuts.yaml`、`design/tokens.css`、`design/themes/paper.css`、`design/themes/graphite.css`、`design/themes/whale.css`、`design/icons/`、`gen/types.go`、`gen/union.go`、`gen/consts.go`、`gen/tables.go`、`web/src/lib/protocol/generated/types.ts`、`web/src/lib/protocol/generated/consts.ts`、`web/src/lib/protocol/generated/tables.ts`、`web/src/lib/protocol/generated/wire.ts`、`web/src/lib/protocol/index.ts`、`web/src/lib/i18n/generated/messages.ts`、`web/src/styles/tokens.css`、`web/src/styles/themes.css`、`web/src/styles/themes.ts`、`web/src/styles/icons.ts`、`web/eslint.config.js`
- 说明：生成物由 `go run ./tools/gen` 产出并提交，不手写（`G.02.05-R1`）；`web/src/lib/protocol/index.ts` 只补转发 `SHORTCUTS`；`web/eslint.config.js` 只在生成物忽略列表加入 `src/styles/themes.ts`、`src/styles/icons.ts`（`P.09` K303）。
- 不许碰的文件：`engine/`、`internal/`、`cmd/`、`schema/`、`tools/relay/`、`tools/build/`、`tools/schemacheck/`、`web/src/`
- 测试用例：
  - `C14-T1 确定性`：对仓库的 schema 与 design 生成两次，逐字节相同；也和仓库里提交的生成物相同
  - `C14-T2 往返`：`op_vectors.json`、`run_event_vectors.json`、`graph_event_vectors.json`、`session_event_vectors.json` 里全部合法的项，示例清单里全部合法的示例，`schema/builtin/` 的内置节点定义、类型、配方、角色卡：严格解码成生成的类型 → 联合解码（分支再编码也与原文相同）→ 编码，与原文语义相同；每个联合的每个分支至少覆盖一次（按 schema 里的分支名单逐个检查）
  - `C14-T3 黄金文件`：`tools/gen/testdata/` 下一组固定的 schema（覆盖 §3 的每一行、两种联合、内联类型、`$ref` 到属性和 `#`），生成结果与黄金文件相同（`G.16-R5`；`-update` 重写黄金文件）
  - `C14-T4 命名与拒绝`：字段名、常量名的换算（含缩写、`tool.L0`、`V09`）；`x_2`、`a__b`、类型重名、常量重名、根类型名没登记都生成失败
  - `C14-T5 状态机`：生成的 `RunCanTransition` 6×6、`NodeCanTransition` 9×9 逐格与 `C.07` §2、§3.1 一致（期望表写在测试里），终态函数与 `terminal` 一致（`C.07` §7 验收 1）
  - `C14-T6 字段映射表`：同名字段在不同类型里分别正确：`Node.params` 为 `"raw"`、`NodeDef.params` 为 `{map: {t: ParamDef}}`、`Mandate.overrides` 为 `{t: Overrides}`、`SubgraphRef.overrides` 为 `"raw"`、`Overrides.budget` 为结构而 `run.created` 的 `budget` 为 `"raw"`、`Message.usage` 为结构；映射的值不用转换时为 `"raw"`（`orchestrator_effort`、`decisions`、`id_map`）；`Op`、三条事件流是字段联合、`MessageBlock`、`MessageRef`、`Impl` 是整体联合，分支数与 schema 一致；testdata 的 schema 上 `$ref` 到属性、`$ref: "#"`、数组、映射各一例
  - `C14-T7 数据表与文案`：`tables.go` 的数据与 YAML 一致；`authz_matrix.yaml` 里写一个不存在的动作时生成失败；`ERRORS` 少一个错误码、`ASSIGN` 多一条时生成失败
  - `C14-T8 令牌与主题生成`：4 套配色 × 明暗 8 组合全部通过完整性、非颜色令牌禁止与 WCAG 对比度检查；反例（缺颜色令牌、主题含字号令牌、低对比度色值）生成失败
  - `C14-T9 图标生成与校验`：`design/icons/` 与 `design/icons/node/` 72 个图标覆盖 `U.08` §2 全部名字，节点英文别名换回中文名；反例（非法 viewBox、含 `<script>`、含 `on*`、含 `style`、非法 `fill`、未允许元素）生成失败
  - `C14-T10 快捷键表生成`：`schema/builtin/shortcuts.yaml` 全部项生成为 `SHORTCUTS`；反例（重复 `id`、非法 `layer`、空 `keys`）生成失败
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - TS 侧往返（R4）：`W.04.03`（复查 `W.04.03` 时写进它的实施卡）
- 允许使用的依赖：标准库、`github.com/goccy/go-yaml`（`G.10` 已登记）
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check C.14` 七项通过；评审通过

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §2 加前端字段映射表；R6 补 TS 常量对象名；新增 §5.1（R8、R9） | `P.09` K84、K85（写 `W.04.03`、`W.04.04` 时发现映射规则和 TS 常量名没有定义） |
| 2026-11-23 | §2 数据表补布局常数 `layout.yaml` | `P.09` K102（第 7 棒） |
| 2026-11-23 | §3 开放对象按 `x-open` 标记识别 | `P.09` K202 |
| 2026-11-23 | 第 5 片开工前复查：生成器改为自研（不用 `go-jsonschema`、`json-schema-to-typescript`）；§3 写全映射规则（可选字段一律指针、`Timestamp` 包装类型、内联类型命名、`$ref` 到属性）；§4 按实际 schema 的 `if/then` 写法写两种联合；§5.2 常量来源（新增 `sse_control.yaml`）、§5.3 数据表；R8 联合字段名按结构处理；Go 侧往返在本叶子，TS 侧在 `W.04.03`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K234 |
| 2026-11-23 | R8 改为按类型生成字段映射表（`WIRE_TYPES`），不按字段名汇总；`C14-T6` 相应改 | 第 5 片实施中检查生成结果：按名字汇总让 `budget`、`usage`、`params`、`ui`、`overrides`、`note` 里的结构字段不转换；`P.09` K235 |
| 2026-11-24 | 状态改为"冻结"：第 5 片 squash 合并进代码仓库 `main`，提交 `209a9b940d6f17d5c03b87805c36770440ba7854`（`G.02.06-R21`） | `relay check` 七项通过；评审 9 条全部符合；按 `G.08-R3` 由验证者合并 |
| 2026-11-26 | 按 K234 / K303 改回"已审"：补齐令牌/主题（`design/tokens.css`、`design/themes/*.css`）、图标（`design/icons/`）与快捷键表（`schema/builtin/shortcuts.yaml`）的生成与测试（`C14-T8`–`T10`） | 第 ⑨a 片 `m1-web-assets` 前置生成物落地；`P.09` K303 |
| 2026-11-27 | 状态改回"冻结"：第 ⑨a 片 `m1-web-assets` squash 合并进代码仓库 `main`，提交 `dda3280ba7d936dfe7c2301abedb75f997013b55`（`G.02.06-R21`） | `relay slice` 与全量检查通过；三轮独立评审 22 条全部符合/已处理；Codex 合并并删分支 |
