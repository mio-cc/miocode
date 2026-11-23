# C.13.03 类型声明 types

| 项 | 内容 |
|---|---|
| 编号 | C.13.03 |
| 类型 | 实施 |
| 上级 | C.13 内置资产格式 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引02 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义业务数据类型的声明格式（`方案@1`、`任务卡@1` 这样的类型）。Agent 的 `output_schema`、连线检查、配方的字段路径都依赖它。

## 2. 定义
```json
{
  "$id": "https://anydoor.local/schema/typedef.schema.json",
  "x-version": "1.0",
  "type": "object",
  "required": ["name", "major", "minor"],
  "oneOf": [ { "required": ["fields"] }, { "required": ["scalar"] } ],
  "additionalProperties": false,
  "properties": {
    "name":     { "type": "string", "pattern": "^[^@\\[\\]/\\s]{1,30}$" },
    "major":    { "type": "integer", "minimum": 1 },
    "minor":    { "type": "integer", "minimum": 0 },
    "description": { "type": "string", "maxLength": 300 },
    "extends":  { "$ref": "types.schema.json#/$defs/TypeRef", "description": "继承的父类型，子类型可以接到父类型端口（C.04.02 C5）" },
    "category": { "$ref": "types.schema.json#/$defs/Category", "default": "gen", "description": "业务类型只能是 gen" },
    "system":   { "type": "boolean", "default": false, "description": "系统类型（C.04.01 §4）：只有内置，扩展包不能声明" },
    "producer": { "$ref": "graph.schema.json#/$defs/NodeTypeRef", "description": "只能由这种节点产出（C.04.02 C2）；只用于系统类型" },
    "scalar":   { "enum": ["string", "integer", "number", "boolean"], "description": "标量类型（如 整数@1）；写了 scalar 就不写 fields" },
    "fields":   { "type": "array", "items": { "$ref": "#/$defs/Field" } },
    "migrate_from": { "type": "object", "additionalProperties": { "type": "string" },
                      "description": "旧主版本 → 迁移表达式（expr-lang），如 {\"1\": \"{title: v.name, ...v}\"}" }
  },
  "$defs": {
    "Field": {
      "type": "object",
      "required": ["name", "type"],
      "additionalProperties": false,
      "properties": {
        "name":      { "type": "string", "pattern": "^[a-z_][a-z0-9_]*$" },
        "type":      { "type": "string", "description": "string | integer | number | boolean | object | TypeRef | 列表[…]；object 和 列表[object] 用 fields 写成员" },
        "label":     { "type": "string", "maxLength": 20 },
        "required":  { "type": "boolean", "default": false },
        "inherit":   { "type": "boolean", "default": false, "description": "沿数据流向下游强制透传，配方不能排除（E.13.06）" },
        "max_chars": { "type": "integer", "minimum": 1 },
        "enum":      { "type": "array", "items": { "type": "string" } },
        "readonly_except": { "type": "array", "items": { "type": "string" }, "description": "写入账本时只有这些节点标签能改" },
        "append_only":     { "type": "boolean", "default": false },
        "require_reason":  { "type": "boolean", "default": false },
        "since_minor": { "type": "integer", "minimum": 0, "description": "第几个次版本加入的字段" },
        "fields":    { "type": "array", "items": { "$ref": "#/$defs/Field" }, "description": "type 为 object 或 列表[object] 时的成员字段" }
      }
    }
  }
}
```

