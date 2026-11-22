# E.10.09 重试、超时与限流

| 项 | 内容 |
|---|---|
| 编号 | E.10.09 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引05 |
| 最后修改 | 2026-11-22 |

## 1. 职责
在模型 Client 外面包一层：资源池（并发 + 速率）、熔断、重试与退避、超时、计量、录放、事件记录。

## 2. 不做什么
- 不做授权判定（`RunCtx.LLM` 在拿 Client 之前判定）

## 3. 继承的上级约束
`引05` §5、`E.15.02`、`E.15.03`、`E.09.03`、INV-13。

## 4. 接口
调用链（由外到内）：
```
预算预留 → 资源池（并发 + 令牌桶，E.15.02/03） → 熔断 → 重试 → 超时 → 提供方
         ↘ 计量（用量、费用、延迟） → 写 llm.call 事件（请求和响应存工作区） → 预算结算
```
```go
func Wrap(c llm.Client, opt WrapOpts) llm.Client   // 由 RunCtx.LLM 调用
type WrapOpts struct {
    Pool      *sched.Pool
    Breaker   *Breaker       // 每个 provider+model 一个，自研（P.09 K33）
    Retry     RetryCfg       // 默认 Max 3、Base 1s、MaxDelay 30s、Jitter 0.2
    Timeout   time.Duration  // 默认 120s
    Account   *obs.Account
    Events    obs.Writer
    Loc       gen.Loc
    Replaying bool           // true 时直接从事件日志取录制的响应
}
```

## 5. 行为
- 重试只对 transient、rate_limited 生效；429 优先用 Retry-After，并把该资源池速率临时下调 20%，5 分钟后恢复。
- 流式中途断开：重试整个请求，不续传。
- 熔断：60 秒内错误率 > 50% 且请求 ≥ 20 → 打开 30 秒；打开期间直接失败为 transient；资源节点配置了 `fallback` 模型时自动切换，并写 `llm.fallback`。
- 回放：`Replaying=true` 时按 `(exec_key, 调用序号)` 取 `llm.call` 事件的 `resp_ref`，不发请求（INV-13）。

## 6. 不变量
- 每次真实调用都有且只有一条 `llm.call` 事件
- 回放时发出的网络请求数为 0

## 7. 错误处理
重试耗尽：返回最后一次的错误；熔断打开：transient；超预算：`ErrBudgetExceeded`。

## 8. 验收标准
1. 429 退避并下调速率
2. 熔断打开与恢复（虚拟时钟）
3. 回放零请求
4. 并发调用不超过资源池上限

### 实施卡
- 要建 / 要改的文件：`engine/llm/wrap.go`、`engine/llm/breaker.go`、`engine/llm/retry.go`、`engine/llm/wrap_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1009-T1 重试分类`
  - `E1009-T2 429 降速`
  - `E1009-T3 熔断`
  - `E1009-T4 回放零请求`
  - `E1009-T5 资源池上限`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
