# C.01 契约总则

| 项 | 内容 |
|---|---|
| 编号 | C.01 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引02 |
| 最后修改 | 2026-11-23 |

## 1. 目的
统一所有 schema 的写法、命名、兼容性规则和修改流程，保证前后端生成出来的类型一致，并且新旧数据能长期兼容。

## 2. 文件与格式
- **C.01-R1** 所有 schema 使用 JSON Schema **2020-12**，放在仓库 `schema/` 目录，文件名 `<名称>.schema.json`，小写，多个单词用连字符或下划线（沿用下表的写法，不再改）。
- **C.01-R2** `$id` 统一为 `https://anydoor.local/schema/<文件名>`。跨文件引用写相对路径，如 `"$ref": "common.schema.json#/$defs/Ulid"`。
- **C.01-R3** 公共定义只放在 `common.schema.json`，其他文件不得重复定义。

| 文件 | 内容 | 定义在 |
|---|---|---|
| `common.schema.json` | Ulid、Timestamp、WsRef、Actor、MandateMount、PortRef、Loc、Iter、状态枚举 | 本文 §4、`C.02.03`、`C.06.05`、`C.07` |
| `graph.schema.json` | 图文档 | `C.02` |
| `nodedef.schema.json` | 节点定义 | `C.03` |
| `types.schema.json` | TypeRef 语法、8 类显示类别 | `C.04` |
| `typedef.schema.json` | 自定义结构类型声明 | `C.13.03` |
| `op.schema.json` | Op 信封与全部 Op 载荷 | `C.05` |
| `run-event.schema.json` | 运行事件 | `C.06.02` |
| `graph-event.schema.json` | 图协同事件 | `C.06.03` |
| `session-event.schema.json` | 会话事件 | `C.06.04` |
| `graph_patch.schema.json` | GraphPatch 与提议 | `C.08` |
| `mandate.schema.json` | 授权书与挂载 | `C.09` |
| `session.schema.json` | 会话、消息、选中附带 | `C.10` |
| `errors.schema.json` | 错误响应、错误码枚举、诊断 | `C.11` |
| `recipe.schema.json` | 配方 | `C.13.01` |
| `rolecard.schema.json` | 角色卡 | `C.13.02` |
| `template.schema.json` | 模板包清单 | `C.13.04` |
| `connection.schema.json` | 连接类型与连接 | `C.16` |
| `package.schema.json` | 扩展包清单（正文在 `X.02`，但遵守本文全部规则） | `X.02` |
| `api.schema.json` | HTTP 接口的响应结构：运行概览、节点执行投影、审批、有效档位、分支、操作记录、图元信息等（正文在 `B.04` 各文档的"数据结构"节，遵守本文全部规则，`P.09` K80） | `B.04` |

## 3. 命名与通用约定
| 编号 | 规则 |
|---|---|
| C.01-R4 | 字段名一律 `snake_case`，只用小写字母、数字、下划线 |
| C.01-R5 | 枚举值一律 `snake_case` 小写英文，如 `k_of_n`、`human_node`。节点类型名例外（原子节点用中文名，见 `C.03.01`） |
| C.01-R6 | ID 一律 ULID 字符串（26 位 Crockford Base32，大写），字段名以 `id` 或 `_id` 结尾（INV-23） |
| C.01-R7 | 时间一律 RFC 3339 UTC，带毫秒，以 `Z` 结尾，如 `2026-11-22T12:01:03.120Z`；字段名以 `_at` 结尾，事件里的时间字段统一叫 `ts` |
| C.01-R8 | 时长一律整数毫秒，字段名以 `_ms` 结尾；不使用 Go 的 `time.Duration` 字符串 |
| C.01-R9 | 金额一律整数，单位是"百万分之一货币单位"，字段名以 `_micros` 结尾；v1 货币固定为人民币，没有币种设置项（`P.09` Q9、K160） |
| C.01-R10 | token 数一律整数，字段名以 `tokens` 结尾或为 `usage.in / out / cached` |
| C.01-R11 | 比例一律 0–1 的小数，字段名以 `ratio` 结尾 |
| C.01-R12 | 布尔字段不用否定词（用 `enabled` 不用 `disabled`）；默认值必须写 `default` |
| C.01-R13 | 指向大内容（工作区原文、模型请求响应）的字段以 `_ref` 结尾，值为 `ws://sha256:<hex>`（见 `E.08`） |
| C.01-R14 | 版本号：schema 文件和类型用 `主.次`；扩展包、子图库用语义化版本 `主.次.修订` |