## 3. 规则
- **C.13.03-R1** 次版本只能新增**可选**字段（`since_minor` 写上次版本号）；改字段、删字段、新增必填字段都必须升主版本，并提供 `migrate_from`。
- **C.13.03-R2** 系统类型（`C.04.01` §4）不能被继承、不能被覆盖。
- **C.13.03-R4** 内置类型（`P.09` K205）：系统类型 7 个——`资源引用@1`、`上下文包@1`、`工具端点@1`、`状态@1`、`简报@1`、`升级@1`、`整数@1`（`system: true`；前 6 个的 `producer` 见 `C.04.01` §4，`整数@1` 是 `scalar: integer`、没有 `producer`）；业务类型 10 个——`方案@1`、`簇标注@1`、`任务卡@1`、`执行结果@1`、`判定@1`、`目标@1`、`差距报告@1`、`聚合结果@1`、`统计@1`、`分歧报告@1`。完整声明见 §5，本叶子在第 3 片实施。
- **C.13.03-R3** 每个类型同时生成一份 JSON Schema（运行时校验 Agent 输出用），由 `engine/schema` 在加载时生成并缓存，不手写。

## 4. 示例
YAML 的行内写法（`{ … }`）里，带方括号的类型要加引号。
```yaml
name: 任务卡
major: 1
minor: 1
description: 决策者分派给执行者的一项任务
fields:
  - { name: instruction, type: string, label: 任务, required: true, max_chars: 500 }
  - { name: purpose,     type: string, label: 目的, required: true }
  - { name: good_result, type: string, label: 好结果, required: true }
  - { name: checklist,   type: "列表[string]", label: 检查项 }
  - { name: inputs,      type: "列表[任意]", label: 必要输入 }
  - { name: constraints, type: "列表[string]", label: 约束, inherit: true }
  - { name: dedupe_key,  type: string, since_minor: 1 }
```

## 5. 内置类型
每段 YAML 就是 `schema/builtin/types/<名称>.yaml` 的全部内容，文件名与 `name` 相同。全部 `major: 1`、`minor: 0`。

写法约定（来自原型类型库）：文本 → `string`；计数 → `integer`，其他数值 → `number`；枚举 → `string` + `enum`；`列表[{…}]` → `列表[object]` + 嵌套 `fields`；指针 → `string`，值为 `ws://` 引用；任意 → `任意`。

### 5.1 系统类型
`system: true`；`producer` 按 `C.04.01` §4；`category` 只有前 4 个写（与 `category_map.yaml` 一致），其余按默认 `gen`。

```yaml
name: 资源引用
major: 1
minor: 0
description: 指向一个模型、提示词、角色卡、列表或常量；不含密钥
system: true
producer: 资源
category: ref
fields:
  - { name: kind,    type: string, label: 种类, required: true, enum: [模型, 提示词, 角色卡, 列表, 常量] }
  - { name: ref,     type: 任意,   label: 引用, required: true }   # 模型引用对象、角色卡 名称@版本、列表、常量
  - { name: version, type: string, label: 版本 }                   # 冻结快照时解析出的具体版本
```

```yaml
name: 上下文包
major: 1
minor: 0
description: 上下文装配按配方产出的内容；Agent 的 context 端口只接这个类型
system: true
producer: 上下文装配
category: ctx
fields:
  - name: sections
    type: "列表[object]"
    label: 段
    required: true
    fields:
      - { name: name,    type: string,  label: 段名, required: true }
      - { name: content, type: string,  label: 内容, required: true }
      - { name: tokens,  type: integer, label: tokens, required: true }
      - { name: source,  type: string,  label: 来源 }               # 如 in.task.instruction、inherit
  - { name: tokens, type: integer, label: 总 tokens, required: true }
  - name: dropped
    type: "列表[object]"
    label: 被裁内容
    fields:
      - { name: section, type: string,  label: 段名, required: true }
      - { name: ref,     type: string,  label: 原文 }               # 值为 ws:// 引用
      - { name: mode,    type: string,  label: 方式, enum: [pointer, summarize, truncate] }
      - { name: saved,   type: integer, label: 省下tokens }
  - { name: inherit, type: object, label: 透传约束, required: true }   # 沿数据流收集的 inherit 字段（E.13.06）
  - { name: vars, type: object, label: 模板变量 }                 # 变量名 → 文字，由配方段的 var 提供（C.13.01-R6）
```

