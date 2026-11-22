# E.13.01 配方解析

| 项 | 内容 |
|---|---|
| 编号 | E.13.01 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引06 |
| 最后修改 | 2026-11-22 |

## 1. 职责
加载并校验配方，把 `from` 字段路径、`transform` 表达式编译成可执行的取值计划。

## 2. 不做什么
- 不定义配方格式（`C.13.01`）

## 3. 继承的上级约束
`C.13.01`、`C.13.01-R1`。

## 4. 接口
```go
type Plan struct { Recipe *gen.Recipe; Sections []SectionPlan }
type SectionPlan struct { Spec gen.Section; Path FieldPath; Transform Transform }
func Compile(r *gen.Recipe, inType map[string]*schema.Type) (*Plan, []gen.Diag)
type Transform interface { Apply(v exec.Value, blobs blob.Reader) (text string, ref string, err error) }
```

## 5. 行为
- `from` 路径：`in`、`in[0]`、`in.task.instruction`；按上游数据类型的字段定义检查路径存在（不存在 → 诊断 V03 级别 warn，"配方读取的字段 task.foo 不存在"）。
- `transform`：`as_is`（按 format 渲染）、`pointer`（只留标题 + 一句摘要 + 引用）、`summary`（标记为需要摘要，实际在溢出处理阶段执行）、`top_k(n)`、`fields(a,b)`、`template(...)`（只支持 `{{字段}}` 替换）。
- 编译结果按（配方引用、输入类型）缓存。

## 6. 不变量
- 编译不访问任何外部资源

## 7. 错误处理
配方不存在：V03 error；路径不存在：warn。

## 8. 验收标准
1. 6 个内置配方在闭环迭代模板里编译无 error
2. 错误路径给 warn

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/recipe.go`、`engine/ctxasm/transform.go`、`engine/ctxasm/recipe_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1301-T1 内置配方`
  - `E1301-T2 路径检查`
  - `E1301-T3 各 transform`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
