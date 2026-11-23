# C.13.01 配方 recipe

| 项 | 内容 |
|---|---|
| 编号 | C.13.01 |
| 类型 | 实施 |
| 上级 | C.13 内置资产格式 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引06 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义配方的格式：上下文装配节点按配方决定 Agent 能看到什么、按什么顺序、各占多少预算、超出时怎么处理。

## 2. 定义
```json
{
  "$id": "https://anydoor.local/schema/recipe.schema.json",
  "x-version": "1.0",
  "type": "object",
  "required": ["name", "version", "sections", "budget", "on_overflow"],
  "additionalProperties": false,
  "properties": {
    "name":     { "type": "string", "maxLength": 40, "description": "如 执行者配方" },
    "version":  { "type": "integer", "minimum": 1, "description": "引用写作 执行者配方@1" },
    "description": { "type": "string" },
    "inputs":   { "type": "object", "propertyNames": { "pattern": "^[a-z_][a-z0-9_]*$", "not": { "const": "exp" } },
                  "additionalProperties": { "$ref": "types.schema.json#/$defs/TypeRef" },
                  "description": "来源名 → 数据类型；装配时按类型把 in 上的输入分给各来源（R4）" },
    "sections": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/Section" } },
    "exclude":  { "type": "array", "items": { "type": "string", "pattern": "^(type|path):.+$" },
                  "description": "排除的内容：type:方案（按类型）、path:*.reasoning（按字段路径）" },
    "budget":   { "type": "object", "required": ["ratio"], "additionalProperties": false,
                  "properties": { "ratio": { "type": "number", "minimum": 0, "exclusiveMinimum": 0, "maximum": 1 }, "max_ratio": { "type": "number", "minimum": 0, "maximum": 1 } } },
    "on_overflow": { "enum": ["pointer", "summarize", "truncate", "reject"] }
  },
  "$defs": {
    "Section": {
      "type": "object",
      "required": ["name", "from"],
      "additionalProperties": false,
      "properties": {
        "name":      { "type": "string", "maxLength": 20, "description": "任务 / 约束 / 参考资料 / 差距报告 / 经验" },
        "from":      { "type": "string", "description": "输入来源：in（全部输入）、in[0]、in.task.instruction（字段路径）" },
        "transform": { "type": "string", "pattern": "^(as_is|pointer|summary|top_k\\(\\d+\\)|fields\\([a-z_,]+\\)|template\\(.+\\))$", "default": "as_is" },
        "budget":    { "type": "number", "minimum": 0, "maximum": 1, "default": 0, "description": "本段占总预算的比例；0 = 不单独限制" },
        "required":  { "type": "boolean", "default": false, "description": "必需段被裁掉时直接失败（on_overflow 不适用）" },
        "priority":  { "type": "integer", "minimum": 0, "maximum": 9, "default": 5, "description": "超预算时先裁优先级低的（数字大 = 低）" },
        "format":    { "enum": ["markdown", "yaml", "bullets"], "default": "markdown" },
        "var":       { "type": "string", "pattern": "^[a-z_][a-z0-9_]*$", "description": "这一段渲染后的文字同时放进上下文包的 vars（R6）" }
      }
    }
  }
}
```

## 3. 规则
- **C.13.01-R1** `from` 的根只能是 `in`（上下文装配节点的输入端口）；字段路径对应上游数据类型的字段。旧文档的 `in_task`、`in_goal` 写法改为 `in.task`、`in.goal`（端口统一叫 `in`，多连时按 `in[0]`、`in[1]`）。
- **C.13.01-R2** 数据类型里标记了 `inherit` 的字段（`C.13.03`）一定会被带上，配方的 `exclude` 对它无效（`E.13.06`）。
- **C.13.01-R3** 预算 `ratio` 是相对 Agent 所用模型窗口大小的比例；上下文装配节点的 `budget` 参数会覆盖配方的 `ratio`，但不能超过 `max_ratio`。
- **C.13.01-R4** `from` 写 `in`（全部输入，按 `C.04.04` 的顺序）、`in[i]`（第 i 条输入）或 `in.<来源>.<字段路径>`。来源在顶层 `inputs` 里声明类型。装配时按类型分配：`in` 上的每个值交给类型兼容（`C.04.02`）的那个来源；`列表[X]` 来源收下所有兼容 `X` 或 `列表[X]` 的值，按顺序合成一个列表。一个值能分给两个来源、或一个非列表来源分到两个值时，校验报 V03（"配方「X」的来源 task 对应的输入不唯一"）；声明了但没有输入的来源取值为空，`required` 段照常报错（`E.13.02`）（`P.09` K221）。
- **C.13.01-R5** 保留来源名 `exp`：经验库条目，由上下文装配节点按本次任务检索（`引06` §9），不来自连线，不在 `inputs` 里声明。
- **C.13.01-R6** 段可以写 `var: <变量名>`：这一段渲染后的文字同时放进上下文包的 `vars`，供角色卡的 `{{变量}}` 使用（`C.13.02-R5`，`P.09` K222）。

