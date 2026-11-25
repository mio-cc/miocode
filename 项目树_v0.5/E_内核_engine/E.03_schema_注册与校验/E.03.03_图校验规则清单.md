# E.03.03 图校验规则清单

| 项 | 内容 |
|---|---|
| 编号 | E.03.03 |
| 类型 | 实施 |
| 上级 | E.03 schema 注册与校验 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引02 |
| 最后修改 | 2026-11-25 |

## 1. 职责
实现 `C.11` §5 的图校验规则，支持全量和增量两种模式。M1 做 V01–V12（V12 只查嵌套深度）、V14、V16、V17；V13、V15、V18 和 V12 的子图引用链在后面的里程碑补（`P.09` K256 ⑦）。

## 2. 不做什么
- 不定义规则含义和文案（`C.11`、`messages/diags.zh.yaml`）
- 不阻止 Op（流水线根据结果决定）
- 不检查节点有没有执行器（运行冻结时由 `E.16.01` 检查，第 ④ 片）

## 3. 继承的上级约束
`C.11` §5、`E.03-R1`–`R4`、INV-02、INV-06、INV-07。

## 4. 接口
```go
type Touched struct{ Nodes, Edges []string }  // 被改动的节点、连线 ID（含已删除的）；Op 流水线负责把 Op 转成它（第 ③ 片）
type Opts struct {
    ForRun bool  // 冻结前校验：warn 也返回，但只有 error 阻止运行
}
func Validate(g *graph.Graph, v View, opt Opts) []gen.Diag
func ValidateIncremental(g *graph.Graph, prev []gen.Diag, touched Touched, v View, opt Opts) []gen.Diag // prev 是上次的完整结果；返回新的完整结果

type Rule interface {
    Code() gen.DiagCode
    Check(c *Context) []gen.Diag  // Context 给出图、视图、推断结果、当前要检查的范围
}
```

## 5. 行为
| 规则 | 实现要点 | 模式 | 里程碑 |
|---|---|---|---|
| V01 | `View.DocSchema("graph.schema.json")` 校验整份文档 | 全量；增量时只校验被触及的节点和连线 | M1 |
| V02 | `View.NodeDef` 查找 | 增量 | M1 |
| V03 | 按 ParamDef 生成的 JSON Schema 校验 params；`type: expr` 的参数用 `expr-lang/expr` 编译检查；`type_ref` 能解析、里面的命名类型已注册；`recipe_ref`、`rolecard_ref` 指向的配方、角色卡存在；节点上写了定义里没有的参数也报；空字符串当作没写 | 增量 | M1 |
| V04 | 对比 `lock=def/kernel` 的参数 | 增量 | M1 |
| V05 | 端口存在、方向、两端都在同一子图（`C.02.03`）；悬空连线；动态端口写作 `名字[N]`（N 最多 3 位），不是动态端口的不能这样写 | 增量 | M1 |
| V06 | `Assignable` | 全量（类型跨子图传） | M1 |
| V07 | 非多连端口连线数、重复连线 | 增量 | M1 |
| V08 | 必填输入已连或有值 | 增量 | M1 |
| V09 | 每个子图 `SCCs()` 非空即报（INV-06） | 全量，按子图哈希缓存 | M1 |
| V10 | 定义里有 `max_rounds` 参数的节点：按轮次（`trigger` 不是 `event`）时有限；按事件时 `idle_timeout_ms`、`exits` 至少写一个 | 增量 | M1 |
| V11 | `gen.ContainerRules`（`children` / `ref` 必须、不允许、二选一）；子图里有入口和出口：类别为 `边界` 的节点、`role` 参数为 `entry` / `exit` | 增量 | M1 |
| V12 | 嵌套深度（`graph.Depth`）：> 4 warn，> 8 error | 全量，缓存 | M1；子图引用成环 M2（`E.14.13`） |
| V13 | 高风险工具上游要有人工节点 | — | M3（要工具风险级别和授权书，`E.06`） |
| V14 | 目标端口内核锁定（`lock: kernel`，即 Agent 的 `context`，INV-07）、按 C2 被拒（源头节点不是目标类型的 `producer`）时报 V14（比 V06 更具体的提示），这条连线不再报 V06；别的端口按 C2 被拒的报 V06，原因用 `assign.zh.yaml` 的 C2 文案（V14 的文案只说 context，`P.09` K259 ③） | 全量 | M1 |
| V15 | 子图权限交集 | — | M3（`E.06`） |
| V16 | 来自 `Infer` | 全量，缓存 | M1 |
| V17 | 一条连线都没有的节点；类别为 `边界` 的节点不算 | 增量 | M1 |
| V18 | 轮数多且没有预算 | — | M3（预算来自授权书，`C.09`） |