```yaml
name: 工具端点
major: 1
minor: 0
description: 工具节点的端点描述；连到 Agent 的 tools，由 Agent 决定是否调用
system: true
producer: 工具
category: tool
fields:
  - { name: tool,       type: string,  label: 工具, required: true }
  - { name: risk,       type: string,  label: 风险, required: true, enum: [L0, L1, L2, L3] }
  - { name: schema_ref, type: string,  label: 参数定义, required: true }
  - { name: rate,       type: integer, label: 每分钟上限 }
```

```yaml
name: 状态
major: 1
minor: 0
description: 账本节点读写的一个字段值
system: true
producer: 账本
category: state
fields:
  - { name: store,   type: string,  label: 账本, required: true }
  - { name: path,    type: string,  label: 路径, required: true }
  - { name: version, type: integer, label: 版本, required: true }
  - { name: value,   type: 任意,    label: 值 }
```

```yaml
name: 简报
major: 1
minor: 0
description: 子图摘要端口（role=summary）向上层报告进度；按 goal_id 只保留最新
system: true
producer: 子图端口
fields:
  - { name: goal_id,    type: string, label: 目标, required: true }
  - { name: status,     type: string, label: 状态, required: true, enum: [心跳, 进行中, 完成, 阻塞] }
  - { name: conclusion, type: string, label: 结论 }
  - name: criteria_check
    type: "列表[object]"
    label: 验收检查
    fields:
      - { name: criterion_id, type: string,  label: 标准, required: true }
      - { name: passed,       type: boolean, label: 通过 }
  - name: cost
    type: object
    label: 花费
    fields:
      - { name: tokens, type: integer, label: tokens }
      - { name: calls,  type: integer, label: 调用次数 }
      - { name: time,   type: string,  label: 用时 }                # ISO-8601 时长
```

```yaml
name: 升级
major: 1
minor: 0
description: 子图升级端口（role=escalation）向上层求助：本层解决不了的问题
system: true
producer: 子图端口
fields:
  - { name: kind,     type: string, label: 种类, required: true, enum: [格式错误, 单任务失败, 目标歧义, 标准冲突, 结构性无法达成, 预算不足, 需审批, 无进展] }
  - { name: severity, type: string, label: 严重程度, enum: [低, 中, 高] }
  - { name: question, type: string, label: 问题, required: true, max_chars: 300 }
  - { name: options,  type: "列表[string]", label: 选项 }
```

```yaml
name: 整数
major: 1
minor: 0
description: 一个整数；聚合算子 count 的输出
system: true
scalar: integer
```

### 5.2 业务类型
不写 `system`、`producer`、`category`。前 7 个照原型类型库的 1.0 版；后 3 个是聚合算子的输出（`C.04.03` §2）。

```yaml
name: 方案
major: 1
minor: 0
description: 智囊产出的一份方案
fields:
  - { name: understanding,   type: string, label: 理解, required: true, max_chars: 200 }
  - { name: core_approach,   type: string, label: 核心手段, required: true, max_chars: 200 }
  - { name: key_assumptions, type: "列表[string]", label: 关键假设, required: true }
  - name: steps
    type: "列表[object]"
    label: 步骤
    fields:
      - { name: desc,            type: string, label: 做什么 }
      - { name: expected_output, type: string, label: 预期产出 }
      - { name: tools,           type: "列表[string]", label: 工具 }
  - { name: avoids,     type: "列表[string]", label: 避开的方向 }   # 值为 ws:// 引用
  - { name: confidence, type: number, label: 置信度 }               # 0–1
```

```yaml
name: 簇标注
major: 1
minor: 0
description: 聚类员产出；聚合节点按 cluster 计算比例
fields:
  - { name: understanding_consistent, type: boolean, label: 理解一致, required: true }
  - name: labels
    type: "列表[object]"
    label: 标注
    required: true
    fields:
      - { name: plan_id, type: string, label: 方案, required: true }
      - { name: cluster, type: string, label: 簇, required: true }
      - { name: diff,    type: string, label: 差别 }
  - name: conflicts
    type: "列表[object]"
    label: 冲突
    fields:
      - { name: a,      type: string, label: 方案甲 }
      - { name: b,      type: string, label: 方案乙 }
      - { name: reason, type: string, label: 原因 }
```

