# C.11 错误码表

| 项 | 内容 |
|---|---|
| 编号 | C.11 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

> 全项目错误码的**唯一登记处**（`G.01-R8`）。新增错误码必须先登记在这里。错误码的写法规范见 `G.13`。

## 1. 三类编码
| 类 | 用在哪 | 格式 | 例子 |
|---|---|---|---|
| **API 错误码** | HTTP 错误响应 | `snake_case` | `graph_conflict` |
| **失败类别** | 节点失败（`node.state` 的 `error.class`） | `snake_case` | `transient` |
| **诊断码** | 图校验结果 | `V` + 两位数字 | `V09` |

## 2. 错误响应格式（`errors.schema.json`）
```json
"ErrorResponse": {
  "type": "object",
  "required": ["error"],
  "additionalProperties": false,
  "properties": {
    "error": {
      "type": "object",
      "required": ["code", "message", "request_id"],
      "additionalProperties": false,
      "properties": {
        "code":       { "$ref": "#/$defs/ApiErrorCode" },
        "message":    { "type": "string", "description": "给用户看的中文，一句话说清楚发生了什么、怎么办" },
        "details":    { "type": "object", "x-open": true, "description": "按 code 不同，见 §3 表" },
        "request_id": { "$ref": "common.schema.json#/$defs/Ulid" }
      }
    }
  }
}
```

## 3. API 错误码
| HTTP | code | 场景 | details |
|---|---|---|---|
| 400 | `bad_request` | 结构校验失败 | `errors: [{path, message}]` |
| 401 | `unauthorized` | 本机 token 无效 | — |
| 403 | `forbidden` | 授权拒绝 | `decision, reasons, action, target` |
| 403 | `node_locked` | 节点有实例锁（`C.03.03`） | `node, lock` |
| 403 | `origin_rejected` | 请求来源不是本机前端（`S.02`） | — |
| 404 | `not_found` | 资源不存在 | `resource, id` |
| 409 | `graph_conflict` | 版本冲突 | `head, missed_ops, conflicts` |
| 409 | `idempotency_mismatch` | 同一个幂等键对应了不同的请求体 | — |
| 409 | `proposal_stale` | 提议已过期 | `proposal_id` |
| 409 | `approval_closed` | 审批已被处理或已过期 | `approval_id, status` |
| 409 | `run_state` | 运行当前状态不允许这个操作（例如对已完成的运行暂停） | `status` |
| 413 | `too_large` | 请求体或导入文件太大 | `limit` |
| 422 | `invalid_graph` | 图校验不通过 | `diags` |
| 422 | `extension_invalid` | 扩展包或 NodeDef 不合法 | `errors` |
| 423 | `estopped` | 急停中，拒绝模型操作或启动运行 | `scope` |
| 429 | `rate_limited` | 限流（附 `Retry-After` 头） | `retry_after_ms` |
| 500 | `internal` | 内部错误 | — |
| 502 | `provider_error` | 模型厂商返回错误 | `provider, status` |
| 503 | `provider_unavailable` | 没有配置可用的模型提供方 | — |
| 202 | —（不是错误） | 已转为提议或审批 | `proposal_id` / `approval_id` |

```json
"ApiErrorCode": { "enum": ["bad_request", "unauthorized", "forbidden", "node_locked", "origin_rejected", "not_found",
  "graph_conflict", "idempotency_mismatch", "proposal_stale", "approval_closed", "run_state", "too_large",
  "invalid_graph", "extension_invalid", "estopped", "rate_limited", "internal", "provider_error", "provider_unavailable"] }
```

## 4. 节点失败类别（`error.class`）
| class | 含义 | 默认处理 |
|---|---|---|
| `transient` | 网络问题、5xx | 重试 |
| `rate_limited` | 429 | 按 Retry-After 重试 |
| `format_invalid` | 结构化输出不合格 | 修复后重试 |
| `budget_exceeded` | 超预算 | 升级 |
| `auth_denied` | 授权拒绝 | 升级 |
| `user_input` | 参数或图配置错误 | 失败，不重试 |
| `structural` | 执行器判断目标无法达成 | 升级 |
| `timeout` | 超时 | 按重试策略 |
| `cancelled` | 被取消（不是失败，只用于工具调用记录） | — |
| `internal` | 引擎缺陷 | 失败并告警 |

```json
"FailureClass": { "enum": ["transient", "rate_limited", "format_invalid", "budget_exceeded", "auth_denied",
  "user_input", "structural", "timeout", "cancelled", "internal"] }
```
旧文档的 `ErrNeedsApproval` 不再是失败类别：需要审批时节点进入 `waiting`（`C.07`）。

