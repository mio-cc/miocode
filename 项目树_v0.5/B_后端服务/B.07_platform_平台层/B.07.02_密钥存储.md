# B.07.02 密钥存储

| 项 | 内容 |
|---|---|
| 编号 | B.07.02 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引01§5 |
| 最后修改 | 2026-11-24 |

## 1. 职责
密钥存储：优先使用系统密钥库；不可用时使用主密码加密的本地文件。按方法签名实现 `engine.SecretResolver`（`B.07-R1`）。

## 2. 不做什么
- 不在任何地方缓存密钥明文（只在调用 `Resolve` 时读取，`S.03-R3`）
- 不提供"查看完整密钥"（`S.03-R5`）
- 不做修改主密码（以后需要时另加）

## 3. 继承的上级约束
`B.07-R1`–`R6`、`S.03`、INV-22、`P.09` K38。

## 4. 接口
```go
// internal/platform/secret/secret.go
var (
    ErrLocked          = errors.New("secret: 密钥库已锁定，请先解锁")
    ErrNotFound        = errors.New("secret: 没有这个密钥")
    ErrBadName         = errors.New("secret: 密钥名只能用小写字母、数字、下划线，以字母开头，最长 64")
    ErrBadPassword     = errors.New("secret: 主密码不对")
    ErrTooManyAttempts = errors.New("secret: 主密码连续错误 5 次，请 30 秒后再试")
    ErrCorrupt         = errors.New("secret: 加密文件已损坏")
)
type Info struct{ Name, Last4 string; UpdatedAt time.Time }

// Keyring 是系统密钥库的三个操作；缺省是 zalando/go-keyring 的同名函数，测试注入假的。
type Keyring interface {
    Get(service, user string) (string, error)
    Set(service, user, password string) error
    Delete(service, user string) error
}
type Options struct {
    Keyring   Keyring              // nil：系统密钥库
    ForceFile bool                 // 不探测，直接用加密文件（测试和"无桌面"环境）
    Dev       bool                 // --dev：允许 ANYDOOR_DEV_SECRET_<名>（S.03-R8）
    Getenv    func(string) string  // 缺省 os.Getenv
    Now       func() time.Time
    Logger    *slog.Logger
}

type Store struct{ /* 私有 */ }
func Open(ctx context.Context, d datadir.Dir, o Options) (*Store, error)
func (s *Store) Resolve(ctx context.Context, name string) (string, error)   // 满足 engine.SecretResolver
func (s *Store) Put(ctx context.Context, name, value string) error
func (s *Store) Delete(ctx context.Context, name string) error             // 不存在也返回 nil
func (s *Store) List(ctx context.Context) ([]Info, error)                  // 按名字排序；锁定时也能列
func (s *Store) Backend() string                                           // keyring | file
func (s *Store) Locked() bool                                              // 文件后端且没解锁
func (s *Store) Unlock(ctx context.Context, password string) error         // 文件不存在时等于设置主密码
const Service = "AnywhereDoor"
```

## 5. 行为
- **密钥名**：`^[a-z][a-z0-9_]{0,63}$`（`S.03-R2` 的写法），不合法返回 `ErrBadName`（`P.09` K240）。
- **选后端**：`ForceFile` 时直接用文件；否则探测：`Set(Service, "__anydoor_probe__", 随机值)` → `Get` 读回相同 → `Delete`；任何一步失败（例如没有桌面会话的 Linux）记 info 并改用文件后端。
- **系统密钥库**：服务名 `AnywhereDoor`，账户名 = 密钥名。Windows 凭据管理器、macOS 钥匙串、Linux Secret Service。
- **索引** `<DataDir>/secrets.index.json`：`{"<名>": {"last4": "…", "updated_at": "…"}}`，两种后端都维护，`List` 只读它（系统密钥库不能列出条目，`P.09` K240）；值不足 8 个字符时 `last4` 为空串。`Put` 先写密钥再写索引，`Delete` 先删密钥再删索引。
- **加密文件** `<DataDir>/secrets.enc`：JSON `{"v": 1, "kdf": {"alg": "argon2id", "m": 65536, "t": 3, "p": 1, "salt": "<base64>"}, "check": "<base64>", "nonce": "<base64>", "data": "<base64>"}`；`check` 是 `sha256(派生密钥 ‖ "anydoor-secrets-check")`，用来区分"密码不对"和"文件损坏"；主密码 → Argon2id（参数照文件头，新建时 m=64MB、t=3、p=1、16 字节随机盐）→ 32 字节密钥 → XChaCha20-Poly1305 加密整个 `{"<名>": "<值>"}`，附加数据是 `anydoor-secrets-v1`；每次写入用新的随机 nonce；用 `datadir.WritePrivate` 原子写。
- **解锁**：文件后端启动时是锁定的；未解锁时 `Resolve`、`Put`、`Delete` 返回 `ErrLocked`（模型调用失败为 `provider_unavailable`"密钥库已锁定，请先解锁"，由 `E.10` 把这个错误映射过去）。`Unlock`：
  - 文件不存在：用这个密码新建一个空的加密文件（首次设置主密码，前端在首次引导或设置里调用）；密码为空返回错误。
  - 文件存在：派生密钥、比对 `check`；不同返回 `ErrBadPassword`；相同但解密失败返回 `ErrCorrupt`。连续失败 5 次后 30 秒内（按 `Now`）直接返回 `ErrTooManyAttempts`，不再试；成功后计数清零。
  - 解锁后只在内存里保留派生出的密钥，每次 `Resolve` 读文件、解密、取一个值；解密出的整张表用完即丢。
