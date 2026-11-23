# C.02.01 Graph 顶层结构

| 项 | 内容 |
|---|---|
| 编号 | C.02.01 |
| 类型 | 实施 |
| 上级 | C.02 图文档 |
| 下级 | 无 |
| 状态 | 已审 |
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
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://anydoor.local/schema/graph.schema.json",
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
    "mandates":       { "type": "array", "items": { "$ref": "common.schema.json#/$defs/MandateMount" }, "default": [] },
    "packages":       { "type": "array", "items": { "type": "string", "pattern": "^[a-z0-9][a-z0-9_\\-.]*@\\d+\\.\\d+\\.\\d+$" }, "uniqueItems": true, "default": [] },
    "meta":           { "$ref": "#/$defs/Meta" }
  },
  "$defs": {
    "Meta": {
      "type": "object",
      "x-open": true,
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

## 7. 示例文档
- `graph_minimal.json`：只有空的 `root`（`nodes`、`edges` 都是空数组）。
- `graph_loop.json`：闭环迭代模板，照 `demo_v0.5/src/29_nest.js` 的示例图：根图 → 闭环迭代（循环）→ 资料采集（子图引用，内联 `children`），共三层。节点类型、端口名、参数名按 `C.03.01` §6；参数只写和默认值不同的（`C.02.02` §5）；ID 用固定的、看得出层级的 ULID（如 `01JDN0000000000000000000A1`）。前端、后端很多测试都读它（`W.03.01`、`W.06.01`、`W.12`、`E.02.01`），所以按真实结构写，不能只求通过校验（`P.09` K207）。资源节点的 `value` 按 `E.14.01` 的写法：模型是模型引用 `{provider, model}`（`E.10.01`；示例里 `provider` 写演示模式的 `fake`），列表是 JSON 数组（"3 家厂商大模型"就是 3 个模型引用），不写成一段说明文字（`P.09` K228）。

## 8. 验收标准
1. `schema/examples/graph_minimal.json`（只有空 root）和 `graph_loop.json`（闭环迭代模板）都通过校验。
2. 缺少 `root`、`version` 为负数、`branch` 为 `feature/x` 时校验失败。
3. Go 和 TS 对同一份文档做规范化序列化，得到的哈希相同。

### 实施卡
- 要建 / 要改的文件：`schema/graph.schema.json`、`schema/common.schema.json`、`schema/examples/manifest.yaml`、`schema/examples/graph_minimal.json`、`schema/examples/graph_loop.json`、`schema/examples/invalid/graph_missing_root.json`、`schema/examples/invalid/graph_version_negative.json`、`schema/examples/invalid/graph_branch_feature.json`、`tools/schemacheck/graph_test.go`
- 说明：`graph.schema.json` 一次写全（本文 §4 加 `C.02.02`–`C.02.05` 的全部 `$defs`），否则 `$ref` 解析不了；`common.schema.json` 里加 `PortRef`（定义见 `C.02.03` §4）。后面四个叶子只补自己的示例和测试，发现定义要改时改这个文件。
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0201-T1 合法示例`：`graph_minimal.json`、`graph_loop.json` 通过
  - `C0201-T2 非法示例`：缺 `root`、`version` 为负数、`branch` 为 `feature/x` 的三个文件失败，报错位置分别是 `""`、`/version`、`/branch`
  - `C0201-T3 闭环示例的结构`：`graph_loop.json` 有三层；节点 ID 全树唯一（`C.02-R1`）；每条连线的两端在同一个子图里（`C.02-R2`）；每个子图都有 `entry` 和 `exit` 子图端口节点（`C.02.04-R2`）；每个资源节点的 `value` 按 `kind` 的写法（§7、`E.14.01`）
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 规范化哈希 Go 与 TS 一致（§8 验收 3）：`E0203-T3`（`E.02.03`）、`W05-T17`（`W.05`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`、`R4`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）
## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §6 写明规范化 JSON 的细则 | `P.09` K93：Go 默认转义 `<>&`、JS 默认按 UTF-16 排序，不写清楚两边哈希会不同 |
| 2026-11-23 | §4 加 `$schema`，`mandates` 引用 `common.schema.json`，`Meta` 标 `x-open`；新增 §7 示例文档（`graph_loop.json` 的依据）；实施卡改为机器可读写法 | `P.09` K201、K203、K207 |
| 2026-11-23 | 状态改为"冻结"：第 2 片（契约片 `m0-contract`）squash 合并进代码仓库 `main`，提交 `34b28fbd47004406cbf3c643947c445bd223be65`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 12 条，`C.01` 一条不符合（示例清单路径在 Windows 上可跳出目录）已修复并复核；按 `G.08-R3` 由验证者合并 |
| 2026-11-23 | 冻结后修改，状态改回"已审"：`graph_loop.json` 的资源节点把 `value` 写成了说明文字（照 demo），§7 写明按 `E.14.01` 的写法，`C0201-T3` 加这一项检查 | 第 11 棒对已提交代码的整体检查发现；`P.09` K228（`G.02.06-R21`） |
