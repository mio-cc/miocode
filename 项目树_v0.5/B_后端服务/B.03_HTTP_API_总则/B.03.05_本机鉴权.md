# B.03.05 本机鉴权

| 项 | 内容 |
|---|---|
| 编号 | B.03.05 |
| 类型 | 实施 |
| 上级 | B.03 HTTP API 总则 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引15 |
| 最后修改 | 2026-11-24 |

## 1. 职责
`internal/api` 的服务器骨架和本机鉴权：`Server`、`ServeMux`、`B.03` §3 的中间件链（不含幂等键）、`B.03.03` 的错误响应写法；token 换会话 cookie、Bearer token（命令行用）、Host 与 Origin 校验、安全响应头（`P.09` K242）。

## 2. 不做什么
- 不实现 token 和会话的生成、存储（`B.07.01`）
- 不实现幂等键（`B.03.04`）、OpenAPI（`B.03.06`）、分页（`B.03.02`）
- 不注册业务接口：`/api/v1/health`、`/api/v1/admin/shutdown` 归 `B.04.14`，其余归 `B.04` 的各个叶子
- 不做"只有用户能做"的接口本身（解除急停等，`S.09`，M3）；本叶子只提供 `CallerFrom` 和 `IsUser` 供它们判断

## 3. 继承的上级约束
`S.02`（全部规则）、INV-21、`B-R2`、`B.03` §3、`B.03.02`（请求体大小）、`B.03.03`（错误码与 HTTP 状态）、`B.07.01`（`auth` 的接口）、`G.13-R5`。

## 4. 接口
```go
// internal/api/server.go
type Deps struct {
	Auth     *auth.Auth       // B.07.01
	Port     int              // 实际监听端口：Host / Origin 校验用（B.02 先监听再建 Server）
	Version  string           // health 返回（B.04.14）
	Dev      bool             // --dev：CSP 放宽（S.02-R9）
	Static   http.Handler     // /api/ 以外的路径：生产模式是嵌入的前端，开发模式是 Vite 代理（B.02）；nil 时 404
	Shutdown func()           // POST /api/v1/admin/shutdown 调用（B.04.14）；只调用一次，不阻塞
	Logger   *slog.Logger     // nil 时丢弃
}
type Server struct{ /* 未导出 */ }
func NewServer(d Deps) (*Server, error)   // 读入错误文案；Auth 为 nil、Port 不在 1–65535 时返回错误
func (s *Server) Handler() http.Handler

// internal/api/routes.go —— 全部路由在这里注册；B.04 的叶子各自往里加
func (s *Server) routes()

// internal/api/auth.go
type Caller struct { Actor gen.Actor; Via string }   // Via: cookie | bearer
func CallerFrom(ctx context.Context) (Caller, bool)
func IsUser(c Caller) bool                          // cookie 的用户，或 Bearer 的 anydoorctl（S.09-R2）

// internal/api/errors.go —— 全后端唯一的错误映射位置（B.03.03 §4）
func writeError(w http.ResponseWriter, r *http.Request, err error)

// schema/builtin/messages/messages.go —— 错误文案嵌入（P.09 K242）
package messages
//go:embed *.zh.yaml
var FS embed.FS
```

## 5. 行为
1. **中间件链**（`B.03` §3，M0 不含幂等键）：`recover → request_id → 安全响应头 → Host 校验 → Origin 校验 → 鉴权 → 请求体大小 → 处理函数`。前四层对所有路径生效；Origin 校验对所有路径的非 GET 请求和 SSE 请求生效；鉴权只对 `/api/` 生效；`routes.go` 注册时可以把某条路由标为"不鉴权"，M0 只有 `GET /api/v1/health`（`B-R3`）。
   - **recover**：处理函数 panic 时记录堆栈、返回 500 `internal`。
   - **request_id**：每个请求一个 ULID（`github.com/oklog/ulid/v2`），放进 `context` 和响应头 `X-Request-Id`，日志带上它。
   - **安全响应头**（`S.02-R8`）：每个响应都带 `S.02-R8` 的四个头；`Dev` 时 CSP 的 `connect-src` 加 `ws://127.0.0.1:5173`（`S.02-R9`）。不写任何 `Access-Control-Allow-*`（`S.02-R7`）。
   - **请求体大小**：`http.MaxBytesReader` 限制 1 MB（`B.03.02`）；超出时 413 `too_large`，`details.limit` 为 `"1MB"`。
   - 普通请求处理时限 30 秒（`B.03` §3）；SSE 以后再说（`B.05`）。
