# C.01 契约总则

| 项 | 内容 |
|---|---|
| 编号 | C.01 |
| 类型 | 规范 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 目的
统一所有 schema 的写法、命名、兼容性规则和修改流程，保证前后端生成出来的类型一致，并且新旧数据能长期兼容。

## 2. 文件与格式
- **C.01-R1** 所有 schema 使用 JSON Schema **2020-12**，放在仓库 `schema/` 目录，文件名 `<名称>.schema.json`，小写，多个单词用连字符或下划线（沿用下表的写法，不再改）。
- **C.01-R2** `$id` 统一为 `https://harness.local/schema/<文件名>`。跨文件引用写相对路径，如 `"$ref": "common.schema.json#/$defs/Ulid"`。
- **C.01-R3** 公共定义只放在 `common.schema.json`，其他文件不得重复定义。

| 文件 | 内容 | 定义在 |
|---|---|---|
| `common.schema.json` | Ulid、Timestamp、Actor、PortRef、Loc、Iter、状态枚举 | 本文 §4、`C.06.05`、`C.07` |
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
| `package.schema.json` | 扩展包清单（正文在 `X.02`，但遵守本文全部规则） | `X.02` |

## 3. 命名与通用约定
| 编号 | 规则 |
|---|---|
| C.01-R4 | 字段名一律 `snake_case`，只用小写字母、数字、下划线 |
| C.01-R5 | 枚举值一律 `snake_case` 小写英文，如 `k_of_n`、`human_node`。节点类型名例外（原子节点用中文名，见 `C.03.01`） |
| C.01-R6 | ID 一律 ULID 字符串（26 位 Crockford Base32，大写），字段名以 `id` 或 `_id` 结尾（INV-23） |
| C.01-R7 | 时间一律 RFC 3339 UTC，带毫秒，以 `Z` 结尾，如 `2026-11-22T12:01:03.120Z`；字段名以 `_at` 结尾，事件里的时间字段统一叫 `ts` |
| C.01-R8 | 时长一律整数毫秒，字段名以 `_ms` 结尾；不使用 Go 的 `time.Duration` 字符串 |
| C.01-R9 | 金额一律整数，单位是"百万分之一货币单位"，字段名以 `_micros` 结尾；货币种类由设置决定（默认人民币，`P.09` Q9） |
| C.01-R10 | token 数一律整数，字段名以 `tokens` 结尾或为 `usage.in / out / cached` |
| C.01-R11 | 比例一律 0–1 的小数，字段名以 `ratio` 结尾 |
| C.01-R12 | 布尔字段不用否定词（用 `enabled` 不用 `disabled`）；默认值必须写 `default` |
| C.01-R13 | 指向大内容（工作区原文、模型请求响应）的字段以 `_ref` 结尾，值为 `ws://sha256:<hex>`（见 `E.08`） |
| C.01-R14 | 版本号：schema 文件和类型用 `主.次`；扩展包、子图库用语义化版本 `主.次.修订` |

## 4. 公共定义（`common.schema.json`）
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://harness.local/schema/common.schema.json",
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
| `external` | 外部系统：命令行、回调 | 来源名 | `{"kind":"external","id":"harnessctl"}` |

- **C.01-R15** 不允许出现第五种 kind。旧文档里的 `system` 一律写作 `runtime`（`P.09` K3）。
- **C.01-R16** 模型实例的标签（`tags`，如 `编排者`、`主脑`）来自节点实例的 `tags`，用于授权书的授予对象匹配（`C.09`）。

## 5. 兼容性与修改流程
### 5.1 兼容规则
- **C.01-R17** 同一个主版本内**只增不改**：只能新增可选字段、新增枚举值、放宽限制；不能删字段、改字段含义、改类型、收紧限制。
- **C.01-R18** 新增枚举值时，所有读取方必须能处理未知枚举值（前端显示为"未知"，后端记警告，不崩溃）。
- **C.01-R19** `params`、`meta`、`ui` 这三类开放对象里的未知字段，读写时必须原样保留。其他对象默认 `additionalProperties: false`。
- **C.01-R20** 新版本程序必须能读所有旧版本数据（通过迁移，`C.12`）；旧版本程序读到新版本数据时，必须明确报"需要升级 Harness"，不能静默丢字段。

### 5.2 修改流程
| 修改类型 | 流程 |
|---|---|
| 兼容修改（新增可选字段、枚举值） | 改 C 文档 → 改 `schema/` → `make gen` → 更新受影响的实施文档 → 次版本号 +1 |
| 破坏性修改 | 先在 `P.08` 新开 ADR → 改 C 文档 → 主版本号 +1 → 写迁移函数（`C.12`）→ 同上 |

- **C.01-R21** 每个 schema 文件顶层写 `"x-version": "主.次"`，生成代码里带上这个版本，便于排查。

## 6. 检查方式
- CI：所有 schema 通过 2020-12 元校验；`schema/examples/` 下的示例文档全部通过校验。
- CI：`make gen && git diff --exit-code`（`G.16`）。
- 脚本检查：字段名符合 R4；时间、时长、金额字段名后缀符合 R7–R9。