- 每条规则是一个实现 `Rule` 接口的独立文件，按编号注册；新增规则只加文件，不改调度代码。
- 节点的性质一律从 NodeDef、TypeDef 和生成的表读（类别、参数、`container`、`producer`），不比较节点类型名（INV-02，`G.05.05.01` 的 `typenamecheck` 检查 `engine/schema`）。
- 增量：局部规则（V02–V05、V07、V08、V10、V11、V17）只对 `touched` 里的节点、连线所在的子图和它们的父子图重新检查，其余沿用 `prev`；V01、V06、V09、V12、V14、V16 要看整张图或跨子图的类型，每次全量。`touched` 里有找不到的 ID（已删除）时退回全量：删掉的东西不知道原来在哪个子图（`P.09` K259 ④）。
- 不设 `ForRun` 时只返回 error（编辑时）；`ForRun` 时 warn 也返回。
- 结果用 `E.03.04` 的 `Sort`、`Dedup`，保证确定。
- **连线两端的端口**（V05–V08、V14）：普通节点用 `Ports`（`E.03.02`）；`子图引用` 没有声明端口，外部端口按 `C.02.04-R3` 由子图端口节点生成（`entry` → 输入端口，`exit` → 输出端口，`summary`、`escalation` → 同名输出端口；名字取 `port_name`，缺省 `in` / `out`，重名依次 `in_2`、`out_2`…），类型取那个端口节点推断出的类型。写在本叶子的 `ContainerPorts`（`validate.go`），`Ports` 不变（`P.09` K258 ⑤）。
- **源节点**（V06 的 `AssignAt.SrcNode`、V14）：源节点是入口端口节点（类别 `边界`、`role=entry`）时，沿容器上对应的外部输入端口（`port_name`；没写时按 `E.03.02` 入口端口的取法）的上游连线往上找；源节点是 `子图引用`、端口来自出口端口节点时，沿子图里连到那个出口端口节点的线往回找；一直找到不是这两种的节点。接了几路的逐路检查，有一路不是 `producer` 就报；找不到上游的不查（交给 V08、V16）（`P.09` K258 ④）。
- V11 补一条：子图端口节点写了 `port_name`，而声明了端口的容器（循环、扇出）上没有这个同方向的端口时报 V11（K258 ⑤）。
- V03：`type: object` 没写 `schema` 的参数接受任意 JSON（资源节点 `kind=列表` 的 `value` 是数组，K258 ⑥）。

## 6. 不变量
- 同一张图全量校验与"空图 + 逐个 Op 增量校验"的结果集合相同（属性测试在第 ③ 片跑，要先有 Op）
- 性能：500 节点全量 < 20ms；增量 < 5ms（`U.17`，`ANYDOOR_PERF=1` 时判）

## 7. 错误处理
规则内部 panic 被捕获，转为一条 `level=error, code=V01, msg="校验器内部错误：<规则号>"` 的诊断并记录日志，不影响其他规则。

## 8. 验收标准
1. `schema/examples/semantic/` 下清单里写了 `diag` 的每个文件，触发且只触发那个诊断码（`C.01-R23`）
2. M1 的每条规则有正反例
3. 增量结果与全量相同（本叶子的例子级测试；属性测试在第 ③ 片）
4. 基准达标