```yaml
name: 任务卡
major: 1
minor: 0
description: 决策者分派给执行者的一项原子任务
fields:
  - { name: id,           type: string, label: 编号, required: true }
  - { name: instruction,  type: string, label: 任务, required: true, max_chars: 500 }
  - { name: purpose,      type: string, label: 目的, required: true }
  - { name: good_result,  type: string, label: 好结果, required: true }
  - { name: checklist,    type: "列表[string]", label: 检查项 }
  - { name: inputs,       type: "列表[任意]", label: 必要输入 }
  - { name: constraints,  type: "列表[string]", label: 约束, inherit: true }
  - { name: output_type,  type: string, label: 产出类型, required: true }   # TypeRef，如 执行结果@1
  - { name: from_cluster, type: string, label: 来自簇 }                     # 值为 ws:// 引用
  - { name: dedupe_key,   type: string, label: 去重键 }
  - { name: escalate_if,  type: "列表[string]", label: 何时上报 }
```

```yaml
name: 执行结果
major: 1
minor: 0
description: 执行者产出；"未找到"是合法结果
fields:
  - { name: task_id,    type: string, label: 任务, required: true }
  - { name: status,     type: string, label: 状态, required: true, enum: [完成, 部分, 未找到, 失败] }
  - { name: conclusion, type: string, label: 结论, required: true, max_chars: 300 }
  - { name: data,       type: 任意,   label: 数据 }
  - name: sources
    type: "列表[object]"
    label: 来源                                                      # status 为完成、部分时应有
    fields:
      - { name: ptr,     type: string, label: 原文 }                 # 值为 ws:// 引用
      - { name: url,     type: string, label: 网址 }
      - { name: excerpt, type: string, label: 摘录 }
      - { name: time,    type: string, label: 时间 }                 # ISO-8601
  - { name: confidence, type: number, label: 置信度 }                # 0–1
```

```yaml
name: 判定
major: 1
minor: 0
description: 验收者产出
fields:
  - { name: achieved, type: boolean, label: 达成, required: true }
  - name: items
    type: "列表[object]"
    label: 逐条判定
    required: true
    fields:
      - { name: criterion_id, type: string, label: 标准, required: true }
      - { name: result,       type: string, label: 结果 }
      - { name: evidence,     type: string, label: 证据 }
  - name: spot_checks
    type: "列表[object]"
    label: 抽检
    fields:
      - { name: result_id,  type: string,  label: 结果 }
      - { name: consistent, type: boolean, label: 一致 }
  - { name: gap_type, type: string, label: 差距类型, required: true, enum: [无, 可补救, 结构性] }
```

```yaml
name: 目标
major: 1
minor: 0
description: 主脑设定的目标，构成目标树
fields:
  - { name: id,     type: string, label: 编号, required: true }
  - { name: intent, type: string, label: 意图, required: true, readonly_except: ["tag:主脑"] }
  - { name: parent, type: string, label: 上级目标 }                 # 值为 ws:// 引用
  - { name: constraints, type: object, label: 约束, required: true, inherit: true }   # 币种、地区、时间范围等
  - name: criteria
    type: "列表[object]"
    label: 验收标准
    required: true
    readonly_except: ["tag:主脑"]
    fields:
      - { name: id,     type: string,  label: 编号, required: true }
      - { name: desc,   type: string,  label: 说明, required: true }
      - { name: method, type: string,  label: 判定方式, required: true, enum: [规则, 抽检, 评审] }
      - { name: rule,   type: string,  label: 规则 }                # method 为规则时的表达式
      - { name: must,   type: boolean, label: 必须满足 }
  - name: budget
    type: object
    label: 预算
    fields:
      - { name: tokens, type: integer, label: tokens }
      - { name: time,   type: string,  label: 时长 }                # ISO-8601 时长
      - { name: calls,  type: integer, label: 调用次数 }
  - { name: priority, type: string, label: 优先级, enum: [P0, P1, P2] }
```

