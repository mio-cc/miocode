# C.03.01 NodeDef 结构

| 项 | 内容 |
|---|---|
| 编号 | C.03.01 |
| 类型 | 实施 |
| 上级 | C.03 节点定义 NodeDef |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义 NodeDef 的结构，并列出 13 个原子节点的端口签名（这是前后端、画布、校验器都要用的数据）。

## 2. 不做什么
- 参数的完整清单、默认值、取值范围写在各执行器文档里（`E.14.*`），并以 `schema/builtin/nodedefs/*.yaml` 为准。本文只列端口。
- 不定义执行行为。

## 3. 继承的上级约束
INV-01、INV-02、`C.03-R1`–`R3`。

## 4. 定义
```json
{
  "$id": "https://anydoor.local/schema/nodedef.schema.json",
  "x-version": "1.0",
  "type": "object",
  "required": ["name", "version", "kind", "category", "impl", "ports", "params"],
  "additionalProperties": false,
  "properties": {
    "name":        { "type": "string", "minLength": 1, "maxLength": 60 },
    "version":     { "type": "string", "pattern": "^\\d+\\.\\d+$" },
    "kind":        { "enum": ["atomic", "extension"] },
    "category":    { "enum": ["资源", "智能体", "状态", "工具", "拓扑", "聚合", "控制", "人工", "边界", "扩展"] },
    "description": { "type": "string", "maxLength": 200 },
    "icon":        { "type": "string", "description": "图标名，取自 U.08 图标表；扩展节点缺省为 扩展" },
    "impl":        { "$ref": "#/$defs/Impl" },
    "ports": {
      "type": "object",
      "required": ["inputs", "outputs"],
      "additionalProperties": false,
      "properties": {
        "inputs":  { "type": "object", "additionalProperties": { "$ref": "#/$defs/PortDef" }, "propertyNames": { "pattern": "^[a-z_][a-z0-9_]*$" } },
        "outputs": { "type": "object", "additionalProperties": { "$ref": "#/$defs/PortDef" }, "propertyNames": { "pattern": "^[a-z_][a-z0-9_]*$" } }
      }
    },
    "params":      { "type": "object", "additionalProperties": { "$ref": "#/$defs/ParamDef" }, "propertyNames": { "pattern": "^[a-z_][a-z0-9_]*$" } },
    "type_vars":   { "type": "object", "additionalProperties": { "type": "string" },
                     "description": "类型变量的来源，如 {\"T\": \"param:output_schema\"}，见 C.04.03" },
    "container":   { "enum": ["none", "required", "one_of"], "default": "none", "description": "与 container_rules.yaml 一致，见 C.02.04" },
    "kernel_rules":{ "type": "array", "items": { "type": "string" }, "description": "内核强制规则的编号，只用于展示，如 INV-07" },
    "examples":    { "type": "array", "items": { "type": "string" } }
  },
  "$defs": {
    "PortDef": {
      "type": "object",
      "required": ["type"],
      "additionalProperties": false,
      "properties": {
        "type":     { "$ref": "types.schema.json#/$defs/TypeRef" },
        "category": { "$ref": "types.schema.json#/$defs/Category", "description": "显示类别；缺省由 type 推出（C.04.01）" },
        "label":    { "type": "string", "maxLength": 20 },
        "required": { "type": "boolean", "default": false },
        "multi":    { "type": "boolean", "default": false, "description": "允许多条连线，见 C.04.04" },
        "dynamic":  { "type": "boolean", "default": false, "description": "动态插口 in[0]、in[1]…" },
        "stream":   { "type": "boolean", "default": false, "description": "支持流式片段，见 E.16" },
        "lock":     { "enum": ["none", "kernel"], "default": "none" }
      }
    },
    "Impl": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "enum": ["builtin", "prompt", "http", "mcp", "subgraph"] }
      },
      "description": "builtin：Go 执行器（原子节点和编译进程序的编程式扩展节点）；其余四种见 C.03.04"
    }
  }
}
```
`ParamDef` 的定义见 `C.03.02`。