2. **引导**：`GET /?t=<token>`：常量时间比较 token（`auth.VerifyToken`）→ `auth.NewSession` 发会话 → 设置 cookie `auth.CookieName`（HttpOnly、`SameSite=Strict`、`Path=/`、`Max-Age` 为 `auth.SessionTTL` 的秒数，`P.09` K239）→ 302 到 `/`（去掉 URL 里的 token）。token 不对：401，返回一页纯文本"访问令牌无效。请重新运行 Anywhere Door。"，不设 cookie。没有 `t` 参数的 `GET /` 交给 `Static`。
3. **API 请求**：cookie 有效（`auth.VerifySession`）→ `Caller{Actor: {kind: user, id: local}, Via: cookie}`；或 `Authorization: Bearer <token>` 有效（`auth.VerifyToken`）→ `Caller{Actor: {kind: external, id: anydoorctl}, Via: bearer}`；两者都有时以 cookie 为准；否则 401 `unauthorized`。
4. **Host 校验**（`S.02-R5`）：只接受 `127.0.0.1:<Port>`、`localhost:<Port>`、`[::1]:<Port>`（不区分大小写）；否则 403 `origin_rejected`。
5. **Origin 校验**（`S.02-R6`）：要校验的请求，`Origin` 必须是 `http://` 加上面三个之一；`Origin` 缺失时只允许带有效 Bearer 的请求；否则 403 `origin_rejected`。
6. **只有用户能做的接口**：处理函数里用 `IsUser(CallerFrom(ctx))` 判断。`Via: bearer` 的 `external:anydoorctl` 视同用户（`S.09-R2`），其他 external 调用方没有这个权利。M0 用到它的只有 `B.04.14` 的 shutdown。
7. token 重新生成后，所有旧 cookie 失效（`S.02-R2`，`B.07.01` 已保证；本叶子用测试确认）。
8. **错误响应**（`B.03.03`）：`writeError` 按包内的哨兵错误映射 HTTP 状态和 code（M0 用到 `bad_request` 400、`unauthorized` 401、`origin_rejected` 403、`not_found` 404、`too_large` 413、`internal` 500；`B.03.03` §5 表里其余的行由以后的叶子加）。响应体符合 `errors.schema.json#/$defs/ErrorResponse`：`message` 取 `schema/builtin/messages/errors.zh.yaml` 里这个 code 的文案，`{名字}` 用 `details` 里同名的值替换（`G.13-R5`）；`request_id` 是本次请求的 ULID；500 时不写 `details`，错误原文只进日志（`G.13-R3`、`R4`）。

## 6. 不变量
- 没有任何不经过鉴权就能修改状态的接口（`/api/` 下只有 `GET /api/v1/health` 不鉴权）
- token 比较使用常量时间（由 `auth.VerifyToken` 保证）
- 每个响应都带安全响应头和 `X-Request-Id`，包括 401、403、404、413、500

## 7. 错误处理
失败一律 401 / 403，不说明是 token 错还是 cookie 错（避免信息泄露）。文案文件里缺少某个 code 时 `NewServer` 返回错误（启动失败比运行时才发现好）。

## 8. 验收标准
1. `S.02` §2 第 1–3 条用例（第 4 条"局域网访问被拒"由 `B.02` 的监听地址保证，在 `B02-T1` 测）
2. token 换 cookie 后 URL 里不再有 token
3. token 重新生成后旧 cookie 失效
4. 每种错误响应都符合 `ErrorResponse`，且带安全响应头

