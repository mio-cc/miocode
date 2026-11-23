# C.02.03 Edge 连线

| 项 | 内容 |
|---|---|
| 编号 | C.02.03 |
| 类型 | 实施 |
| 上级 | C.02 图文档 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引02 |
| 最后修改 | 2026-11-23 |

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
`PortRef` 只定义在 `common.schema.json`（事件里也要用，`C.01-R3`；由 `C.02.01` 实施时加入），`graph.schema.json` 里只做引用。

## 5. 规则
| 编号 | 规则 | 违反时的诊断码（`C.11`） |
|---|---|---|
| C.02.03-R1 | `from` 必须是输出端口，`to` 必须是输入端口 | V05 |
| C.02.03-R2 | 两端节点在同一个子图里 | V05 |
| C.02.03-R3 | 非多连（`multi: false`）的输入端口最多一条连线 | V07 |
| C.02.03-R4 | 不允许完全相同的两条连线（同 from、同 to） | V07 |
| C.02.03-R5 | 动态插口编号从 0 连续；删除中间的连线后，剩余插口不重新编号（避免改动其他连线），保存时也不压缩 | — |
| C.02.03-R6 | 端口名 = NodeDef 端口名，或被提升参数的参数名（`C.03.01-R3` 保证二者不重名） | V05 |

## 6. 验收标准
1. `port` 为 `Result`（大写）或 `in[1000]` 时校验失败。
2. 跨子图的连线在图检查时报 V05。

### 实施卡
- 要建 / 要改的文件：`schema/common.schema.json`、`schema/graph.schema.json`、`schema/examples/manifest.yaml`、`schema/examples/invalid/edge_port_uppercase.json`、`schema/examples/invalid/edge_port_index_1000.json`、`schema/examples/semantic/edge_cross_scope.json`、`tools/schemacheck/edge_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0203-T1 端口名`：`invalid/edge_port_uppercase.json`（`Result`）、`invalid/edge_port_index_1000.json`（`in[1000]`）在 `port` 失败；`out`、`in[0]`、`in[999]` 通过（测试里内联）
  - `C0203-T2 跨子图示例`：`semantic/edge_cross_scope.json` 通过 schema，清单里写 `diag: V05`
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 跨子图的连线报 V05（§6 验收 2）：`E.03.03` 的 V05 正反例读 `semantic/edge_cross_scope.json`
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `PortRef` 只在 `common.schema.json` 定义；实施卡改为机器可读写法，跨子图示例放 `semantic/` | `P.09` K201、K206 |
| 2026-11-23 | 状态改为"冻结"：第 2 片（契约片 `m0-contract`）squash 合并进代码仓库 `main`，提交 `34b28fbd47004406cbf3c643947c445bd223be65`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 12 条，`C.01` 一条不符合（示例清单路径在 Windows 上可跳出目录）已修复并复核；按 `G.08-R3` 由验证者合并 |
| 2026-11-23 | 措辞：R6 引用的编号改为 `C.03.01-R3`（原写 R4）；代码不用改，按 `G.02.06-R21` 走 `relay stale --accept` | `P.09` K220 |
