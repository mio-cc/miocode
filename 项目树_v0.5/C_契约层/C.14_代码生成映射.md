# C.14 代码生成映射

| 项 | 内容 |
|---|---|
| 编号 | C.14 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§4 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义 `schema/` 到 Go 代码和 TypeScript 代码的生成规则，特别是生成器处理不好的情况（判别联合、可空、开放对象）怎么办。生成流程和命令见 `G.16`。

## 2. 工具
| 目标 | 工具 | 输出位置 |
|---|---|---|
| Go 类型 | `omissis/go-jsonschema` | `gen/*.go` |
| TS 类型 | `json-schema-to-typescript` | `web/src/lib/protocol/generated/*.ts` |
| 常量（事件名、Op 种类、错误码、诊断码、动作名） | 自研小工具 `tools/gen/consts`，读 schema 里的枚举 | `gen/consts.go`、`generated/consts.ts` |
| 数据表（容器规则、控件映射、判定表、状态机、类别映射） | `tools/gen/tables`，读 `schema/builtin/*.yaml` | `gen/tables.go`、`generated/tables.ts` |
| 前端字段映射表（不透明字段、映射字段，§5.1） | `tools/gen/wire`，读全部 `schema/*.schema.json` | `generated/wire.ts`（只有前端用） |

## 3. 映射规则
| JSON Schema | Go | TS |
|---|---|---|
| `object` + `additionalProperties: false` | `struct` | `interface` |
| 开放对象（`params`、`meta`、`ui`） | `map[string]json.RawMessage`（保留未知字段，`C.01-R19`） | `Record<string, unknown>` |
| `$ref: Ulid` | `type Ulid string` | `type Ulid = string & { __brand: 'Ulid' }` |
| `Timestamp` | `time.Time`（序列化强制 UTC 毫秒） | `string` |
| `enum` | `type X string` + 常量 | 字符串字面量联合 |
| 可选字段 | 指针或带 `omitempty` 的零值（按字段是否需要区分"没填"和"零值"：需要区分用指针） | `?:` |
| 带 `default` 的字段 | 生成 `ApplyDefaults()` 方法 | 生成 `withDefaults()` 函数 |
| `integer` | `int64` | `number` |
| `oneOf` + `kind` 判别 | **见 §4** | 判别联合类型 |

## 4. 判别联合
Op 的 `payload`、事件的 `data`、`MessageBlock`、`NodeDef.impl` 都是"按某个字段取值决定结构"。Go 生成器对这种结构支持不好，所以：
- **C.14-R1** schema 里统一写成：外层对象有判别字段（`kind` 或 `type`），每个分支用 `if: {properties: {kind: {const: "x"}}}` + `then: {properties: {payload: {$ref: "#/$defs/XPayload"}}}`。每个分支的载荷单独定义成 `$defs/XPayload`。
- **C.14-R2** Go：生成器只生成各个 `XPayload` 结构体；外层由 `tools/gen/union` 生成：
```go
type Op struct {
    Kind    OpKind          `json:"kind"`
    Payload json.RawMessage `json:"payload"`
    // …其他公共字段
}
func (o *Op) Decode() (any, error)            // 按 Kind 解出对应 *XPayload
func DecodeAs[T any](o *Op) (*T, error)
```
- **C.14-R3** TS：生成真正的判别联合，`switch (op.kind)` 时各分支自动收窄类型。
- **C.14-R4** 每种判别联合都有"Go 编码 → TS 解码 → TS 编码 → Go 解码"的往返测试，所有分支都覆盖。

## 5. 命名
- **C.14-R5** Go 类型名 = schema 的 `title` 或 `$defs` 名，PascalCase；字段名由生成器从 snake_case 转 PascalCase，缩写按 Go 习惯（`ID`、`URL`、`HTTP`）。
- **C.14-R6** 常量命名：事件 `EvNodeState`（`node.state`）、Op `OpAddNode`、错误码 `ErrCodeGraphConflict`、诊断码 `DiagV09`、动作 `ActOpAddNode`。TS 里同名常量对象：`Ev.NodeState`、`OpKind.AddNode`、`ErrCode.GraphConflict`、`DiagCode.V09`、`Act.OpAddNode`、SSE 控制帧 `SseControl.Resync`（`C.06.01` §4）；其他枚举的常量对象与类型同名，如 `RunStatus.Done`（`W.04.04-R7`，`P.09` K85）。
- **C.14-R7** 中文枚举值（节点类型名）生成常量时用拼音或英文别名，表定义在 `schema/builtin/aliases.yaml`：`资源 → Resource`、`上下文装配 → ContextAssembly`、`扇出 → Fanout`、`汇合 → Join`、`聚合 → Aggregate`、`分支 → Branch`、`循环 → Loop`、`账本 → Ledger`、`人工 → Human`、`子图端口 → SubPort`、`子图引用 → SubRef`、`工具 → Tool`、`Agent → Agent`。

### 5.1 前端字段映射表（`P.09` K84）
前端在 `lib/protocol/mapping.ts` 把 snake_case 字段名转成 camelCase（`W.04.03`）。哪些位置的值不能转换，由生成器从 schema 算出，前端不手写名单：
- **C.14-R8** `tools/gen/wire` 输出 `generated/wire.ts`：`OPAQUE_KEYS`（字段的 schema 是开放对象或没有类型约束：值整体原样）、`MAP_KEYS`（只有 `additionalProperties`、没有 `properties` 的对象：键是数据，值继续转换），以及对应的字面量联合类型 `OpaqueKey`、`MapKey`。判别联合里按 `if/then` 收窄的字段（`payload`、`data`）不算不透明。同一个字段名在不同位置分类不同时，取"不透明 > 映射 > 结构"中最保守的一种，并在文件注释里列出这些字段名。
- **C.14-R9** 生成器检查每个字段名都能无损往返 `snake_case → camelCase → snake_case`：`C.01-R4` 之外，再拒绝"下划线后面紧跟数字"（`x_2`）和连续下划线（`a__b`）。不满足时生成失败。

## 6. 不允许
- 手改任何生成文件（`G.02.05-R1`）。生成结果不满意时，改 schema 或改生成工具。
- 在 `gen/` 以外重复定义与 schema 相同的结构（`G.02.05-R2`）。内部需要额外字段时用组合（嵌入生成的类型），不复制。

## 7. 验收标准
1. `make gen` 两次结果完全相同（确定性）。
2. 所有判别联合的往返测试通过。
3. CI 里 `make gen && git diff --exit-code` 通过。

### 实施卡
- 要建的文件：`tools/gen/main.go`、`tools/gen/consts/`、`tools/gen/tables/`、`tools/gen/union/`、`schema/builtin/aliases.yaml`。
- 测试用例：`C14-T1`（确定性）、`C14-T2`（往返）。
- 允许使用的依赖：`omissis/go-jsonschema`（作为生成工具，不进运行时）、`json-schema-to-typescript`（开发依赖）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §2 加前端字段映射表；R6 补 TS 常量对象名；新增 §5.1（R8、R9） | `P.09` K84、K85（写 `W.04.03`、`W.04.04` 时发现映射规则和 TS 常量名没有定义） |
