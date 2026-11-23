# B.07.01 本地鉴权

| 项 | 内容 |
|---|---|
| 编号 | B.07.01 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引15 |
| 最后修改 | 2026-11-24 |

## 1. 职责
生成和保存本机 token；发放、校验、作废会话 cookie 的值（服务端只存哈希）。

## 2. 不做什么
- 不做 HTTP 层的事：设 cookie 头、`/?t=` 引导、Host / Origin 校验、401（`B.03.05`，第 ⑧ 片）
- 不读写数据库：会话存在调用方传进来的键值仓库里（`B.07-R1`）

## 3. 继承的上级约束
`B.07-R1`–`R6`、`S.02-R2`、`R3`、`B.03.05` §5 第 1、6 条。

## 4. 接口
```go
// internal/platform/auth/auth.go
// KV 是会话的存放处；组装时传 store.Store.Settings()（E.07.01 的 SettingsRepo 满足它）。
type KV interface {
    Get(ctx context.Context, key string) (json.RawMessage, bool, error)
    Put(ctx context.Context, key string, value json.RawMessage, at time.Time) error
}
type Options struct {
    Now         func() time.Time   // 缺省 time.Now
    MaxSessions int                // ≤ 0 时为 100
}
const (
    CookieName = "hx_session"
    SessionTTL = 30 * 24 * time.Hour   // 一律 30 天（P.09 K239）
    SessionsKey = "auth.sessions"      // KV 里的键
)

type Auth struct{ /* 私有 */ }
func Open(ctx context.Context, d datadir.Dir, kv KV, o Options) (*Auth, error)
func (a *Auth) Token() string
func (a *Auth) VerifyToken(t string) bool
func (a *Auth) Rotate(ctx context.Context) (string, error)                          // 新 token，作废全部会话
func (a *Auth) NewSession(ctx context.Context) (cookie string, expires time.Time, err error)
func (a *Auth) VerifySession(cookie string) bool

// ReadToken 只读 token 文件（anydoorctl 用，B.08）；文件不存在或格式不对返回错误。
func ReadToken(d datadir.Dir) (string, error)
```

## 5. 行为
- **token**：32 字节 `crypto/rand`，`base64.RawURLEncoding`（43 个字符）。`Open` 时读 `d.Token()`：不存在就生成并 `datadir.WritePrivate`（内容是 token 加换行）；存在就读出，去掉首尾空白后必须能解码成 32 字节，否则返回错误。
- `VerifyToken`：`crypto/subtle.ConstantTimeCompare`；空串、长度不对一律 false。
- `Rotate`：生成新 token 写文件，清空全部会话并写回 KV；返回新 token。
- **会话**：cookie 值是 32 字节随机数的 `base64.RawURLEncoding`；服务端只保存 `sha256` 的十六进制和过期时间。KV 里 `auth.sessions` 的值是 `{"<sha256 hex>": "<过期时间 RFC 3339 UTC 毫秒>", …}`。
  - `Open` 时读出，去掉已过期的；`NewSession` 过期时间 = `Now() + SessionTTL`，加入后超过 `MaxSessions` 时删掉最早过期的，然后写回 KV。
  - `VerifySession`：算哈希查内存里的表，过期时间晚于 `Now()` 为有效；不写 KV。
  - 并发安全（一把锁）。
- `anydoorctl` 用 `ReadToken` 读 token，以 `Authorization: Bearer` 访问（`B.08`）。

## 6. 不变量
- token 和 cookie 原值不写进日志、错误信息、KV
- token 比较使用常量时间

## 7. 错误处理
token 文件读不了：`auth: 读不了 <路径>：<原错误>，请检查数据目录权限`；内容不对：`auth: <路径> 内容不是有效的 token，删除它后重启会重新生成`；KV 读写失败原样包装返回。

## 8. 验收标准
1. 首次生成、再次启动读取相同 token
2. 轮换后旧 token、旧 cookie 都失效
3. 会话 30 天过期、重开后仍有效
4. token 文件权限只有当前用户

### 实施卡
- 要建 / 要改的文件：`internal/platform/auth/auth.go`、`internal/platform/auth/auth_test.go`
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/platform/datadir/`、`internal/platform/secret/`、`internal/platform/config/`、`internal/platform/lock/`
- 测试用 KV 在测试文件里用 map 实现（不 import `engine/store`）。
- 测试用例：
  - `B0701-T1 生成与读取`：新目录 `Open` 生成 43 个字符的 token，文件内容是 token 加换行；再次 `Open` 和 `ReadToken` 得到同一个；文件里写入乱码时 `Open` 返回错误
  - `B0701-T2 轮换`：`Rotate` 后旧 token `VerifyToken` 为 false、新的为 true；轮换前发的 cookie 失效；用同一个 KV 重新 `Open`，旧 cookie 仍失效
  - `B0701-T3 文件权限`：token 文件权限只有当前用户（同 `B0705-T2` 的判断方法，用 `datadir` 包导出的检查函数或在测试里自己查）
  - `B0701-T4 会话过期与持久化`：假时钟下 `NewSession` 的过期时间是 30 天后；29 天时有效、30 天加 1 毫秒时无效；用同一个 KV 重新 `Open` 后未过期的仍有效、过期的已从 KV 里删掉；`MaxSessions` 为 3 时发第 4 个，最早过期的那个失效；KV 里只有哈希，找不到 cookie 原值
  - `B0701-T5 错误输入`：`VerifyToken("")`、长度不对、改了一个字符的 token 都是 false；`VerifySession("")`、乱码都是 false
- 允许使用的依赖：标准库、`golang.org/x/sys`（只在测试查 Windows 权限时）
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑦ 片（`m0-platform`）开工前复查：会话一律 30 天（用户决定）；不再"浏览器关闭即失效"；会话存在调用方传入的 KV 里；接口加 `Open`、`ReadToken`、常量；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K239、K240 |
| 2026-11-24 | 状态改为"冻结"：第 ⑦ 片（`m0-platform`）squash 合并进代码仓库 `main`，提交 `4585c9e928fed58c90b0a70cb8e4b08a5248533a`（`G.02.06-R21`） | `relay slice` 通过；评审 9 条全部符合；按 `G.08-R3` 由验证者合并 |
