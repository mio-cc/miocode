# E.03.02 类型检查与 T 推断

| 项 | 内容 |
|---|---|
| 编号 | E.03.02 |
| 类型 | 实施 |
| 上级 | E.03 schema 注册与校验 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引02 |
| 最后修改 | 2026-11-25 |

## 1. 职责
实现 `C.04` 的类型系统：解析 TypeRef、判断两个端口能否连接（C0–C10）、推断类型变量、展开动态端口。

## 2. 不做什么
- 不决定连线是否被创建（Op 流水线根据结果决定）
- 不渲染提示文案以外的界面信息

## 3. 继承的上级约束
`C.04.01`–`C.04.04`、`C.03.02` §5、`C.03.05-R4`、INV-07、`E.03-R1`、`R3`。

## 4. 接口
```go
type Kind int // Any | Named | List | Var
type Type struct {
    Kind  Kind
    Name  string; Major, Minor int
    Elem  *Type
    Var   string
}
var ErrBadTypeRef = errors.New("schema: 类型写法不对")
func Parse(ref string) (*Type, error)
func (t *Type) String() string
func Category(t *Type, portCategory string, v View) string  // C.04.01 §3（按 gen 的 CategoryRules）

type AssignAt struct{ SrcNode string; DstContainer bool }               // 源节点的类型（C2 的 producer 检查）；目标是容器节点时不做 C7 展开（C.04.02-R3）
func Assignable(src, dst *Type, at AssignAt, ts TypeSource) gen.Assign  // C.04.02 规则表；TypeSource 见 E.03.01（Type + Messages）
func Infer(g *graph.Graph, v View) (Types, []gen.Diag)                   // C.04.03 算法
type Types interface {
    Port(nodeID, port, dir string) *Type                                 // dir: in / out；端口不存在时 nil
}
func Ports(n *graph.Node, def *gen.NodeDef, v View) (in, out map[string]*gen.PortDef) // 静态端口 + 动态端口展开（C.03.02 §5、C.03.05-R4）
type SchemaSource interface{ ObjectSchema(ref string) (json.RawMessage, bool) } // 视图实现它才展开 schema_from（工具注册表在 E.11 接入）
func ExpandSchema(schema json.RawMessage, reserved []string) (bool, []ExpandedParam) // C.03.02 §5 的 R7、R8、R10
func TemplateVars(s string) []string                                     // {{变量}}，按出现顺序去重
type InferCache struct{ /* 私有 */ }                                       // 图文档哈希 + 注册表哈希都没变时直接用上次的结果
func (c *InferCache) Infer(g *graph.Graph, v View) (Types, []gen.Diag)
func (c *InferCache) Misses() int                                         // 重新计算的次数
```

## 5. 行为
- `Assignable` 严格按 `C.04.02` 规则表顺序判断，返回命中的规则号和中文原因（`View.Messages().Assign`，文案来自 `assign.zh.yaml`）。
- C2 系统类型的 `producer` 检查：目标类型的 `TypeDef.Producer` 与源节点的类型比较——数据来自 `schema/builtin/types/*.yaml`，不硬编码（`E.03-R1`）。
- C5 继承：按 `TypeDef.Extends` 向上找。
- `Infer` 按 `C.04.03` §3 的 6 步。容器子图里的入口端口节点（`role=entry`）没有上游连线时，类型取自容器节点：写了 `port_name` 取容器上那个输入端口对应的变量，否则取容器第一个来自 `input:` 的变量；容器上没有对应变量、那个端口也没有声明具体类型时（子图引用的端口来自子图里的端口节点，扇出的 `shared` 声明为 `任意`），取连到容器那个输入端口的上游类型（`port_name` 没写时按 `in`；接了几路上游时按 `任意`）；`body:R` 取子图里 `role=R` 的端口节点的变量（读子图端口节点定义里的参数，不比较节点类型名）。`input:X.elem` 的上游不是列表时，变量取上游本身的类型，端口类型照常确定，"单个值接列表"由连线检查按 C8 报 V06（`C.04.03-R1`），不报 V16。
- 来源写法 `field:<端口>(<参数>)`（`C.04.03` §2）：取连到这个输入端口的上游类型，在它的 `TypeDef` 里按参数值给出的字段路径（点分，经过 `fields` 嵌套）找字段；字段是 `列表[X]` 时取 `X`，`X` 不是已注册的命名类型（`object`、标量）时按 `任意`；上游是 `任意` 时按 `任意`；参数没写、字段不存在或不是列表时取不到。`<来源> | <来源>`：依次尝试，第一个取到的为准；V16 的建议按第一个来源写（`P.09` K258）。
- `InferCache` 按"图文档哈希 + 注册表哈希"缓存：推断要跨子图传类型，按子图分容易出错，性能够用时不拆。
- 推断冲突不报推断错误，交给 V06（`C.04.03-R1`）；推断不出、而且用到这个变量的端口有连线时生成 V16（没接线的不报），文案写端口和建议设置的参数（或要接的线）。
- `Ports`：提示词变量按出现顺序去重、每个一个输入端口（类型取 `dynamic_ports.type`，没写时 `任意`）；`schema_from` 按 `C.03.02` §5 展开，端口一律 `任意`，视图实现了 `SchemaSource` 时才展开（M1 的内置视图不展开）。

