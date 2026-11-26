# E.10.09 重试、超时与限流

| 项 | 内容 |
|---|---|
| 编号 | E.10.09 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引05 |
| 最后修改 | 2026-11-26 |

## 1. 职责
在模型 Client 外面包一层：资源池（并发 + 速率）、熔断、重试与退避、换密钥、故障转移到备用提供方，并把每次真实调用交给调用方记录（`llm.call`）。

## 2. 不做什么
- 不做授权判定（`RunCtx.LLM` 在拿 Client 之前判定）
- 不写事件、不存请求和响应：通过 `Hooks` 交给调用方（`E.14.02` 写 `llm.call`、`node.throttled`、`llm.fallback`，请求和响应存工作区）
- 不再加超时：整个请求的时限已在 `E.10.01`（提供方的 `timeout_s`）
- 回放（INV-13，从事件日志取录制的响应）在 M2 随检查点续跑做；预算预留与结算在 M2 随账本做（`P.09` K268）

## 3. 继承的上级约束
`引05` §5、`E.15.02`、`E.15.03`、`E.10.10`、INV-05、`P.09` K268。

## 4. 接口
调用链（由外到内）：
```
故障转移（主提供方 → 备用提供方）→ 选密钥（E.10.10）→ 资源池 → 熔断（拿到名额之后、发请求之前判断）→ 提供方（E.10.01）→ 失败时退避重试
```
```go
// engine/llm/wrap.go
type Limiter interface {                        // *sched.Pool 满足它
    Acquire(ctx context.Context, onWait func(waiting int64)) (release func(), err error)
    Penalize(factor float64, d time.Duration)
}
type Source interface {                         // *Registry 满足它
    Client(provider, model string) (Client, error)
    ClientWithKey(provider, model, key string) (Client, error)
    Keys(provider string) []string
    Fallbacks(provider string) []string
}
type Target struct{ Provider, Model string }
func (t Target) Pool() string                   // llm:<provider>/<model>
type CallRecord struct {
    Target  Target
    Key     string        // 密钥名（不是原文）；没有多密钥时为空
    Attempt int           // 这个提供方上的第几次真实调用（从 1 起）
    Req     Req
    Resp    *Resp         // 失败时为 nil
    Err     *Error
    Latency time.Duration
}
type Hooks struct {
    OnCall     func(ctx context.Context, r CallRecord)              // 每次真实调用恰好一次
    OnWait     func(pool string, waiting int64)                     // 在资源池排队
    OnFallback func(ctx context.Context, from, to Target, reason *Error)
}
type WrapOpts struct {
    Source   Source
    Pools    func(t Target) Limiter   // nil 或返回 nil：不限
    Breakers *Breakers                // nil：不熔断
    Keys     *KeyRing                 // nil：不换密钥
    Retry    RetryCfg                 // 零值用 DefaultRetry
    Now      func() time.Time         // 必填
    Sleep    func(ctx context.Context, d time.Duration) error   // 必填；ctx 取消时返回它的错误
    Rand     func() float64           // [0, 1)，给抖动用；nil：不抖动
    Hooks    Hooks
}
func Wrap(t Target, o WrapOpts) (Client, error)   // 由 RunCtx.LLM 调用；Caps 是主提供方的

// engine/llm/retry.go
type RetryCfg struct { Max int; Base, MaxDelay, MaxRetryAfter time.Duration; Jitter float64 }
var DefaultRetry = RetryCfg{Max: 3, Base: time.Second, MaxDelay: 30 * time.Second, MaxRetryAfter: 2 * time.Minute, Jitter: 0.2}

// engine/llm/breaker.go
type BreakerCfg struct { Window time.Duration; MinRequests int; ErrorRate float64; Open time.Duration }
var DefaultBreaker = BreakerCfg{Window: time.Minute, MinRequests: 20, ErrorRate: 0.5, Open: 30 * time.Second}
type Outcome int // Success | Failure | Neutral
func NewBreakers(c BreakerCfg) *Breakers          // 每个 Target 一个，自研（P.09 K33）
func (b *Breakers) For(t Target) *Breaker
func (b *Breaker) Allow(now time.Time) bool
func (b *Breaker) Record(now time.Time, o Outcome)
func (b *Breaker) State(now time.Time) string     // closed | open | half_open
const CodeCircuitOpen = "circuit_open"
```

