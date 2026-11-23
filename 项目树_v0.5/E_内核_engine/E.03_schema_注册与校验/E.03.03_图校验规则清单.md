# E.03.03 图校验规则清单

| 项 | 内容 |
|---|---|
| 编号 | E.03.03 |
| 类型 | 实施 |
| 上级 | E.03 schema 注册与校验 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现 `C.11` §5 的全部图校验规则 V01–V18，支持全量和增量两种模式。

## 2. 不做什么
- 不定义规则含义和文案（`C.11`、`messages/diags.zh.yaml`）
- 不阻止 Op（流水线根据结果决定）

## 3. 继承的上级约束
`C.11` §5、`E.03-R1`、`E.03-R2`、INV-02、INV-06、INV-07。

## 4. 接口
```go
func Validate(g *graph.Graph, v View, opt Opts) []gen.Diag
func ValidateIncremental(g *graph.Graph, touched op.Touched, v View) []gen.Diag
type Opts struct {
    Mandates  MandateView   // V13（l3_skip_human）、V15 需要
    ForRun    bool          // 冻结前校验：warn 也返回，但只有 error 阻止运行
}
```

## 5. 行为
| 规则 | 实现要点 | 模式 |
|---|---|---|
| V01 | jsonschema 校验整份文档 | 全量；增量时只校验被触及的节点和连线的子结构 |
| V02 | `View.NodeDef` 查找 | 增量 |
| V03 | 按 ParamDef 生成的 JSON Schema 校验 params；`expr` 参数编译检查 | 增量 |
| V04 | 对比 `lock=def/kernel` 的参数 | 增量 |
| V05 | 端口存在、方向、同一子图（C.02.03） | 增量 |
| V06 | `Assignable` | 增量（受影响连线） |
| V07 | 非多连端口连线数、重复连线 | 增量 |
| V08 | 必填输入已连或有值 | 增量 |
| V09 | 每个子图 `SCCs()` 非空即报（INV-06） | 全量，按子图哈希缓存 |
| V10 | 循环参数至少一个有限出口 | 增量 |
| V11 | 容器规则表 + entry / exit 存在 | 增量 |
| V12 | `Depth` 与引用链 | 全量，缓存 |
| V13 | L3 工具反向 BFS 找人工节点 | 全量，缓存 |
| V14 | Agent.context 上游是上下文装配（C2 的友好提示，避免只报 V06） | 增量 |
| V15 | 子图权限交集 | 全量 |
| V16 | 来自 `Infer` | 全量，缓存 |
| V17 | 无任何连线的非端口节点 | 增量 |
| V18 | `max_rounds > 10` 且无预算 | 增量 |

- 每条规则是一个实现 `Rule` 接口的独立文件，按编号注册；新增规则只加文件，不改调度代码。
- 结果按（级别、子图、节点 ID、规则号）排序，保证确定。

## 6. 不变量
- 同一张图全量校验与"空图 + 逐个 Op 增量校验"的结果集合相同（属性测试）
- 性能：500 节点全量 < 20ms；增量 < 5ms（`U.17`）

## 7. 错误处理
规则内部 panic 被捕获，转为一条 `level=error, code=V01, msg="校验器内部错误"` 的诊断并记录日志，不影响其他规则。

## 8. 验收标准
1. `schema/examples/semantic/` 下清单里写了 `diag` 的每个文件，触发且只触发那个诊断码（`C.01-R23`）
2. 增量 = 全量（属性测试 500 组）
3. 基准达标

### 实施卡
- 要建 / 要改的文件：`engine/schema/validate.go`、`engine/schema/rules/v01.go … v18.go`、`engine/schema/validate_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0303-T01…T18 每条规则一组正反例`
  - `E0303-T19 增量与全量一致（rapid）`
  - `E0303-T20 BenchmarkValidate500`
  - `E0303-T21 规则 panic 隔离`
- 允许使用的依赖：标准库、`santhosh-tekuri/jsonschema/v6`、`expr-lang/expr`、`pgregory.net/rapid`（测试）
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 验收 1 改为读 `schema/examples/semantic/`（清单的 `diag`） | `P.09` K206 |