- 忘记主密码只能删除 `secrets.enc`（和索引）重新填写密钥。
- **开发模式**：`Dev` 时 `Resolve` 先看 `ANYDOOR_DEV_SECRET_<名字大写>`，有就用（`S.03-R8`）；非开发模式下设置了这个变量：第一次遇到时记 warn，照常走后端。
- 并发安全（一把锁）。

## 6. 不变量
- 密钥明文只存在于系统密钥库或加密文件里；索引、日志、错误信息里没有
- `List` 不返回密钥值

## 7. 错误处理
见 §4 的哨兵错误；系统密钥库的其他错误包装后返回（不含密钥值）；加密文件损坏：`secret: <路径> 损坏：<原因>`。

## 8. 验收标准
1. 系统密钥库读写删
2. 探测失败切换到文件后端
3. 加密文件往返、密码错误、锁定状态
4. 连续错误 5 次后冷却 30 秒
5. 数据目录里找不到密钥原文（整套模板跑完后的检查是 `S.03` §2 第 1 条，在 `Q` 的安全测试里做）

### 实施卡
- 要建 / 要改的文件：`internal/platform/secret/secret.go`、`internal/platform/secret/file.go`、`internal/platform/secret/keyring.go`、`internal/platform/secret/secret_test.go`、`go.mod`、`go.sum`
- `go.mod` 加 `github.com/zalando/go-keyring`、`golang.org/x/crypto`（`G.10` 已登记）：验证者 `go get` 两个 `@latest` 后 `go mod tidy`；实施者不手改。
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/platform/datadir/`、`internal/platform/auth/`、`internal/platform/config/`、`internal/platform/lock/`
- 测试默认注入假的 `Keyring`（测试文件里用 map 实现），不碰真实系统密钥库；环境变量 `ANYDOOR_KEYRING_TEST=1` 时 `B0702-T1` 另外对真实系统密钥库跑一遍（用 `anydoor_test_` 开头的名字，跑完删掉）。
- 测试用例：
  - `B0702-T1 keyring`：假密钥库上 `Put` / `Resolve` / `List` / `Delete` 往返；`Backend()` 为 `keyring`；名字不合法返回 `ErrBadName`；`Resolve` 不存在的名字返回 `ErrNotFound`；`List` 的 `last4` 正确，短值为空串
  - `B0702-T2 回退`：假密钥库的 `Set` 或 `Get` 返回错误、或读回的值不同，`Backend()` 都是 `file`，且探测条目不留在假密钥库里
  - `B0702-T3 加密文件`：`ForceFile` 下：未解锁时 `Resolve`、`Put` 返回 `ErrLocked`、`Locked()` 为 true、`List` 照样能列；`Unlock` 设置主密码后往返；重新 `Open` 后锁定，正确密码解锁能读到，错误密码返回 `ErrBadPassword`；文件头的 kdf 参数是 m=65536、t=3、p=1；两次写入的 nonce 不同；改坏 `data` 一个字节后正确密码解锁返回 `ErrCorrupt`
  - `B0702-T4 暴力尝试限制`：假时钟下连续 5 次错误密码，第 6 次即使密码正确也返回 `ErrTooManyAttempts`；30 秒后正确密码能解锁，计数清零
  - `B0702-T5 无明文残留`：两种后端各 `Put` 一个 40 字符的随机值，遍历数据目录全部文件，找不到这个值的原文（也找不到它的 base64）
  - `B0702-T6 开发模式`：`Dev` 且设置了 `ANYDOOR_DEV_SECRET_OPENAI_MAIN` 时 `Resolve("openai_main")` 返回环境变量的值；非开发模式时忽略、返回后端的值
- 允许使用的依赖：标准库、`github.com/zalando/go-keyring`、`golang.org/x/crypto`（argon2、chacha20poly1305）
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑦ 片（`m0-platform`）开工前复查：密钥名规则；`List` 改读索引文件 `secrets.index.json`；加密文件格式写全；首次解锁即设置主密码；冷却按注入的时钟；测试默认不碰真实系统密钥库；本叶子把 `go-keyring`、`x/crypto` 加进 `go.mod`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K239、K240 |
