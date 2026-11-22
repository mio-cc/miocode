# C.02.02 Node 节点

| 项 | 内容 |
|---|---|
| 编号 | C.02.02 |
| 类型 | 实施 |
| 上级 | C.02 图文档 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义节点实例 `Node`。

## 2. 不做什么
- 不定义节点类型有哪些端口和参数（那是 NodeDef，`C.03`）。
- 不存运行状态（`C.07`）。

## 3. 继承的上级约束
`C.02-R1`、`C.02-R3`；INV-01、INV-02。

## 4. 定义（`graph.schema.json#/$defs/Node`）
```json
{
  "type": "object",
  "required": ["id", "type", "pos"],
  "additionalProperties": false,
  "properties": {
    "id":       { "$ref": "common.schema.json#/$defs/Ulid" },
    "type":     { "$ref": "#/$defs/NodeTypeRef" },
    "label":    { "type": "string", "minLength": 1, "maxLength": 80 },
    "pos":      { "$ref": "#/$defs/Pos" },
    "params":   { "type": "object", "default": {}, "description": "开放对象；按 NodeDef.params 校验；未知键原样保留" },
    "promoted": { "type": "array", "items": { "type": "string", "pattern": "^[a-z_][a-z0-9_]*$" }, "uniqueItems": true, "default": [] },
    "tags":     { "type": "array", "items": { "type": "string", "maxLength": 40 }, "uniqueItems": true, "maxItems": 16, "default": [] },
    "lock":     { "enum": ["none", "user", "frozen"], "default": "none" },
    "ui":       { "$ref": "#/$defs/NodeUi" },
    "children": { "$ref": "#/$defs/Subgraph" },
    "ref":      { "$ref": "#/$defs/SubgraphRef" },
    "origin":   { "$ref": "#/$defs/Origin" }
  },
  "not": { "required": ["children", "ref"] }
}
```

```json
"NodeTypeRef": {
  "type": "string",
  "description": "原子节点：中文名；扩展节点：包名/节点名@主版本",
  "pattern": "^(资源|Agent|上下文装配|工具|扇出|汇合|聚合|分支|循环|账本|人工|子图端口|子图引用|[a-z0-9][a-z0-9_\\-.]*/[^/@]{1,60}@\\d+)$",
  "examples": ["Agent", "扇出", "pricing-pack/价格标准化@1"]
},
"Origin": {
  "type": "object",
  "additionalProperties": false,
  "description": "最后一次修改这个元素的 Op；前端据此显示 AI 角标",
  "properties": {
    "actor":  { "$ref": "common.schema.json#/$defs/Actor" },
    "op_id":  { "$ref": "common.schema.json#/$defs/Ulid" },
    "reason": { "type": "string", "maxLength": 500 }
  }
}
```

## 5. 字段说明
| 字段 | 含义 | 规则 |
|---|---|---|
| `type` | 节点类型 | 原子节点用 13 个中文名之一（INV-01）；扩展节点写 `包名/节点名@主版本`，只写主版本，次版本由已安装的包决定 |
| `label` | 显示名 | 缺省时显示类型名；同一子图内允许重名（运行路径用短 ID 区分，`C.06.05`） |
| `params` | 参数值 | 只存和 NodeDef 默认值**不同**的键；读取时缺失的键用默认值补齐 |
| `promoted` | 被提升成输入端口的参数名 | 提升后该参数既可以在属性面板设置，也可以由连线传入；连线优先 |
| `tags` | 标签 | 用于授权书匹配（`C.09`）和搜索；`编排者`、`主脑` 等是约定标签 |
| `lock` | 实例锁 | 见 `C.03.03` |
| `ui` | 视图信息 | 见 `C.02.05`；不影响运行 |
| `children` / `ref` | 子图 | 二者互斥；哪些类型必须有、可以有，见 `C.02.04` |
| `origin` | 最后修改来源 | 服务器在应用 Op 时写入，客户端提交的值被忽略 |

## 6. 不变量
- `params` 里没有被 `kernel` 锁定的键（`C.03.03`）。
- `promoted` 里的每个名字都是 NodeDef 里 `promotable: true` 的参数。
- 容器规则（`C.02.04`）对每个节点成立。

## 7. 验收标准
1. 同时带 `children` 和 `ref` 的节点校验失败。
2. `type` 为 `调度器` 或 `pack/x`（缺版本）时校验失败。
3. 读取只存了非默认值的节点，补齐默认值后再序列化，`params` 仍只含非默认值。

### 实施卡
- 要改的文件：`schema/graph.schema.json`（`$defs/Node`、`NodeTypeRef`、`Origin`）；`schema/examples/invalid/node_*.json`。
- 测试用例：`C0202-T1`（互斥）、`C0202-T2`（类型名格式）、`C0202-T3`（默认值往返）。
- 禁止事项：`G.02.05-R1`、`R2`。