## 5. 诊断码
| 码 | 规则 | 级别 |
|---|---|---|
| V01 | 文档结构合法 | error |
| V02 | 节点类型已注册、扩展包已安装 | error |
| V03 | 参数符合 ParamDef（含 `expr` 语法） | error |
| V04 | 锁定参数没有被改 | error |
| V05 | 连线的端口存在、方向正确、在同一子图 | error |
| V06 | 类型兼容 | error |
| V07 | 非多连输入最多一条线；没有重复连线 | error |
| V08 | 必填输入已连或参数有值 | error |
| V09 | 环只能在循环节点内部形成 | error |
| V10 | 循环至少有一个有限出口 | error |
| V11 | 容器规则满足；子图至少一个入口一个出口 | error |
| V12 | 嵌套层数（> 4 warn，> 8 error）；没有引用环 | warn / error |
| V13 | L3 工具上游有人工节点（除非 `l3_skip_human`） | error |
| V14 | Agent 的 context 只接上下文装配（C2 的友好提示） | error |
| V15 | 子图权限交集为空 | warn |
| V16 | 类型变量能推断 | error |
| V17 | 孤立节点 | warn |
| V18 | 长循环（`max_rounds > 10`）没有设预算 | warn |

```json
"DiagCode":  { "enum": ["V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18"] },
"DiagLevel": { "enum": ["error", "warn"] },
"Diag": {
  "type": "object",
  "required": ["level", "code", "msg"],
  "additionalProperties": false,
  "properties": {
    "level": { "$ref": "#/$defs/DiagLevel" },
    "code":  { "$ref": "#/$defs/DiagCode" },
    "node":  { "$ref": "common.schema.json#/$defs/Ulid" },
    "port":  { "type": "string" },
    "param": { "type": "string" },
    "scope": { "type": "string" },
    "msg":   { "type": "string", "description": "中文，指出问题和改法" }
  }
}
```

三个枚举都定义在 `errors.schema.json` 的 `$defs` 里（`C.14-R6` 由它们生成 `ErrCode*`、`DiagV*` 常量，`P.09` K204）；`errors.schema.json` 顶层写 `$schema`、`$id`、`x-version`（`C.01`）。

## 6. 文案文件
- `schema/builtin/messages/errors.zh.yaml`：每个 `ApiErrorCode` 一行，`code: 文案`，格式和写法见 `G.13` §3；`{名字}` 是变量。不多不少，恰好覆盖 §3 的全部 code（`G.16`）。
- `schema/builtin/messages/diags.zh.yaml`：每个诊断码一项，项下的键是它允许的级别（§5 表），值是文案模板（`E.03.04` 按 code 和级别渲染）：
```yaml
V06:
  error: 「{src}」不能接到「{dst}」：{reason}
V12:
  warn: 嵌套已经 {depth} 层，超过 4 层。建议打包成子图库引用
  error: 嵌套 {depth} 层，超过上限 8 层；或者子图引用成环：{chain}
```
- 这两个文件归本文；`E.03.04`、`B.03.03` 只读（`P.09` K206）。

## 7. 验收标准
1. `errors.schema.json` 的 `ApiErrorCode` 枚举和本文 §3 一致；后端每个 code 至少一个测试触发它。
2. 所有错误文案写在 `schema/builtin/messages/errors.zh.yaml`，代码里不硬编码中文。

### 实施卡
- 要建 / 要改的文件：`schema/errors.schema.json`、`schema/builtin/messages/errors.zh.yaml`、`schema/builtin/messages/diags.zh.yaml`、`schema/examples/manifest.yaml`、`schema/examples/errors/graph_conflict.json`、`schema/examples/errors/diag_v12_warn.json`、`schema/examples/invalid/error_unknown_code.json`、`schema/examples/invalid/diag_code_v99.json`、`tools/schemacheck/errors_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C11-T1 枚举`：`ApiErrorCode`、`FailureClass`、`DiagCode` 与 §3、§4、§5 的表一致（测试里照本文写一份期望值）
  - `C11-T2 错误文案`：`errors.zh.yaml` 恰好覆盖每个 `ApiErrorCode`，每条非空
  - `C11-T3 诊断文案`：`diags.zh.yaml` 恰好覆盖每个 `DiagCode`；每个码下的级别与 §5 表一致（V12 有 `warn`、`error` 两个，其余一个）
  - `C11-T4 示例`：清单里 `errors/graph_conflict.json`（`ErrorResponse`）、`errors/diag_v12_warn.json`（`Diag`）通过；`invalid/error_unknown_code.json` 在 `/error/code` 失败、`invalid/diag_code_v99.json` 在 `/code` 失败
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 每个 code 至少一个测试触发它（§7 验收 1）：`B.03.03`、`B.04` 各接口的测试
  - 每个诊断码都能渲染出文案：`E0304-T1`（`E.03.04`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 错误响应、`Diag` 加 `additionalProperties: false`，`details` 标 `x-open`；新增 `ApiErrorCode`、`FailureClass`、`DiagCode`、`DiagLevel` 枚举的 JSON；新增 §6 文案文件（`diags.zh.yaml` 的格式，归本文）；实施卡改为机器可读写法 | `P.09` K201、K204、K206 |