## 4. 示例
```yaml
name: 执行者配方
version: 1
inputs: { task: 任务卡@1, goal: 目标@1 }
sections:
  - { name: 任务,     from: in.task.instruction, required: true, priority: 0 }
  - { name: 目的,     from: in.task.purpose,     required: true, priority: 0 }
  - { name: 好结果,   from: in.task.good_result, required: true, priority: 0 }
  - { name: 检查项,   from: in.task.checklist,   priority: 1, format: bullets }
  - { name: 约束,     from: in.goal.constraints, priority: 0 }
  - { name: 必要输入, from: in.task.inputs,      transform: pointer, budget: 0.4, priority: 2 }
  - { name: 经验,     from: in.exp,              transform: top_k(3), budget: 0.05, priority: 3 }
exclude: ["type:方案", "path:*.reasoning", "path:history"]
budget: { ratio: 0.1, max_ratio: 0.25 }
on_overflow: pointer
```

## 5. 内置配方
每段 YAML 就是 `schema/builtin/recipes/<名称>.yaml` 的全部内容，文件名与 `name` 相同；引用写 `<名称>@1`。执行者配方就是 §4 的示例。

`from` 按 §4 示例的写法：`in.<来源>.<字段路径>`。各配方用到的来源和它的类型如下，字段路径都是 `C.13.03` §5 里有的字段：

| 来源 | 类型 | 用到的配方 |
|---|---|---|
| `in.goal` | `目标@1` | 全部 |
| `in.task` | `任务卡@1` | 执行者 |
| `in.exp` | 经验库条目（`E.13`，不是数据类型，整段取用） | 执行者 |
| `in.gap` | `差距报告@1` | 智囊、决策者、验收者 |
| `in.plans` | `列表[方案@1]` | 聚类员、决策者 |
| `in.clusters` | `簇标注@1` | 决策者 |
| `in.results` | `列表[执行结果@1]` | 智囊、验收者 |
| `in.ledger` | `状态@1` | 主脑 |
| `in.brief` | `简报@1` | 主脑 |
| `in.escalation` | `升级@1` | 主脑 |

每个配方在 `inputs` 里声明它用到的来源和类型（R4）；`in.exp` 是保留来源，不声明（R5）。YAML 的行内写法里，`fields(a,b)` 带逗号、`列表[…]` 带方括号，要加引号。

```yaml
name: 主脑配方
version: 1
inputs: { goal: 目标@1, escalation: 升级@1, brief: 简报@1, ledger: 状态@1 }
description: 长驻主脑每次唤醒时的上下文：原始意图、约束、验收标准、账本快照、本次的简报或升级
sections:
  - { name: 原始意图, from: in.goal.intent,      required: true, priority: 0 }
  - { name: 约束,     from: in.goal.constraints, priority: 0 }
  - { name: 验收标准, from: in.goal.criteria,    required: true, priority: 0, format: bullets }
  - { name: 升级,     from: in.escalation, transform: "fields(kind,severity,question,options)", priority: 0 }
  - { name: 简报,     from: in.brief,      transform: "fields(goal_id,status,conclusion,criteria_check)", budget: 0.2, priority: 1, format: bullets }
  - { name: 账本快照, from: in.ledger.value, transform: pointer, budget: 0.3, priority: 2, format: yaml }
exclude: ["type:方案", "type:执行结果"]
budget: { ratio: 0.2, max_ratio: 0.4 }
on_overflow: summarize
```