## 5. 规则
- **C.03.01-R1** `kind=atomic` 只能用于 13 个原子节点，并且只能出现在 `schema/builtin/nodedefs/`；扩展包里出现 `atomic` 时拒绝安装。
- **C.03.01-R2** 扩展节点的 `category` 只能是 `扩展`，或 13 个原子节点用过的分类之一（让扩展节点能放进节点库的同一分组）。
- **C.03.01-R3** 同一个 NodeDef 里，输入端口名、输出端口名、参数名三者之间**不能重名**（端口提升后参数名会变成输入端口名，`C.02.03-R6`）。
- **C.03.01-R4** 输入端口 `ctx`、`tool`、`ref` 类型必须严格匹配（`C.04.02`），NodeDef 不能放宽。
- **C.03.01-R5** 每个 NodeDef 最多 8 个输入端口、8 个输出端口（动态插口不计）。超过说明这个节点应该拆。

## 6. 13 个原子节点的端口签名
> 端口名、类型、类别是契约，前后端都按这张表实现。括号里 `多` = multi，`必` = required。

| 节点 | 分类 | 输入端口 | 输出端口 | 类型变量 | 容器 |
|---|---|---|---|---|---|
| 资源 | 资源 | — | `ref`: 资源引用@1 | — | 否 |
| Agent | 智能体 | `context`: 上下文包@1（必）· `model`: 资源引用@1（必）· `prompt`: 资源引用@1 · `tools`: 工具端点@1（多） | `result`: $T | T ← `param:output_schema` | 否 |
| 上下文装配 | 状态 | `in`: 任意（多）· `model`: 资源引用@1 | `context`: 上下文包@1 · `dropped`: 列表[任意] | — | 否 |
| 工具 | 工具 | `request`: 任意 | `endpoint`: 工具端点@1 · `result`: $T | T ← `param:result_type`（缺省 任意） | 否 |
| 扇出 | 拓扑 | `items`: 列表[$T] · `shared`: 任意（多） | `results`: 列表[$U] | T ← `input:items.elem`，U ← `body:exit` | **必须** |
| 汇合 | 拓扑 | `in`: 任意（多、动态） | `collected`: 列表[任意] | — | 否 |
| 聚合 | 聚合 | `items`: 列表[$T]（必） | `result`: $U | U ← `op:<算子>(T)` | 否 |
| 分支 | 控制 | `value`: $T（必） | `yes`: $T，类别 判定 · `no`: $T，类别 判定 | T ← `input:value` | 否 |
| 循环 | 控制 | `init`: $T | `final`: $T · `summary`: 简报@1 | T ← `input:init` | **必须** |
| 账本 | 状态 | `value`: 任意 | `value`: 状态@1 | — | 否 |
| 人工 | 人工 | `request`: $T（必） | `approved`: $T，类别 判定 · `rejected`: $T，类别 判定 | T ← `input:request` | 否 |
| 子图端口 | 边界 | `in`: $T | `out`: $T | T ← `input:in` | 否 |
| 子图引用 | 边界 | 由子图的 entry 端口节点决定 | 由子图的 exit / summary / escalation 端口节点决定 | 由子图推断 | **二选一** |

说明：
- 分支和人工的出口**传递输入的值**（被激活的那个出口带值，另一个不激活），显示类别为"判定"（`C.04.01`）。这修正了 demo 里"出口类型为判定、不带值"的写法（`P.09` K15）。
- 子图端口在父层不可见；它在子图内部的端口签名就是上表这一行。
- `简报@1`、`资源引用@1`、`上下文包@1`、`工具端点@1`、`状态@1` 是系统类型，定义在 `C.04.01`。

## 7. 验收标准
1. `schema/builtin/nodedefs/` 下 13 个 YAML 全部通过 `nodedef.schema.json` 校验，端口与 §6 表格一致（脚本比对）。
2. 扩展包里 `kind: atomic` 的 NodeDef 安装失败，错误码 `extension_invalid`。
3. 参数名和端口名重复的 NodeDef 注册失败。

### 实施卡
- 要建的文件：`schema/nodedef.schema.json`；`schema/builtin/nodedefs/{资源,Agent,上下文装配,工具,扇出,汇合,聚合,分支,循环,账本,人工,子图端口,子图引用}.yaml`（端口按 §6；参数按对应 `E.14.*` 文档，参数文档未写完前先放 demo v0.4 `21_defs.js` 里的参数，状态标"草稿"）；`tools/gen/check_nodedefs.go`（比对 §6 表格的检查脚本，表格以 `schema/builtin/atomic_ports.yaml` 的形式存一份机器可读版）。
- 测试用例：`C0301-T1`（13 个文件校验）、`C0301-T2`（端口签名比对）、`C0301-T3`（atomic 拒绝）、`C0301-T4`（重名拒绝）。
- 禁止事项：`G.02.05-R9`（不得在代码里按类型名写分支，用 NodeDef 数据驱动）。