```yaml
name: 差距报告
major: 1
minor: 0
description: 循环里唯一带到下一轮的内容
fields:
  - { name: goal,  type: string,  label: 目标, required: true }       # 值为 ws:// 引用
  - { name: round, type: integer, label: 轮次 }
  - name: gaps
    type: "列表[object]"
    label: 差距
    required: true
    fields:
      - { name: criterion_id, type: string, label: 标准, required: true }
      - { name: missing,      type: string, label: 缺什么 }
      - { name: how_far,      type: string, label: 差多少 }
  - name: tried
    type: "列表[object]"
    label: 已试方向
    required: true
    fields:
      - { name: direction,  type: string, label: 方向 }
      - { name: where,      type: string, label: 在哪试的 }
      - { name: why_failed, type: string, label: 失败原因 }
  - { name: history_digest, type: string, label: 历史摘要, max_chars: 300 }
  - { name: gap_type,       type: string, label: 差距类型, enum: [可补救, 结构性] }
```

```yaml
name: 聚合结果
major: 1
minor: 0
description: 聚合算子 group、group_ratio 的输出
fields:
  - name: groups
    type: "列表[object]"
    label: 分组
    required: true
    fields:
      - { name: label,   type: string, label: 组名, required: true }
      - { name: ratio,   type: number, label: 比例, required: true }   # 0–1
      - { name: level,   type: string, label: 分级 }                   # 按 levels 参数，如 共识
      - { name: members, type: "列表[任意]", label: 成员 }
```

```yaml
name: 统计
major: 1
minor: 0
description: 聚合算子 stats 的输出
fields:
  - { name: count, type: integer, label: 个数, required: true }
  - { name: sum,   type: number,  label: 合计 }
  - { name: mean,  type: number,  label: 平均 }
  - { name: min,   type: number,  label: 最小 }
  - { name: max,   type: number,  label: 最大 }
```

```yaml
name: 分歧报告
major: 1
minor: 0
description: 聚合算子 divergence 的输出
fields:
  - { name: score, type: number, label: 分歧度, required: true }     # 0–1，0 = 完全一致
  - name: clusters
    type: "列表[object]"
    label: 簇
    required: true
    fields:
      - { name: label,   type: string, label: 簇名, required: true }
      - { name: ratio,   type: number, label: 比例, required: true }   # 0–1
      - { name: members, type: "列表[任意]", label: 成员 }
```

## 6. 验收标准
1. 17 个内置类型（10 个业务、7 个系统）通过校验，并能生成 JSON Schema。
2. 次版本里新增必填字段时加载失败。
3. `aggregate_ops.yaml` 里出现的具体类型都有定义。

