# C.09 授权书 Mandate

| 项 | 内容 |
|---|---|
| 编号 | C.09 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引07 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义授权书 Mandate 的格式、挂载方式、授权动作名，以及五档的默认判定表。授权判定的算法在 `E.06.02`；授权规则的产品含义在 `S.04`。

## 2. 两个独立维度（INV-15）
| 维度 | 回答的问题 | 取值 |
|---|---|---|
| **档位 Level** | 模型能改多少 | 0 只读 · 1 建议 · 2 部分 · 3 高度 · 4 完全 |
| **风险等级 Risk** | 工具会碰到什么 | L0 只读 · L1 本地写 · L2 对外、可撤销 · L3 对外、不可撤销（发邮件、付款、删除外部数据） |

## 3. 授权书（`mandate.schema.json`）
```json
"Mandate": {
  "type": "object",
  "required": ["id", "name", "level", "grantee", "expires", "created_by", "created_at"],
  "additionalProperties": false,
  "properties": {
    "id":         { "$ref": "common.schema.json#/$defs/Ulid" },
    "name":       { "type": "string", "maxLength": 40, "description": "如 谨慎协作" },
    "level":      { "type": "integer", "minimum": 0, "maximum": 4 },
    "grantee":    { "type": "string", "pattern": "^(model:\\*|model:[^\\s]+|tag:[^\\s]+|external:\\*|external:[^\\s]+)$",
                    "description": "授予对象：model:* 所有模型实例；tag:编排者 带这个标签的实例；external:* 外部调用" },
    "overrides":  { "$ref": "#/$defs/Overrides", "description": "只在档位 2 生效" },
    "except":     { "type": "array", "items": { "$ref": "#/$defs/Action" }, "description": "档位 3、4：这些动作改为需要审核" },
    "deny":       { "type": "array", "items": { "$ref": "#/$defs/Action" }, "description": "任何档位：这些动作直接拒绝" },
    "expires":    { "$ref": "#/$defs/Expiry" },
    "taint":      { "enum": ["ask", "allow"], "default": "ask", "description": "被污染的动作怎么处理（INV-16）" },
    "delegable":  { "enum": ["none", "narrower", "same"], "default": "narrower", "description": "编排者生成子编排者时能否下放（E.06.02）" },
    "l3_skip_human": { "type": "boolean", "default": false, "description": "只有用户能设为 true：L3 工具上游可以不接人工节点" },
    "branch":     { "enum": ["draft", "main"], "default": "draft", "description": "模型的修改写到哪：草稿分支或直接写 main（只有档位 4 能选 main）" },
    "created_by": { "$ref": "common.schema.json#/$defs/Actor", "description": "必须是 user" },
    "created_at": { "$ref": "common.schema.json#/$defs/Timestamp" },
    "revoked_at": { "$ref": "common.schema.json#/$defs/Timestamp" }
  }
},
"Overrides": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "scope":         { "type": "array", "items": { "type": "string" }, "description": "允许修改的范围：容器节点 ID 或 root；空 = 挂载点以下全部" },
    "ops":           { "type": "object", "additionalProperties": { "enum": ["allow", "propose", "deny"] }, "propertyNames": { "$ref": "#/$defs/Action" } },
    "tools_max_risk":{ "type": "integer", "minimum": 0, "maximum": 3, "default": 0 },
    "tools_allow":   { "type": "array", "items": { "type": "string" } },
    "models":        { "type": "array", "items": { "type": "string" }, "description": "允许使用的模型；空 = 不限" },
    "budget":        { "$ref": "#/$defs/Budget" },
    "max_nodes":     { "type": "integer", "minimum": 1, "description": "单个 GraphPatch 最多新增几个节点" },
    "max_depth":     { "type": "integer", "minimum": 1, "maximum": 8 },
    "allow_spawn":   { "type": "boolean", "default": false }
  }
},
"Budget": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "tokens":      { "type": "integer", "minimum": 0 },
    "cost_micros": { "type": "integer", "minimum": 0 },
    "time_ms":     { "type": "integer", "minimum": 0 },
    "calls":       { "type": "integer", "minimum": 0 }
  }
},
"Expiry": {
  "type": "object",
  "required": ["kind"],
  "additionalProperties": false,
  "properties": {
    "kind":   { "enum": ["run", "session", "forever", "until"] },
    "until":  { "$ref": "common.schema.json#/$defs/Timestamp" },
    "run_id": { "$ref": "common.schema.json#/$defs/Ulid" }
  }
},
"MandateMount": {
  "type": "object",
  "required": ["anchor", "mandate_id"],
  "additionalProperties": false,
  "properties": {
    "anchor":     { "type": "string", "pattern": "^(session|graph|node:[0-9A-HJKMNP-TV-Z]{26})$", "description": "session 只出现在会话文档里" },
    "mandate_id": { "$ref": "common.schema.json#/$defs/Ulid" },
    "priority":   { "type": "integer", "default": 0 }
  }
}
```
相对旧文档（`引07`）的改动：`Budget.CostCN`（浮点人民币）改为 `cost_micros`；`time`（Go 时长）改为 `time_ms`；新增 `branch`（原来在 `scope.branch`，表述不清）；挂载点去掉 `path:`（节点 ID 全树唯一，容器节点 ID 就代表它的子图）。

## 4. 授权主体与动作
### 4.1 主体
授权判定的主体由 Actor 推出，不再单独定义第五种主体（`P.09` K3）：
| Actor | 主体 | 规则 |
|---|---|---|
| `user` | 所有者 | 不受授权书约束，但受急停约束（急停期间只能只读和解除急停） |
| `model` | 模型实例；标签取节点实例的 `tags`；生成它的上级编排者是它的 `parent` | 有效授权 = 所在位置解析出的授权书 ∩ 上级下放的授权 |
| `runtime` | 内核 | 非模型节点的直接工具调用（例如工具节点没有接 Agent 时），按**该节点所在位置对模型的授权**判定 |
| `external` | 外部调用 | 没有授权书时为 0 档 |