## 4. 公共定义（`common.schema.json`）
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://anydoor.local/schema/common.schema.json",
  "x-version": "1.0",
  "$defs": {
    "Ulid":      { "type": "string", "pattern": "^[0-9A-HJKMNP-TV-Z]{26}$" },
    "Timestamp": { "type": "string", "format": "date-time", "pattern": "Z$" },
    "WsRef":     { "type": "string", "pattern": "^ws://sha256:[0-9a-f]{64}$" },
    "ActorKind": { "enum": ["user", "model", "runtime", "external"] },
    "Actor": {
      "type": "object",
      "required": ["kind", "id"],
      "additionalProperties": false,
      "properties": {
        "kind":        { "$ref": "#/$defs/ActorKind" },
        "id":          { "type": "string", "maxLength": 200 },
        "instance_id": { "type": "string", "description": "model 专用：模型实例，如 run:<run_id>/<node_id> 或 chat:<session_id>" },
        "tags":        { "type": "array", "items": { "type": "string" }, "uniqueItems": true }
      }
    },
    "MandateMount": {
      "type": "object",
      "required": ["anchor", "mandate_id"],
      "additionalProperties": false,
      "description": "授权书挂载点；图文档和会话都用（C.09 §3、P.09 K203）",
      "properties": {
        "anchor":     { "type": "string", "pattern": "^(session|graph|node:[0-9A-HJKMNP-TV-Z]{26})$", "description": "session 只出现在会话文档里" },
        "mandate_id": { "$ref": "#/$defs/Ulid" },
        "priority":   { "type": "integer", "default": 0 }
      }
    }
  }
}
```

### 4.1 操作者 Actor（INV-24）
| kind | 是谁 | `id` 写法 | 例子 |
|---|---|---|---|
| `user` | 本机用户 | v1 固定为 `local` | `{"kind":"user","id":"local"}` |
| `model` | 某个模型实例：Agent 节点的一次执行，或对话 Agent | 模型引用；`instance_id` 必填 | `{"kind":"model","id":"large-model","instance_id":"chat:01JD…"}` |
| `runtime` | 内核自己：调度器、迁移器、非模型节点的直接工具调用 | 组件名，可带节点路径 | `{"kind":"runtime","id":"sched"}`、`{"kind":"runtime","id":"node:01JX…"}` |
| `external` | 外部系统：命令行、回调 | 来源名 | `{"kind":"external","id":"anydoorctl"}` |

- **C.01-R15** 不允许出现第五种 kind。旧文档里的 `system` 一律写作 `runtime`（`P.09` K3）。
- **C.01-R16** 模型实例的标签（`tags`，如 `编排者`、`主脑`）来自节点实例的 `tags`，用于授权书的授予对象匹配（`C.09`）。

## 5. 兼容性与修改流程
### 5.1 兼容规则
- **C.01-R17** 同一个主版本内**只增不改**：只能新增可选字段、新增枚举值、放宽限制；不能删字段、改字段含义、改类型、收紧限制。
- **C.01-R18** 新增枚举值时，所有读取方必须能处理未知枚举值（前端显示为"未知"，后端记警告，不崩溃）。
- **C.01-R19** `params`、`meta`、`ui` 这三类开放对象里的未知字段，读写时必须原样保留。开放对象在 schema 里标 `"x-open": true`，只能用在 C 文档写明是开放对象的位置（这三类，以及错误响应的 `details`）；代码生成按它生成 map（`C.14` §3）。其他对象一律写 `additionalProperties`（`false`，或者像 `overrides` 那样写值的 schema）。每个 `"type": "object"` 都必须二选一，检查见 `C01-T4`（`P.09` K202）。
- **C.01-R20** 新版本程序必须能读所有旧版本数据（通过迁移，`C.12`）；旧版本程序读到新版本数据时，必须明确报"需要升级 Anywhere Door"，不能静默丢字段。

### 5.2 修改流程
| 修改类型 | 流程 |
|---|---|
| 兼容修改（新增可选字段、枚举值） | 改 C 文档 → 改 `schema/` → `make gen` → 更新受影响的实施文档 → 次版本号 +1 |
| 破坏性修改 | 先在 `P.08` 新开 ADR → 改 C 文档 → 主版本号 +1 → 写迁移函数（`C.12`）→ 同上 |

- **C.01-R21** 每个 schema 文件顶层写 `"x-version": "主.次"`，生成代码里带上这个版本，便于排查。

## 6. 示例与检查
- **C.01-R22** `schema/examples/` 下的文件只有两种：**示例文档**，登记在 `schema/examples/manifest.yaml`，写明按哪个 schema 校验、应当通过还是失败；**测试向量**，文件名以 `_vectors.json` 结尾（`P.06`"测试向量"），格式由定义它的 C 文档规定，由那个叶子的测试检查。两种都不是的文件不能放进来（`P.09` K202）。
- **C.01-R23** 符合 schema、但图检查（`E.03.03`）应当报某个诊断码的示例放在 `schema/examples/semantic/`，清单里写 `valid: true` 和 `diag: <诊断码>`；`E.03.03` 的测试读这些文件，每个必须报出且只报出那个诊断码（`P.09` K206）。

清单格式：
```yaml
# schema/examples/manifest.yaml（C.01-R22）。每个 C 叶子把自己的示例追加在后面
- file: graph_minimal.json              # 相对 schema/examples/
  schema: graph.schema.json             # 可以带 #/$defs/…，如 common.schema.json#/$defs/Actor
  valid: true