### 实施卡
- 要建 / 要改的文件：`schema/typedef.schema.json`、`schema/builtin/types/资源引用.yaml`、`schema/builtin/types/上下文包.yaml`、`schema/builtin/types/工具端点.yaml`、`schema/builtin/types/状态.yaml`、`schema/builtin/types/简报.yaml`、`schema/builtin/types/升级.yaml`、`schema/builtin/types/整数.yaml`、`schema/builtin/types/方案.yaml`、`schema/builtin/types/簇标注.yaml`、`schema/builtin/types/任务卡.yaml`、`schema/builtin/types/执行结果.yaml`、`schema/builtin/types/判定.yaml`、`schema/builtin/types/目标.yaml`、`schema/builtin/types/差距报告.yaml`、`schema/builtin/types/聚合结果.yaml`、`schema/builtin/types/统计.yaml`、`schema/builtin/types/分歧报告.yaml`、`tools/schemacheck/typedef_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C1303-T1 内置类型校验`：`schema/builtin/types/` 下每个文件都通过 `typedef.schema.json`；文件名等于 `name`；`major` 为 1、`minor` 为 0
  - `C1303-T2 名单`：目录里恰好是 §5 的 17 个文件；`system: true` 的恰好是 §5.1 的 7 个，`producer` 与 `C.04.01` §4 一致，`整数` 是 `scalar: integer` 且没有 `producer`（表在测试里）；写了 `category` 的恰好是 `资源引用`、`上下文包`、`工具端点`、`状态`，值与 `category_map.yaml` 推出的类别相同；业务类型没有 `system`、`producer`、`category`
  - `C1303-T3 字段写法`：每个 `fields[].type` 是 `string`、`integer`、`number`、`boolean`、`object`、`任意`、符合 `TypeRef` 的命名类型或 `列表[…]`；带 `fields` 的字段 `type` 只能是 `object` 或 `列表[object]`；写了 `enum` 的字段 `type` 是 `string`；同一层字段名不重复
  - `C1303-T4 引用闭合`：`aggregate_ops.yaml` 的值里出现的具体类型（去掉 `列表[…]`，不含 `$T`）都在 `schema/builtin/types/` 里有定义；字段 `type` 里出现的命名类型也都有定义；`资源引用` 的 `kind` 枚举与资源节点（`schema/builtin/nodedefs/资源.yaml`）参数 `kind` 的枚举相同（`P.09` K233）
  - `C1303-T5 schema 反例`：测试里内联：同时写 `scalar` 和 `fields` 失败；两个都不写失败；字段名 `Plan` 失败；`name` 为 `方案@1` 失败；字段带未定义的属性 `readonly` 失败
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 每个内置类型生成 JSON Schema（§6 验收 1 后半、R3）：`E0301-T8`（`E.03.01`）
  - 次版本新增必填字段时加载失败（§6 验收 2、R1）：`E0301-T8`（`E.03.01`）
  - 扩展包不能声明系统类型、不能覆盖内置类型（R2）：`E0301-T2`（`E.03.01`）
  - `inherit` 字段在下游 Agent 上下文里一定出现：`E1306-T1`（`E.13.06`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 加 `system`、`producer`、`scalar`，`Field` 可以嵌套 `fields`；新增 R4 内置类型清单（含 `整数@1` 和聚合输出的 3 个业务类型）；本叶子移到第 3 片 | `P.09` K205 |
| 2026-11-23 | 新增 §5 内置类型：17 个类型的完整声明；验收标准移到 §6，改为 17 个类型并加"聚合算子输出类型都有定义"；§4 示例里带方括号的类型加引号；实施卡按 `G.02.06-R24` 重写 | `P.09` K217 |
| 2026-11-23 | `上下文包@1` 加 `vars`；label 里的"词元数"改为 tokens；在 `E.03.01` 跑的用例写明 `E0301-T8` | `P.09` K222 |
| 2026-11-23 | 状态改为"已审"：第 3 片（`m0-contract-2`）开工前复查完成（用户授权设计方自主裁决，2026-11-23 15:00） | `G.02.01-R2`；`P.09` K210 |
| 2026-11-23 | 状态改为"冻结"：第 3 片（`m0-contract-2`）squash 合并进代码仓库 `main`，提交 `2fd3c25a165e36565f95fa9b16fc3d22a0569ec6`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 14 条全部符合，两条"有疑问"由设计方裁决（`P.09` K226）、返工并复核；按 `G.08-R3` 由验证者合并 |
| 2026-11-23 | 冻结后修改，状态改回"已审"：`资源引用@1` 的 `kind` 加"角色卡"（次版本号不变：只增枚举值，`C.01-R17`、R18） | `P.09` K233（`G.02.06-R21`） |
| 2026-11-23 | 状态改为"冻结"：修复片（`m0-fix-entry`，`P.09` K233）squash 合并进代码仓库 `main`，提交 `c2574ee2723dde9a4c704435c2160a18af255aed`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 4 条全部符合；按 `G.08-R3` 由验证者合并 |
