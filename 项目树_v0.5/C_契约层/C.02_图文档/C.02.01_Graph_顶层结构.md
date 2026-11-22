# C.02.01 Graph 顶层结构

| 项 | 内容 |
|---|---|
| 编号 | C.02.01 |
| 类型 | 实施 |
| 上级 | C.02 图文档 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义图文档的顶层结构 `Graph`。

## 2. 不做什么
- 不定义节点、连线、子图的内部结构（`C.02.02`–`C.02.04`）。
- 不定义版本历史怎么存（`E.07.02`）；文档里只有当前版本号。

## 3. 继承的上级约束
`C-R1`–`C-R4`、`C.01-R4`–`R14`、`C.02-R1`–`R4`。

## 4. 定义
```json
{
  "$id": "https://harness.local/schema/graph.schema.json",
  "x-version": "1.0",
  "title": "Graph",
  "type": "object",
  "required": ["id", "schema_version", "version", "branch", "root"],
  "additionalProperties": false,
  "properties": {
    "id":             { "$ref": "common.schema.json#/$defs/Ulid" },
    "schema_version": { "type": "string", "const": "1.0" },
    "version":        { "type": "integer", "minimum": 0 },
    "branch":         { "type": "string", "pattern": "^(main|draft/[a-z0-9][a-z0-9_\\-]{0,62})$", "default": "main" },
    "title":          { "type": "string", "maxLength": 120, "default": "" },
    "root":           { "$ref": "#/$defs/Subgraph" },
    "mandates":       { "type": "array", "items": { "$ref": "mandate.schema.json#/$defs/MandateMount" }, "default": [] },
    "packages":       { "type": "array", "items": { "type": "string", "pattern": "^[a-z0-9][a-z0-9_\\-.]*@\\d+\\.\\d+\\.\\d+$" }, "uniqueItems": true, "default": [] },
    "meta":           { "$ref": "#/$defs/Meta" }
  },
  "$defs": {
    "Meta": {
      "type": "object",
      "description": "开放对象，未知字段原样保留（C.01-R19）",
      "properties": {
        "created_at": { "$ref": "common.schema.json#/$defs/Timestamp" },
        "updated_at": { "$ref": "common.schema.json#/$defs/Timestamp" },
        "created_by": { "$ref": "common.schema.json#/$defs/Actor" },
        "template":   { "type": "string", "description": "从哪个模板实例化，如 闭环迭代@1.0.0" },
        "description":{ "type": "string", "maxLength": 2000 }
      }
    }
  }
}
```

## 5. 字段说明
| 字段 | 含义 | 谁来改 |
|---|---|---|
| `id` | 图的 ULID，创建后不变 | 创建时生成 |
| `schema_version` | 文档格式版本；读取时低于当前版本就自动迁移（`C.12`） | 迁移器 |
| `version` | 本分支的版本号；每应用一个 Op 加 1 | Op 流水线（服务器） |
| `branch` | `main` 或草稿分支 `draft/<名>`；模型的草稿分支名为 `draft/model-<会话或运行的 ULID 小写>` | 服务器 |
| `title` | 图标题 | Op `set_graph_title` |
| `root` | 根图（第 0 层） | 各种 Op |
| `mandates` | 授权书挂载点；授权书本体不在图里（`C.09`） | Op `set_mandate` |
| `packages` | 本图用到的扩展包；服务器在应用 Op 时自动维护，客户端不能直接写 | 服务器 |
| `meta` | 元信息 | 服务器写 `created_*`、`updated_at`；`description` 用 Op `set_graph_meta` |

## 6. 不变量
- `version` 在同一分支上单调递增。
- `packages` 等于图中所有扩展节点类型所属包的集合（去重、按名称排序）。
- 文档序列化时使用规范化 JSON（键按字典序、无多余空白），`hash = sha256(规范化 JSON)`。细则（`P.09` K93，Go 与 TS 必须逐字节相同）：字典序按 Unicode 码点比较（等于 UTF-8 字节序）；字符串按 JSON 标准转义，不做 HTML 转义（Go 用 `json.Encoder.SetEscapeHTML(false)`）；整数不带小数点和指数；以 `schema/examples/hash_vectors.json` 为准。

## 7. 验收标准
1. `schema/examples/graph_minimal.json`（只有空 root）和 `graph_loop.json`（闭环迭代模板）都通过校验。
2. 缺少 `root`、`version` 为负数、`branch` 为 `feature/x` 时校验失败。
3. Go 和 TS 对同一份文档做规范化序列化，得到的哈希相同。

### 实施卡
- 要建的文件：`schema/graph.schema.json`（本文 §4 + `C.02.02`–`C.02.05` 的 `$defs`）、`schema/examples/graph_minimal.json`、`schema/examples/graph_loop.json`、`schema/examples/invalid/*.json`。
- 不许碰的文件：`gen/`、`web/src/lib/protocol/generated/`（由生成器产出）。
- 测试用例：
  - `C0201-T1` 两个合法示例通过校验。
  - `C0201-T2` `invalid/` 下每个文件都校验失败，且报错位置与文件名里写的字段一致。
  - `C0201-T3` 规范化哈希：Go 与 TS 结果一致（放在 `Q.04` 跨语言测试里）。
- 允许使用的依赖：`santhosh-tekuri/jsonschema/v6`（Go 校验）、`ajv`（前端开发态校验）。
- 禁止事项：`G.02.05-R1`、`R2`、`R4`。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §6 写明规范化 JSON 的细则 | `P.09` K93：Go 默认转义 `<>&`、JS 默认按 UTF-16 排序，不写清楚两边哈希会不同 |