### 实施卡
- 要建 / 要改的文件：`internal/api/server.go`、`internal/api/routes.go`、`internal/api/middleware.go`、`internal/api/auth.go`、`internal/api/errors.go`、`internal/api/headers.go`、`internal/api/server_test.go`、`internal/api/auth_test.go`、`internal/api/errors_test.go`、`schema/builtin/messages/messages.go`、`go.mod`、`go.sum`
- `go.mod` 加 `github.com/oklog/ulid/v2`（`G.10` 已登记）：验证者 `go get github.com/oklog/ulid/v2@latest` 后 `go mod tidy`；实施者不手改。
- `routes.go` 这一叶子只注册引导（`GET /{$}` 带 `t` 参数时）和把其余非 `/api/` 路径交给 `Static`；测试里用包内的辅助函数临时注册一条需要鉴权的 `POST /api/v1/test/echo` 和一条 panic 的路由，不写进 `routes.go`。
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/platform/`、`cmd/`
- 测试用 `auth.Open` 在 `t.TempDir()` 的数据目录上建真的 `Auth`，KV 在测试文件里用 map 实现。
- 测试用例：
  - `B0305-T1 Origin`：`POST` 带 `Origin: http://evil.example` → 403 `origin_rejected`；`Origin` 为三个本机地址之一且 cookie 有效 → 200；`Origin` 缺失、只有 cookie → 403；`Origin` 缺失、Bearer 有效 → 200；`GET` 不查 Origin
  - `B0305-T2 Host 重绑定`：`Host: evil.example:<端口>`、`Host: 127.0.0.1:<别的端口>` → 403 `origin_rejected`；三个本机 Host（含大写 `LOCALHOST`）→ 通过
  - `B0305-T3 无 cookie`：不带凭证、cookie 是乱码、Bearer 错 → 401 `unauthorized`，三种情况响应体字节相同（不说明原因）
  - `B0305-T4 token 轮换`：`/?t=<token>` → 302 到 `/`、`Location` 里没有 token、`Set-Cookie` 的属性符合 §5 第 2 条；用这个 cookie 访问 API 200；`Auth.Rotate` 后同一个 cookie 401、旧 token 引导 401；错 token 引导 401 且没有 `Set-Cookie`
  - `B0305-T6 Caller`：cookie 得到 `user:local`、Bearer 得到 `external:anydoorctl`；两者都带时是 cookie；`IsUser` 对这两个为 true，对 `external:其他` 为 false
  - `B0305-T7 安全响应头`：200、302、401、403、404、413、500 的响应都带 `S.02-R8` 的四个头和 `X-Request-Id`，没有任何 `Access-Control-Allow-*`；`Dev` 时 CSP 含 `ws://127.0.0.1:5173`，否则不含
  - `B0305-T8 错误响应`：401、403、404、413、500 的响应体都能按 `schema/errors.schema.json#/$defs/ErrorResponse` 校验通过（用 `santhosh-tekuri/jsonschema/v6`）；`message` 等于文案文件里的句子（413 的 `{limit}` 已替换成 `1MB`）；`request_id` 与响应头一致；500 没有 `details`，响应里找不到 panic 的原文
  - `B0305-T9 请求体大小`：1 MB 的请求体通过，1 MB 加 1 字节 → 413 `too_large`
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `B0305-T5 急停解除权限`：在 `S.09` 的叶子跑（M3）：Bearer 可以解除急停、cookie 可以解除急停、其他方式不行
- 允许使用的依赖：标准库、`github.com/oklog/ulid/v2`、`github.com/goccy/go-yaml`（读文案）、`github.com/santhosh-tekuri/jsonschema/v6`（只在测试里）
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | §5 第 1 条：会话 cookie 一律 30 天（不再区分"保持登录"），值由 `B.07.01` 发 | `P.09` K239 |
| 2026-11-24 | 第 ⑧a 片（`m0-server`）开工前复查：类型改为"实施"（`relay` 只领实施叶子）；并入 `internal/api` 的服务器骨架、中间件链、错误响应写法；错误文案嵌入 `schema/builtin/messages`；`B0305-T5` 改为在 `S.09` 跑；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K241、K242 |