```yaml
name: 智囊配方
version: 1
inputs: { goal: 目标@1, gap: 差距报告@1, results: "列表[执行结果@1]" }
description: 独立智囊：只看目标、约束、差距和资料，看不到其他智囊的方案
sections:
  - { name: 目标,       from: in.goal.intent,      required: true, priority: 0 }
  - { name: 约束,       from: in.goal.constraints, priority: 0 }
  - { name: 验收标准,   from: in.goal.criteria,    priority: 1, format: bullets }
  - { name: 差距报告,   from: in.gap.gaps,         budget: 0.1, priority: 1 }
  - { name: 已证伪方向, from: in.gap.tried,        budget: 0.1, priority: 1, format: bullets }
  - { name: 参考资料,   from: in.results, transform: pointer, budget: 0.2, priority: 3 }
exclude: ["type:方案", "type:簇标注"]
budget: { ratio: 0.1, max_ratio: 0.3 }
on_overflow: pointer
```

```yaml
name: 聚类员配方
version: 1
inputs: { goal: 目标@1, plans: "列表[方案@1]" }
description: 聚类员：只看各方案的理解、核心手段和关键假设
sections:
  - { name: 目标, from: in.goal.intent, required: true, priority: 0 }
  - { name: 方案, from: in.plans, transform: "fields(understanding,core_approach,key_assumptions)", budget: 0.6, required: true, priority: 0, format: yaml }
  - { name: 约束, from: in.goal.constraints, budget: 0.1, priority: 1 }
exclude: ["type:执行结果", "path:*.steps"]
budget: { ratio: 0.05, max_ratio: 0.2 }
on_overflow: summarize
```

```yaml
name: 决策者配方
version: 1
inputs: { goal: 目标@1, clusters: 簇标注@1, plans: "列表[方案@1]", gap: 差距报告@1 }
description: 决策者：看方案簇和方案要点，产出任务卡
sections:
  - { name: 目标,     from: in.goal.intent,      required: true, priority: 0 }
  - { name: 约束,     from: in.goal.constraints, priority: 0 }
  - { name: 验收标准, from: in.goal.criteria,    priority: 0, format: bullets }
  - { name: 方案簇,   from: in.clusters.labels,  required: true, budget: 0.2, priority: 0 }
  - { name: 冲突,     from: in.clusters.conflicts, priority: 1 }
  - { name: 方案,     from: in.plans, transform: "fields(understanding,core_approach,steps)", budget: 0.3, priority: 1, format: yaml }
  - { name: 差距报告, from: in.gap.gaps,         budget: 0.1, priority: 2 }
exclude: ["type:执行结果"]
budget: { ratio: 0.08, max_ratio: 0.3 }
on_overflow: pointer
```

```yaml
name: 执行者配方
version: 1
inputs: { task: 任务卡@1, goal: 目标@1 }
description: 执行者：只看手上的任务卡、约束、必要输入和相关经验
sections:
  - { name: 任务,     from: in.task.instruction, required: true, priority: 0 }
  - { name: 目的,     from: in.task.purpose,     required: true, priority: 0 }
  - { name: 好结果,   from: in.task.good_result, required: true, priority: 0 }
  - { name: 检查项,   from: in.task.checklist,   priority: 1, format: bullets }
  - { name: 约束,     from: in.goal.constraints, priority: 0 }
  - { name: 必要输入, from: in.task.inputs,      transform: pointer, budget: 0.4, priority: 2 }
  - { name: 经验,     from: in.exp,              transform: top_k(3), budget: 0.05, priority: 3 }
exclude: ["type:方案", "path:*.reasoning", "path:history"]
budget: { ratio: 0.1, max_ratio: 0.25 }
on_overflow: pointer
```

