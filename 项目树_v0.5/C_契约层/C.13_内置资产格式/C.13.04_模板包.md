# C.13.04 模板包

| 项 | 内容 |
|---|---|
| 编号 | C.13.04 |
| 类型 | 实施 |
| 上级 | C.13 内置资产格式 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义模板包的格式。模板是预先搭好、可以一键实例化的图（`P.06`），也是端到端测试的标准用例（`T`）。

## 2. 目录结构
```
templates/闭环迭代/
├── template.yaml          # 清单（本文 §3）
├── graph.json             # 图文档（schema_version 当前版本，id 和节点 ID 用占位 ULID）
├── README.md              # 给用户看的说明：解决什么问题、怎么用、要改哪些参数
├── preview.png            # 缩略图（可选，没有时前端用图自动绘制）
└── fixtures/              # 测试用的录放数据（Q.06），可选
```

## 3. 清单（`template.schema.json`）
```json
{
  "$id": "https://anydoor.local/schema/template.schema.json",
  "x-version": "1.0",
  "type": "object",
  "required": ["name", "version", "title", "summary", "graph"],
  "additionalProperties": false,
  "properties": {
    "name":     { "type": "string", "pattern": "^[^@/\\s]{1,40}$" },
    "version":  { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "title":    { "type": "string", "maxLength": 40 },
    "summary":  { "type": "string", "maxLength": 200, "description": "一句话：用来做什么" },
    "tags":     { "type": "array", "items": { "type": "string" } },
    "graph":    { "type": "string", "const": "graph.json" },
    "requires": {
      "type": "object", "additionalProperties": false,
      "properties": {
        "packages":  { "type": "array", "items": { "type": "string" } },
        "subgraphs": { "type": "array", "items": { "type": "string", "description": "子图库引用 名@版本" } },
        "models":    { "type": "array", "items": { "enum": ["any", "json_schema", "tools", "long_context"] }, "description": "需要的模型能力" }
      }
    },
    "inputs": {
      "type": "array",
      "description": "实例化时问用户的问题，答案写进指定参数",
      "items": {
        "type": "object",
        "required": ["key", "label", "target"],
        "properties": {
          "key":    { "type": "string" },
          "label":  { "type": "string", "description": "如 你想调研什么？" },
          "type":   { "enum": ["string", "text", "integer", "enum"] },
          "default":{},
          "target": { "type": "string", "description": "<占位节点 ID>.params.<参数名>，或 inputs.<根图入口端口名>" }
        }
      }
    },
    "cost_hint": { "type": "string", "maxLength": 60, "description": "如 一次运行约 5 万 tokens" }
  }
}
```

## 4. 实例化规则
- **C.13.04-R1** 实例化时，所有占位 ULID（`graph.json` 里的图 ID、节点 ID、连线 ID）统一替换成新生成的 ULID，保持引用关系。
- **C.13.04-R2** 实例化产生一张新图，`meta.template` 记 `名@版本`；之后模板更新不影响已实例化的图。
- **C.13.04-R3** 实例化前检查 `requires`：缺扩展包、缺子图、没有满足能力的模型时，列出缺失项，不创建半成品。
- **C.13.04-R4** 编排者从模板生成图时，也按本规则实例化，再用 GraphPatch 做后续修改。

## 5. 验收标准
1. `templates/` 下 4 个内置模板（`T.02`–`T.05`）的清单和图都通过校验。
2. 实例化两次得到两张 ID 完全不同、结构完全相同的图。

### 实施卡
- 要建的文件：`schema/template.schema.json`。
- 测试用例：`C1304-T1`、`C1304-T2`（实例化代码在 `B.06.05`）。
