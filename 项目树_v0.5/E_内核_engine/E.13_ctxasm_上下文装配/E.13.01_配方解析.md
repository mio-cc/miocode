# E.13.01 配方解析

| 项 | 内容 |
|---|---|
| 编号 | E.13.01 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引06 |
| 最后修改 | 2026-11-26 |

## 1. 职责
定义装配用的值 `Value`；加载并校验配方，把来源、`from` 字段路径、`transform`、`exclude` 编译成取值计划；装配时按类型把输入分给各来源（`C.13.01-R4`）。

## 2. 不做什么
- 不定义配方格式（`C.13.01`）
- 不依赖执行器的值类型：`ctxasm` 只能依赖 `gen`、`schema`、`blob`、`llm`，所以本包自己定义 `Value`，执行器（第 ⑥ 片）把它的值转成 `Value`（`P.09` K271）
- 经验库（来源 `exp`，`C.13.01-R5`）M1 没有：`exp` 取值为空

## 3. 继承的上级约束
`C.13.01`、`C.13.01-R1`、`R4`–`R6`、`C.04.02` C5。

## 4. 接口
```go
// engine/ctxasm/value.go
type Value struct {
    Type     string         // 数据类型引用，如 任务卡@1、列表[方案@1]；空 = 任意
    Data     any            // JSON 解码后的值：map[string]any、[]any、string、float64、bool、nil
    Ref      blob.Ref       // 这个值在工作区的引用（有时有）
    Taint    bool
    TaintSrc []string
    Inherit  map[string]any // 沿数据流携带的 inherit 字段副本（E.13.06）
}
type Counter interface { CountText(s string) int }   // tokens.Counter 满足
type Error struct { Class gen.FailureClass; Code, Msg string }
func (e *Error) Error() string

// engine/ctxasm/recipe.go
type Plan struct {
    Recipe   *gen.Recipe
    Sources  map[string]*schema.Type   // recipe.inputs；exp 不在这里
    Sections []SectionPlan
    Exclude  []Exclusion
}
type SectionPlan struct {
    Spec      gen.Section
    Source    string     // 来源名；"" = in 全部；in[i] 时为 ""、Index = i
    Index     int        // -1 = 不是 in[i]
    Path      []string   // 来源之后的字段路径
    Transform Transform
    Format    string     // text | bullets | yaml | json；默认 text
    Order     int        // 在配方 sections 里的位置
}
type Exclusion struct { Type string; Path []string }   // type:方案 → Type；path:*.reasoning → ["*", "reasoning"]
func Compile(r *gen.Recipe, v schema.View) (*Plan, []gen.Diag)
type Cache struct{ /* 按"名称@版本"缓存，带锁 */ }
func (c *Cache) Compile(ref string, v schema.View) (*Plan, []gen.Diag)   // 配方不存在 → V03 error
type Bound struct { All []Value; Sources map[string]Value }
func (p *Plan) Bind(in []Value, v schema.View) (Bound, []gen.Diag)

// engine/ctxasm/transform.go
type Transform struct { Kind string; N int; Fields []string; Template string }   // as_is | pointer | summary | top_k | fields | template
func ParseTransform(s string) (Transform, error)
func (t Transform) Apply(data any) any       // top_k、fields、template 在这里做；pointer、summary 原样返回，由装配和溢出处理做
func RenderText(data any, format string) string
```

## 5. 行为
- **编译**：
  - `inputs` 里每个来源的类型用 `schema.Parse` 解析；解析不了 → V03 error。
  - `from`：`in` → 全部输入；`in[i]` → 第 i 条；`in.<来源>.<路径>` → 来源必须在 `inputs` 里或是 `exp`，否则 V03 error。路径按来源类型的字段定义逐层检查（`object` 看 `fields`，类型引用看那个类型的 `fields`，`列表[…]` 看元素）；不存在 → V03 warn"配方「X」读取的字段 task.foo 不存在"。
  - `transform` 解析不了 → V03 error；`exclude` 只认 `type:` 和 `path:` 两种前缀，其他 → V03 error。
- **来源分配**（`Bind`，`C.13.01-R4`）：输入按顺序看；值的类型和来源类型相同、或是它的子类型（沿 `extends`，`C.04.02` C5）就算兼容；`列表[X]` 来源收下所有兼容 `X` 或 `列表[X]` 的值、按顺序合成一个列表；一个值兼容两个来源、或非列表来源分到两个值时报 V03 error"配方「X」的来源 task 对应的输入不唯一"；类型为空的值不分给任何来源（只能用 `in`、`in[i]` 取）。
- **transform**：`as_is` 按 `format` 渲染；`pointer` 只留"标题 + 一句摘要 + 引用"（装配时做，`E.13.02`）；`summary` 标记为要摘要（溢出处理时做，`E.13.04`）；`top_k(n)` 取列表前 n 项；`fields(a,b)` 只留这些字段（列表逐项）；`template(...)` 只支持 `{{字段}}` 替换（列表逐项渲染、换行连接）。
- **渲染**：`text`：字符串原样，数字整数不带小数点，对象和列表按 `yaml` 渲染；`bullets`：列表每项一行"- "；`yaml`：键按字典序、两格缩进；`json`：两格缩进。渲染是确定的。
- 编译结果按配方引用缓存。

## 6. 不变量
- 编译和分配不访问任何外部资源
- 同样的配方和输入，计划和分配结果相同

## 7. 错误处理
配方不存在、来源不存在、`transform` 和 `exclude` 写错：V03 error；路径不存在：V03 warn；分配不唯一：V03 error（装配节点运行时转成 `user_input`）。

## 8. 验收标准
1. 6 个内置配方编译无 error
2. 错误路径给 warn
3. 各 transform 和渲染格式
4. 来源分配

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/value.go`、`engine/ctxasm/recipe.go`、`engine/ctxasm/transform.go`、`engine/ctxasm/recipe_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1301-T1 内置配方`：6 个内置配方用真实注册表编译，没有 error 级诊断
  - `E1301-T2 路径检查`：`in.task.foo` 给 warn；来源不在 `inputs` 里给 error；`in.exp` 不报
  - `E1301-T3 各 transform`：`top_k(2)`、`fields(a,b)`、`template({{title}}：{{url}})` 的结果；四种渲染格式的黄金字符串；写错的 transform 报 error
  - `E1301-T4 来源分配`：两条输入按类型分给 `goal`、`task`；三份方案合成 `plans`；两条 `目标@1` 输入对应一个 `goal` 时报 V03
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 按 `C.13.01-R4`、`R5` 分配来源；补 `E1301-T4` | `P.09` K221 |
| 2026-11-26 | 第 ⑤b 片（`m1-tools-ctx`）开工前复查：本包定义 `Value`、`Counter`、`Error`（不依赖执行器）；`Compile` 按配方 `inputs` 检查路径；加 `Bind`、`Cache`、渲染格式；`exp` 在 M1 为空；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K271 |