## 6. 不变量
- 同样输入结果确定
- `Assignable` 与前端实现对同一组测试向量逐条一致（`C.04.02-R1`，向量 `schema/examples/assign_vectors.json`）

## 7. 错误处理
TypeRef 语法错误返回包着 `ErrBadTypeRef` 的错误；推断不出时生成 V16 诊断，不返回错误。

## 8. 验收标准
1. `assign_vectors.json` 全部通过
2. 闭环迭代模板（`graph_loop.json`）推断无 V16
3. 500 节点全量推断 < 10ms（`ANYDOOR_PERF=1` 时判）

### 实施卡
- 要建 / 要改的文件：`engine/schema/types.go`、`engine/schema/assign.go`、`engine/schema/infer.go`、`engine/schema/ports.go`、`engine/schema/types_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/store/`、`engine/llm/`
- 测试用例：
  - `E0302-T1 TypeRef 解析`：合法与非法各 10 条；`String()` 往返
  - `E0302-T2 assign_vectors 全集`：每条的 `ok`、`rule`、`expand`、`migrate` 与向量相同，`reason` 与 `assign.zh.yaml` 渲染的文案相同
  - `E0302-T3 推断模板`：`graph_loop.json` 推断后没有 V16，`$T` 端口都有确定类型
  - `E0302-T4 推断缓存失效正确`：改一个节点的参数后重新推断，结果反映改动；同一张图再次推断命中缓存（`Misses()` 计数）
  - `E0302-T5 推断性能`：`BenchmarkInfer500`；`ANYDOOR_PERF=1` 时断言 < 10ms
  - `E0302-T8 字段来源与备选来源`：聚合接 `value`（`簇标注@1`）、`list_field: labels` 时 `T` 为 `任意`、`result` 按算子（`group_ratio` → `聚合结果@1`，`dedupe` → `列表[任意]`）；接 `items` 时照旧取元素类型；`list_field` 写成不存在的字段、`result` 有连线时报 V16；嵌套路径（`a.b`）能找到
  - `E0302-T6 动态端口`：提示词变量去重后每个一个端口；`schema_from` 按 `schema_expand_vectors.json` 展开出的端口名、类型与期望一致（`C.03.02` §5、`C.03.05-R4`）
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `E0302-T7 前后端判定一致`：在前端的连线类型检查（M1 第 ⑪ 片 `W.06.08`）跑：TS 实现读同一份 `assign_vectors.json`
- 允许使用的依赖：标准库、`gen`、`engine/graph`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 补动态端口 `engine/schema/ports.go` 与 `E0302-T6` | `P.09` K214 |
| 2026-11-25 | 第 ①a / ①b 片（`m1-graph`、`m1-validate`）开工前复查：文案改为通过 `View.Messages()` 取；`Assignable` 加源节点参数（C2 的 producer 检查）；写明缓存和动态端口的接口；前端一致性的用例写明在第 ⑪ 片跑；性能阈值只在 `ANYDOOR_PERF=1` 时判；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K256 |
| 2026-11-25 | §5 补推断的两条规则：入口端口在容器上找不到变量时取容器那个端口的上游类型；`.elem` 的上游不是列表时取上游本身的类型、冲突交给 V06 | `P.09` K257（第 ①a 片验证时 `E0302-T3` 失败） |
| 2026-11-25 | 状态改为"冻结"：第 ①a 片（`m1-graph`）squash 合并进代码仓库 `main`，提交 `e7b8b5e59d877d9c795c8cf040dd024e7d3b7116`（`G.02.06-R21`） | `relay slice` 通过；第一轮 `E0302-T3` 失败，按 `P.09` K257 修复后通过；整片评审 27 行全部符合；按 `G.08-R3` 由验证者合并 |
| 2026-11-25 | 冻结后修改，状态改回"已审"：§5 实现 `field:` 和 `\|` 两种来源写法；加 `E0302-T8` | `P.09` K258（`G.02.06-R21`） |
