# B.03.05 本机鉴权

| 项 | 内容 |
|---|---|
| 编号 | B.03.05 |
| 类型 | 规范 |
| 上级 | B.03 HTTP API 总则 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现本机鉴权：token 换会话 cookie、Bearer token（命令行用）、Host 与 Origin 校验、安全响应头。

## 2. 不做什么
- 不实现 token 的生成和存储（`B.07.01`）

## 3. 继承的上级约束
`S.02`（全部规则）、INV-21、`B-R2`。

## 4. 接口
```go
// internal/api/auth.go
func (s *Server) authMiddleware(next http.Handler) http.Handler
func (s *Server) handleBootstrap(w http.ResponseWriter, r *http.Request)   // GET /?t=<token>
type Caller struct { Actor gen.Actor; Via string }                        // Via: cookie | bearer
func CallerFrom(ctx context.Context) Caller
```

## 5. 行为
1. **引导**：浏览器打开 `/?t=<token>`：常量时间比较 token → 设置 cookie `hx_session`（随机 32 字节，服务端内存 + `hx_settings` 记录，HttpOnly、SameSite=Strict、Path=/、无 Expires 即会话 cookie；"保持登录"另设 30 天）→ 302 到 `/`（去掉 URL 里的 token）。
2. **API 请求**：cookie 有效 → `Caller{Actor: user:local, Via: cookie}`；或 `Authorization: Bearer <token>` 有效 → `Caller{Actor: external:anydoorctl, Via: bearer}`；否则 401。
3. **Host 校验**（`S.02-R5`）：只接受 `127.0.0.1:<端口>`、`localhost:<端口>`、`[::1]:<端口>`。
4. **Origin 校验**（`S.02-R6`）：非 GET 请求和 SSE 请求的 Origin 必须是上面三个之一；Origin 缺失只允许 Bearer 方式。
5. **只有用户能做的接口**（解除急停、设置锁、改授权书等）再检查 `Caller.Actor.Kind == user`；`anydoorctl estop release` 例外：命令行代表用户本人，`Via: bearer` 的 `external:anydoorctl` 对这几个接口视同用户（`S.09-R2`），其他 external 调用方没有这个权利。
6. token 重新生成后，所有旧 cookie 失效（`S.02-R2`）。

## 6. 不变量
- 没有任何不经过鉴权就能修改状态的接口
- token 比较使用常量时间

## 7. 错误处理
失败一律 401 / 403，不说明是 token 错还是 cookie 错（避免信息泄露）。

## 8. 验收标准
1. `S.02` §2 四条用例
2. token 换 cookie 后 URL 里不再有 token
3. token 重新生成后旧 cookie 失效
4. Bearer 可以解除急停、cookie 可以解除急停、其他方式不行

### 实施卡
- 要建 / 要改的文件：`internal/api/auth.go`、`internal/api/headers.go`、`internal/api/auth_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0305-T1 Origin`
  - `B0305-T2 Host 重绑定`
  - `B0305-T3 无 cookie`
  - `B0305-T4 token 轮换`
  - `B0305-T5 急停解除权限`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