```yaml
name: 验收者配方
version: 1
inputs: { goal: 目标@1, results: "列表[执行结果@1]", gap: 差距报告@1 }
description: 验收者：对照验收标准看执行结果和证据，看不到方案
sections:
  - { name: 验收标准, from: in.goal.criteria,    required: true, priority: 0, format: bullets }
  - { name: 约束,     from: in.goal.constraints, priority: 0 }
  - { name: 结果,     from: in.results, transform: "fields(task_id,status,conclusion,confidence)", required: true, budget: 0.3, priority: 0 }
  - { name: 证据,     from: in.results, transform: "fields(task_id,sources)", budget: 0.3, priority: 2 }
  - { name: 差距报告, from: in.gap.gaps,         budget: 0.1, priority: 3 }
exclude: ["type:方案", "type:簇标注"]
budget: { ratio: 0.1, max_ratio: 0.3 }
on_overflow: pointer
```

## 6. 验收标准
1. 内置 6 个配方（主脑、智囊、聚类员、决策者、执行者、验收者）都通过校验。
2. `transform: top_k(x)` 校验失败。

### 实施卡
- 要建 / 要改的文件：`schema/recipe.schema.json`、`schema/builtin/recipes/主脑配方.yaml`、`schema/builtin/recipes/智囊配方.yaml`、`schema/builtin/recipes/聚类员配方.yaml`、`schema/builtin/recipes/决策者配方.yaml`、`schema/builtin/recipes/执行者配方.yaml`、`schema/builtin/recipes/验收者配方.yaml`、`tools/schemacheck/recipe_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C1301-T1 内置配方校验`：`schema/builtin/recipes/` 下恰好是 §5 的 6 个文件，都通过 `recipe.schema.json`；文件名等于 `name`；`version` 为 1
  - `C1301-T2 schema 反例`：测试里内联：`transform: top_k(x)` 失败；`on_overflow: drop` 失败；`budget.ratio: 0` 失败；段里多出属性失败；`exclude` 写 `方案`（没有 `type:` / `path:` 前缀）失败
  - `C1301-T3 字段路径`：每个 `sections[].from` 的根是 `in`（R1）；按 §5 来源表（表在测试里）查到类型后，后面的字段路径在 `schema/builtin/types/` 对应类型里逐级存在（`列表[…]` 取元素类型）；`fields(…)` 里的名字也都存在；`in.exp` 不查字段
  - `C1301-T4 来源声明`：每个 `in.<来源>` 都在本配方的 `inputs` 里（`exp` 除外）；`inputs` 的类型与 §5 来源表一致，且都在 `schema/builtin/types/` 有定义；`inputs` 声明 `exp` 时 schema 校验失败
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 6 个内置配方在闭环迭代模板里编译无 error：`E1301-T1`（`E.13.01`）
  - `exclude` 去不掉 `inherit` 字段（R2）：`E1306-T2`（`E.13.06`）
  - 预算覆盖不超过 `max_ratio`（R3）：`E1303-T2`（`E.13.03`）
  - 来源按类型分配、不唯一时报 V03（R4）：`E1301-T4`（`E.13.01`）
  - `var` 进入上下文包的 `vars`（R6）：`E1302-T5`（`E.13.02`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 新增 §5 内置配方：6 个配方的完整内容和来源表；验收标准移到 §6；实施卡按 `G.02.06-R24` 重写 | `P.09` K218 |
| 2026-11-23 | 新增 `inputs`（来源按类型分配，R4）、保留来源 `exp`（R5）、段的 `var`（R6）；6 个内置配方补 `inputs` | `P.09` K221、K222 |
| 2026-11-23 | 状态改为"已审"：第 3 片（`m0-contract-2`）开工前复查完成（用户授权设计方自主裁决，2026-11-23 15:00） | `G.02.01-R2`；`P.09` K210 |
| 2026-11-23 | `budget.ratio`、`max_ratio` 补 `minimum: 0`（`C.01-R11`：名字以 ratio 结尾的字段写 0–1；`ratio` 仍要求大于 0） | 第 3 片实施；`P.09` K226 |
| 2026-11-23 | 状态改为"冻结"：第 3 片（`m0-contract-2`）squash 合并进代码仓库 `main`，提交 `2fd3c25a165e36565f95fa9b16fc3d22a0569ec6`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 14 条全部符合，两条"有疑问"由设计方裁决（`P.09` K226）、返工并复核；按 `G.08-R3` 由验证者合并 |
