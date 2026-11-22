# B.03.03 错误响应格式

| 项 | 内容 |
|---|---|
| 编号 | B.03.03 |
| 类型 | 规范 |
| 上级 | B.03 HTTP API 总则 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

## 1. 职责
把内核和产品层的错误映射成 `C.11` 规定的 HTTP 错误响应，并生成给人看的中文信息。

## 2. 不做什么
- 不定义错误码（`C.11`）
- 不在内核里写 HTTP 状态码（`G.05.01-R8`）

## 3. 继承的上级约束
`C.11` §2、§3、`G.13`。

## 4. 接口
```go
// internal/api/errors.go —— 全后端唯一的映射位置
func writeError(w http.ResponseWriter, r *http.Request, err error)
var mapping = []struct{ is func(error) bool; status int; code gen.ApiErrorCode; details func(error) any }{ … }
```

## 5. 行为
| 内核 / 产品层错误 | HTTP | code |
|---|---|---|
| 请求解析、schema 不通过、`op.ErrBadRequest` | 400 | `bad_request` |
| 鉴权失败 | 401 | `unauthorized` |
| `authz` 拒绝、`op.ErrForbidden` | 403 | `forbidden` |
| `op.ErrNodeLocked` | 403 | `node_locked` |
| Origin / Host 校验失败 | 403 | `origin_rejected` |
| `store.ErrNotFound` | 404 | `not_found` |
| `op.ErrConflict` | 409 | `graph_conflict` |
| 幂等键不匹配 | 409 | `idempotency_mismatch` |
| `proposals.ErrStale` | 409 | `proposal_stale` |
| `approvals.ErrClosed` | 409 | `approval_closed` |
| `run.ErrState` | 409 | `run_state` |
| 请求体过大 | 413 | `too_large` |
| `op.ErrInvalidGraph`、校验不通过 | 422 | `invalid_graph` |
| `ext.ErrInvalid` | 422 | `extension_invalid` |
| `authz.ErrEstopped`、`op.ErrEstopped` | 423 | `estopped` |
| 限流 | 429 | `rate_limited` + `Retry-After` |
| `llm.Error`（厂商错误，同步接口里） | 502 | `provider_error` |
| 没有可用模型 | 503 | `provider_unavailable` |
| 其他 | 500 | `internal` |

- `message`：按 code 从 `messages/errors.zh.yaml` 渲染，变量来自 details（`G.13-R5`）。
- `request_id`：每个请求生成 ULID，响应头 `X-Request-Id` 也返回；日志里同一个 ID。
- 500 时 message 固定为"程序出了问题，已记录"，细节只进日志（`G.13-R3`、`R4`）。

## 6. 不变量
- message 里不出现堆栈、SQL、绝对路径、密钥

## 7. 错误处理
映射表没覆盖的错误一律 500 并记 error 日志（带堆栈）。

## 8. 验收标准
1. 映射表每一行一个用例
2. 500 不泄露内部信息
3. 每个 code 在 errors.zh.yaml 里有文案

### 实施卡
- 要建 / 要改的文件：`internal/api/errors.go`、`internal/api/errors_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0303-T1 映射全表`
  - `B0303-T2 500 不泄露`
  - `B0303-T3 文案齐全（C11-T1）`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
