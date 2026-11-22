# C.02.03 Edge 连线

| 项 | 内容 |
|---|---|
| 编号 | C.02.03 |
| 类型 | 实施 |
| 上级 | C.02 图文档 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义连线 `Edge` 和端口引用 `PortRef`。

## 2. 不做什么
- 不存类型检查结果。连线能不能连、要不要自动展开或迁移，都由校验器实时计算（`C.04.02`、`E.03.02`），不写进文档。

## 3. 继承的上级约束
`C.02-R2`、`C.02-R3`。

## 4. 定义
```json
"PortRef": {
  "type": "object",
  "required": ["node", "port"],
  "additionalProperties": false,
  "properties": {
    "node": { "$ref": "common.schema.json#/$defs/Ulid" },
    "port": { "type": "string", "pattern": "^[a-z_][a-z0-9_]*(\\[\\d{1,3}\\])?$",
              "description": "动态插口写作 in[0]、in[1]" }
  }
},
"Edge": {
  "type": "object",
  "required": ["id", "from", "to"],
  "additionalProperties": false,
  "properties": {
    "id":     { "$ref": "common.schema.json#/$defs/Ulid" },
    "from":   { "$ref": "#/$defs/PortRef", "description": "输出端口" },
    "to":     { "$ref": "#/$defs/PortRef", "description": "输入端口" },
    "label":  { "type": "string", "maxLength": 40 },
    "origin": { "$ref": "#/$defs/Origin" }
  }
}
```
`PortRef` 也定义在 `common.schema.json`（事件里也要用）；`graph.schema.json` 里只做引用。

## 5. 规则
| 编号 | 规则 | 违反时的诊断码（`C.11`） |
|---|---|---|
| C.02.03-R1 | `from` 必须是输出端口，`to` 必须是输入端口 | V05 |
| C.02.03-R2 | 两端节点在同一个子图里 | V05 |
| C.02.03-R3 | 非多连（`multi: false`）的输入端口最多一条连线 | V07 |
| C.02.03-R4 | 不允许完全相同的两条连线（同 from、同 to） | V07 |
| C.02.03-R5 | 动态插口编号从 0 连续；删除中间的连线后，剩余插口不重新编号（避免改动其他连线），保存时也不压缩 | — |
| C.02.03-R6 | 端口名 = NodeDef 端口名，或被提升参数的参数名（`C.03.01-R4` 保证二者不重名） | V05 |

## 6. 验收标准
1. `port` 为 `Result`（大写）或 `in[1000]` 时校验失败。
2. 跨子图的连线在图检查时报 V05。

### 实施卡
- 要改的文件：`schema/common.schema.json`（`PortRef`）、`schema/graph.schema.json`（`Edge`）。
- 测试用例：`C0203-T1`（端口名格式）、`C0203-T2`（跨子图 V05，属于 `E.03.03` 的测试，这里只提供示例文件 `invalid/edge_cross_scope.json`）。