### 4.2 动作名（`Action` 枚举）
| 组 | 动作 |
|---|---|
| 读 | `graph.read`、`run.read`、`trace.read` |
| 图结构（`op.` + Op 的 kind） | `op.add_node`、`op.remove_nodes`、`op.connect`、`op.disconnect`、`op.set_param`、`op.promote_param`、`op.demote_param`、`op.set_label`、`op.set_tags`、`op.group`、`op.ungroup`、`op.set_subgraph_ref`、`op.set_graph_title`、`op.set_graph_meta`、`op.create_branch`、`op.merge_branch`、`op.revert_op`、`op.revert_to` |
| 视图 | `op.view`（覆盖 `move_nodes`、`set_node_ui`、三个便签 Op，`C.02.05-R4`） |
| 只有用户能做 | `op.set_lock`、`op.migrate`（模型、外部一律拒绝，不走档位表） |
| 资源 | `res.edit_rolecard`、`res.edit_recipe`、`res.switch_model`、`res.define_type` |
| 授权 | `authz.set_mandate`、`authz.request_elevation` |
| 运行 | `run.start`、`run.pause`、`run.cancel` |
| 编排 | `orch.spawn`、`orch.self_modify` |
| 工具 | `tool.L0`、`tool.L1`、`tool.L2`、`tool.L3`（判定时 target 带具体工具名，便于"只允许检索"这样的规则） |
| 急停 | `estop.trigger`、`estop.release` |

`apply_patch` 和 `import_apply` 不是单独的动作：按子 Op 逐条判定（`C.08-R4`）。

## 5. 默认判定表
判定结果只有四种：`allow` 允许 · `propose` 变成提议 · `ask` 需要审核（图结构动作 → 提议；运行时动作 → 审批）· `deny` 拒绝。

| 动作 \ 档位 | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| `*.read` | allow | allow | allow | allow | allow |
| `op.view` | deny | allow | allow | allow | allow |
| `op.*`（结构修改，下面单列的除外） | deny | propose | 看 `overrides.ops`，缺省 allow（限 `overrides.scope` 内） | allow | allow |
| `op.remove_nodes`、`op.ungroup`、`op.revert_to` | deny | propose | ask | allow | allow |
| `res.edit_rolecard`、`res.edit_recipe`、`res.define_type` | deny | propose | ask | allow | allow |
| `res.switch_model` | deny | propose | 在 `overrides.models` 内 allow，否则 ask | allow | allow |
| `authz.set_mandate` | deny | deny | deny | ask | allow¹ |
| `authz.request_elevation` | deny | allow | allow | allow | allow |
| `run.start`、`run.pause` | deny | ask | allow | allow | allow |
| `run.cancel` | deny | allow | allow | allow | allow |
| `orch.spawn` | deny | deny | 看 `overrides.allow_spawn` | allow | allow |
| `orch.self_modify` | deny | deny | deny | ask | allow |
| `tool.L0` | deny | allow² | allow | allow | allow |
| `tool.L1` | deny | ask | ≤ `tools_max_risk` 时 allow，否则 ask | allow | allow |
| `tool.L2` | deny | ask | ≤ `tools_max_risk` 时 allow，否则 ask | allow | allow |
| `tool.L3` | deny | ask | ask | ask | allow³ |
| `estop.trigger` | allow | allow | allow | allow | allow |
| `estop.release` | deny | deny | deny | deny | **deny**⁴ |

1. 档位 4 可以改授权书，但**不能修改给自己授权的那一份，也不能新建比自己更宽的**，只能新建更窄的。
2. 档位 1 允许只读工具，让模型能"看清楚再提议"。
3. 档位 4 下 L3 工具判定为 allow，但图校验仍要求 L3 工具上游有人工节点（诊断 V13），除非用户在授权书里设了 `l3_skip_human: true`。
4. 解除急停是唯一硬编码的拒绝，不受任何授权书影响，只有 `actor.kind=user` 能做（INV-10）。

**叠加规则**（判定顺序，实现在 `E.06.02`）：`deny` 列表 → 急停 → 档位表 → `overrides`（档位 2）/ `except`（档位 3、4）→ 污染标记（`taint=ask` 时把 allow 改为 ask）→ 预算。

## 6. 挂载与继承
- 挂载点从具体到宽泛：`node:<节点>` → 它所在的各层容器节点（由内到外）→ `graph` → `session`。
- **C.09-R1** **就近覆盖，不叠加**：从最具体的挂载点开始找，找到第一份授予对象匹配、没过期、没撤销的授权书就停。同一挂载点有多份时按 `priority` 从高到低。理由：用户在画布上看到"这个节点是几档"，必须只对应一份授权书。
- **C.09-R2** 都找不到时用默认：模型 1 档、外部 0 档。
- **C.09-R3** 授权书和挂载的修改走 Op `set_mandate`（图上的挂载）或会话接口（会话上的挂载）；只能由用户或满足脚注 1 的模型修改。

## 7. 验收标准
1. 判定表做成数据 `schema/builtin/authz_matrix.yaml`，前端"有效档位"面板和后端判定读同一份；表里每一格都有测试。
2. 模型请求 `estop.release`：任何授权书下都返回 deny。
3. 档位 4 的模型尝试修改给自己授权的授权书：deny。

### 实施卡
- 要建的文件：`schema/mandate.schema.json`；`schema/builtin/authz_matrix.yaml`（§5 表格）。
- 测试用例：`C09-T1`（全表）、`C09-T2`、`C09-T3`（在 `E.06` 跑）。
