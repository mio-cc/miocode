# C.13.01 配方 recipe

| 项 | 内容 |
|---|---|
| 编号 | C.13.01 |
| 类型 | 实施 |
| 上级 | C.13 内置资产格式 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引06 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义配方的格式：上下文装配节点按配方决定 Agent 能看到什么、按什么顺序、各占多少预算、超出时怎么处理。

## 2. 定义
```json
{
  "$id": "https://harness.local/schema/recipe.schema.json",
  "x-version": "1.0",
  "type": "object",
  "required": ["name", "version", "sections", "budget", "on_overflow"],
  "additionalProperties": false,
  "properties": {
    "name":     { "type": "string", "maxLength": 40, "description": "如 执行者配方" },
    "version":  { "type": "integer", "minimum": 1, "description": "引用写作 执行者配方@1" },
    "description": { "type": "string" },
    "sections": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/Section" } },
    "exclude":  { "type": "array", "items": { "type": "string", "pattern": "^(type|path):.+$" },
                  "description": "排除的内容：type:方案（按类型）、path:*.reasoning（按字段路径）" },
    "budget":   { "type": "object", "required": ["ratio"], "additionalProperties": false,
                  "properties": { "ratio": { "type": "number", "exclusiveMinimum": 0, "maximum": 1 }, "max_ratio": { "type": "number", "maximum": 1 } } },
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
        "format":    { "enum": ["markdown", "yaml", "bullets"], "default": "markdown" }
      }
    }
  }
}
```

## 3. 规则
- **C.13.01-R1** `from` 的根只能是 `in`（上下文装配节点的输入端口）；字段路径对应上游数据类型的字段。旧文档的 `in_task`、`in_goal` 写法改为 `in.task`、`in.goal`（端口统一叫 `in`，多连时按 `in[0]`、`in[1]`）。
- **C.13.01-R2** 数据类型里标记了 `inherit` 的字段（`C.13.03`）一定会被带上，配方的 `exclude` 对它无效（`E.13.06`）。
- **C.13.01-R3** 预算 `ratio` 是相对 Agent 所用模型窗口大小的比例；上下文装配节点的 `budget` 参数会覆盖配方的 `ratio`，但不能超过 `max_ratio`。

## 4. 示例
```yaml
name: 执行者配方
version: 1
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

## 5. 验收标准
1. 内置 6 个配方（主脑、智囊、聚类员、决策者、执行者、验收者）都通过校验。
2. `transform: top_k(x)` 校验失败。

### 实施卡
- 要建的文件：`schema/recipe.schema.json`；`schema/builtin/recipes/*.yaml`（6 个，内容来自 `引06` §3 和闭环模板）。
- 测试用例：`C1301-T1`、`C1301-T2`。