### 实施卡
- 要建 / 要改的文件：`engine/schema/validate.go`、`engine/schema/rules.go`、`engine/schema/rule_v01.go`、`engine/schema/rule_v02.go`、`engine/schema/rule_v03.go`、`engine/schema/rule_v04.go`、`engine/schema/rule_v05.go`、`engine/schema/rule_v06.go`、`engine/schema/rule_v07.go`、`engine/schema/rule_v08.go`、`engine/schema/rule_v09.go`、`engine/schema/rule_v10.go`、`engine/schema/rule_v11.go`、`engine/schema/rule_v12.go`、`engine/schema/rule_v14.go`、`engine/schema/rule_v16.go`、`engine/schema/rule_v17.go`、`engine/schema/validate_test.go`、`go.mod`、`go.sum`
- 规则文件放在 `engine/schema` 包里（不另建子包：子包要 import `engine/schema` 的 `Context`，而 `Validate` 又要注册它们，会成环）
- `go.mod` 只加 `github.com/expr-lang/expr`（`G.10` §3.1 已登记）
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/store/`、`engine/llm/`
- 测试用例：
  - `E0303-T01 V01`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T02 V02`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T03 V03`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T04 V04`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T05 V05`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T06 V06`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T07 V07`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T08 V08`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T09 V09`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T10 V10`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T11 V11`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T12 V12`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T14 V14`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T16 V16`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T17 V17`：正反例各至少一个（在测试里从 `graph_minimal.json` 改出来）；反例只报这一个码
  - `E0303-T20 校验性能`：`BenchmarkValidate500`、`BenchmarkValidateIncremental500`；`ANYDOOR_PERF=1` 时断言全量 < 20ms、增量 < 5ms
  - `E0303-T21 规则 panic 隔离`：测试里注册一条会 panic 的规则，其他规则的结果照常，多一条 V01 诊断
  - `E0303-T22 semantic 示例`：`schema/examples/manifest.yaml` 里写了 `diag` 的每个 `semantic/` 文件（按 `ForRun` 校验）触发那个码、不触发别的 error（`loop_without_children.json` 只有一个孤立的循环节点，同时有 V17 warn，`P.09` K259 ②）；`graph_minimal.json`、`graph_loop.json` 没有 error
  - `E0303-T23 增量与全量一致`：对 `graph_loop.json` 做 10 种改动（加删节点、连线、改参数），每次 `ValidateIncremental` 的结果与 `Validate` 相同
  - `E0303-T25 边界回溯与子图引用端口`：从 `graph_loop.json` 改：扇出子图里入口端口节点接 Agent 的 `context`：容器外部那根线的上游是上下文装配时不报，是资源节点时报 V14；`graph_loop.json` 里入口接 `model`、`tools` 不报；智囊扇出的列表换成 Agent 的输出时，入口接 `model` 报 V06（不是内核锁定的端口）；连到子图引用 `in`、`out` 的线不报 V05，连到它不存在的端口名报 V05；入口端口节点写了扇出上没有的 `port_name` 报 V11
  - `E0303-T24 运行前校验`：`ForRun` 时 warn 也返回；`HasError` 只看 error
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `E0303-T19 增量与全量一致（rapid）`：在 `E.05.01`（第 ③ 片）跑：随机 Op 序列逐个应用后增量校验，与全量相同（`pgregory.net/rapid`）
  - `E0303-T13 V13`、`E0303-T15 V15`、`E0303-T18 V18`：M3 `E.06` 落地时本叶子改回"已审"补上（`G.02.06-R21`）
- 允许使用的依赖：标准库、`gen`、`engine/graph`、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/expr-lang/expr`
- 禁止事项：`G.02.05` 全部；另：不比较节点类型名（INV-02）
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 验收 1 改为读 `schema/examples/semantic/`（清单的 `diag`） | `P.09` K206 |
| 2026-11-25 | 第 ①a / ①b 片（`m1-graph`、`m1-validate`）开工前复查：M1 做 V01–V12（V12 只查深度）、V14、V16、V17，V13、V15、V18 推到 M3，V12 的引用链推到 M2；`ValidateIncremental` 改用本包的 `Touched`（不 import `op`）；V10、V11、V14、V17 写明按数据判断、不比较类型名；规则文件放在本包里；rapid 属性测试移到第 ③ 片；加 `T22`–`T24`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K256 |
| 2026-11-25 | §5 写明子图引用的外部端口（`ContainerPorts`）、C2 / V14 的源节点沿边界回溯、V11 检查 `port_name`、V03 的 `object` 参数接受任意 JSON；加 `E0303-T25` | `P.09` K258 |
| 2026-11-25 | §5 V14 只管内核锁定的端口，别的 C2 报 V06；V03、V05 写全；写明增量的范围、删除时退回全量、`ForRun`；`T22` 允许 warn，`T25` 按 V14 / V06 的分工改 | `P.09` K259 |
| 2026-11-25 | 状态改为"冻结"：第 ①b 片（`m1-validate`）squash 合并进代码仓库 `main`，提交 `e662c6d2f58e4e26ed13c8304f6ab43b0125dc09`（`G.02.06-R21`） | `relay slice` 通过；`E.03.03` 第一轮 `T02`、`T21`、`T25` 用例输入写错、`G.05.05.01` 两处 errcheck，修复后通过；整片评审 16 行全部符合；按 `G.08-R3` 由验证者合并 |