- file: invalid/graph_branch_feature.json
  schema: graph.schema.json
  valid: false
  error_at: /branch                     # 期望的报错位置（JSON Pointer，整个文档写 ""）；实际报错位置必须是它或它下面
- file: semantic/edge_cross_scope.json
  schema: graph.schema.json
  valid: true
  diag: V05
```

检查工具 `tools/schemacheck`（本叶子实现）：`go run ./tools/schemacheck` 逐条列出问题（文件、位置、违反的规则编号），有问题时退出 1；同样的检查写成 `go test`，所以 `go run ./tools/build -check` 和 CI 都会跑（`O.01`、`O.02`）。检查内容：
| 项 | 规则 |
|---|---|
| 元校验 | 每个 `schema/*.schema.json` 通过 2020-12 元校验并能编译；跨文件 `$ref` 只从本地 `schema/` 解析，不联网 |
| 写法 | R1、R2、R3、R21 |
| 命名 | R4、R7–R13 |
| 封闭对象 | R19 |
| 示例 | R22、R23 |

CI 另外检查 `make gen && git diff --exit-code`（`G.16`）。

### 实施卡
- 要建 / 要改的文件：`schema/common.schema.json`、`schema/examples/manifest.yaml`、`schema/examples/invalid/actor_system_kind.json`、`schema/examples/invalid/mandate_anchor_path.json`、`tools/schemacheck/main.go`、`tools/schemacheck/check.go`、`tools/schemacheck/check_test.go`、`tools/schemacheck/helpers_test.go`、`go.mod`、`go.sum`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C01-T1 元校验`：`schema/` 下每个 `*.schema.json` 通过 2020-12 元校验并能编译；跨文件 `$ref` 只从本地解析
  - `C01-T2 写法`：每个文件的 `$schema` 是 2020-12、`$id` 符合 R2、顶层有 `x-version`（R21）；`common.schema.json` 里的名字不在别的文件的 `$defs` 里重复（R3）；测试里内联的反例各被拦下
  - `C01-T3 命名`：字段名（R4）；引用 `Timestamp` 的字段名以 `_at` 结尾或叫 `ts`（R7）；以 `_ms`、`_micros`、`tokens` 结尾的字段是 `integer`（R8–R10）；以 `ratio` 结尾的是 0–1 的 `number`（R11）；不是必填的 `boolean` 写了 `default`，字段名不以 `no_`、`not_`、`non_` 开头、不叫 `disabled`（R12）；以 `_ref` 结尾的字段引用 `WsRef`（R13）；反例各被拦下
  - `C01-T4 封闭对象`：每个 `"type": "object"` 都写了 `additionalProperties` 或 `"x-open": true`（R19）；反例被拦下
  - `C01-T5 示例清单`：清单里每一项按声明的 schema 校验，结果与 `valid` 一致；`valid: false` 的报错位置在 `error_at` 或它下面；`diag` 是 `V` 加两位数字；`schema/examples/` 下每个文件要么在清单里，要么以 `_vectors.json` 结尾（R22）
  - `C01-T6 公共定义`：`Ulid`、`Timestamp`、`WsRef`、`Actor`、`MandateMount` 各有合法、非法值（表在测试里）；清单里的 `invalid/actor_system_kind.json`（`kind` 为 `system`，R15）在 `/kind` 失败、`invalid/mandate_anchor_path.json`（`anchor` 为 `path:…`）在 `/anchor` 失败
  - `C01-T7 命令`：`go run ./tools/schemacheck` 对仓库的 `schema/` 退出 0；对测试里造的有问题的目录退出 1，并逐条列出问题
- 说明：`tools/schemacheck/helpers_test.go` 是本包测试共用的辅助函数（读 schema、按清单校验、读 YAML），后面的 C 叶子只调用、不修改；需要别的辅助函数写在自己的测试文件里。
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`；校验只用本地文件，不联网
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §2 文件表登记 `api.schema.json`（HTTP 响应结构） | `P.09` K80 |
| 2026-11-23 | R9：v1 币种固定人民币，不设设置项 | 第 10 棒写 `W.10`；`P.09` K160 |
| 2026-11-23 | 类型改为"实施"；`common.schema.json` 加 `x-version`、`MandateMount`；R19 加 `x-open`；§6 改为示例与检查（R22 示例清单、R23 `semantic/`）并加实施卡（`tools/schemacheck`） | `P.09` K202、K203、K206（第 2 片开工前复查） |
| 2026-11-23 | 状态改为"冻结"：第 2 片（契约片 `m0-contract`）squash 合并进代码仓库 `main`，提交 `34b28fbd47004406cbf3c643947c445bd223be65`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 12 条，`C.01` 一条不符合（示例清单路径在 Windows 上可跳出目录）已修复并复核；按 `G.08-R3` 由验证者合并 |