## 5. 行为
- **真实调用**：拿到 Client、在资源池拿到名额之后的一次 `Complete`（请求发出）。成功时在流结束（`Done`）或调用方提前 `Close` 时回调 `OnCall`；失败时立刻回调。熔断、所有密钥都在冷却、ctx 取消时没有发出请求，不回调。
- **第一个片段之前失败**（`Complete` 出错或第一次 `Next` 出错）：按下面的规则重试或换密钥。**交出第一个片段之后**再断开：把错误原样交给调用方，由它整次重来（`E.14.02`），这一层不续传。
- **重试**：只对 `transient`、`rate_limited`；最多一共 `Max` 次真实调用（换密钥不算）。等待：`rate_limited` 且有 `Retry-After` → 等那么久（超过 `MaxRetryAfter` 就不等，当作这个提供方失败）；否则 `Base × 2^(已重试次数)`，不超过 `MaxDelay`，再乘 `1 + Jitter × (2 × Rand() − 1)`。
- **429 降速**：`rate_limited` 且要退避时，资源池 `Penalize(0.8, 5 分钟)`（`E.15.03`）。
- **换密钥**（`E.10.10`）：提供方写了 `keys` 时每次真实调用前选一个；`rate_limited`、`auth_denied` 时把这个密钥冷却（`CoolFor`），还有别的密钥没试过就马上换一个再试，不等待、不算重试次数；都试过了按重试规则处理（`auth_denied` 不重试，直接转移）。
- **熔断**：每个 Target 一个。60 秒窗口内请求 ≥ 20 且失败率 > 50% → 打开 30 秒；打开期间直接失败（`transient`、`CodeCircuitOpen`）；30 秒后半开，只放一个试探请求：成功关闭，失败再打开 30 秒。`transient`、`rate_limited` 算失败；成功算成功；其他（`user_input`、`format_invalid`、`cancelled` 等）不计（半开时放下一个试探）。
- **故障转移**：主提供方最后失败的分类是 `transient`、`rate_limited`、`auth_denied` 时，按 `Source.Fallbacks` 的顺序换备用提供方（模型 id 相同），每换一次回调 `OnFallback`；备用提供方没有这个模型时跳过。只转一层：备用提供方自己的 `fallback` 不再跟。
- ctx 取消：立刻返回 `cancelled`；等待中的 `Sleep` 也立刻返回。

## 6. 不变量
- 每次真实调用恰好一次 `OnCall`
- 同一个 Target 同时在飞的调用数不超过资源池的上限

## 7. 错误处理
重试耗尽：返回最后一次的错误；熔断打开：`transient`（`CodeCircuitOpen`）；所有密钥都在冷却：`rate_limited`（`CodeKeysCooling`，`RetryAfter` 是最早恢复的剩余时间）。

## 8. 验收标准
1. 429 退避并下调速率
2. 熔断打开与恢复（注入时间）
3. 每次真实调用恰好一次记录
4. 并发调用不超过资源池上限
5. 换密钥与故障转移

### 实施卡
- 要建 / 要改的文件：`engine/llm/wrap.go`、`engine/llm/breaker.go`、`engine/llm/retry.go`、`engine/llm/wrap_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/blob/`、`engine/obs/`、`engine/llm/` 下其他已有文件
- 测试用例：
  - `E1009-T1 重试分类`：`transient` 重试到一共 3 次、等待 1s、2s；`user_input`、`format_invalid` 不重试；抖动（`Rand` 恒为 0 时 × 0.8）；`MaxDelay` 封顶；交出第一个片段之后的错误不重试
  - `E1009-T2 429 降速`：`Retry-After` 7 秒时等 7 秒并 `Penalize(0.8, 5m)`；`Retry-After` 超过 `MaxRetryAfter` 时不等、直接失败
  - `E1009-T3 熔断`：20 次里 11 次失败 → 打开、`Allow` 为 false；30 秒后只放一个试探；成功关闭、失败再打开；`Neutral` 不计；经 `Wrap` 调用时打开状态不发请求、返回 `CodeCircuitOpen`
  - `E1009-T4 记录`：成功、失败、提前 `Close` 各恰好一次 `OnCall`，`Attempt`、`Key`、`Latency` 对；熔断和 ctx 取消时没有记录
  - `E1009-T5 资源池上限`：用 `sched.Pool`（上限 2）并发 10 次调用，同时在飞不超过 2；排队时 `OnWait` 收到池名
  - `E1009-T6 换密钥与故障转移`：密钥 a 返回 429 → 冷却、马上用 b 成功，没有等待；所有密钥冷却 → 转到备用提供方，`OnFallback` 一次；`user_input` 不转移；备用提供方没有这个模型时跳过
- 允许使用的依赖：标准库、`gen`；测试另用 `engine/llm/fake`、`engine/sched`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ⑤a 片（`m1-llm`）开工前复查：职责改为资源池、熔断、重试、换密钥、故障转移；资源池、提供方来源用本包的接口（`llm` 只依赖 `gen`、`obs`）；事件和存储交给调用方的 `Hooks`；时间注入；超时已在 `E.10.01`；回放、预算推到 M2；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K268 |
| 2026-11-26 | 状态改为"冻结"：第 ⑤a 片（`m1-llm`） squash 合并进代码仓库 `main`，提交 `cbf6568cb2822f9e406be96e3de91d1a71251fa8`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合（`-race` 留给 Linux CI）；按 `G.08-R3` 由验证者合并 |
