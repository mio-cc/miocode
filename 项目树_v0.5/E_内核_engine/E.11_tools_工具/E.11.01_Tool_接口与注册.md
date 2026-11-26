# E.11.01 Tool 接口与注册

| 项 | 内容 |
|---|---|
| 编号 | E.11.01 |
| 类型 | 实施 |
| 上级 | E.11 tools 工具 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引01§2 |
| 最后修改 | 2026-11-26 |

## 1. 职责
定义工具接口、注册表，以及调用包装 `Handle`：幂等查询 → 授权 → 意图 → 资源池 → 超时 → 调用 → 裁剪 → 记录。

## 2. 不做什么
- 不实现具体工具（`E.11.03`–`E.11.08`、`E.12`）
- 不写事件、不直接用存储和资源池：`tool.intent`、`tool.call` 通过 `Hooks` 交给调用方写；工具调用表、资源池用本包的 `Ledger`、`Limiter` 接口，第 ⑥ 片在组装处接上 `store.ToolCallRepo`、`*sched.Pool`（`tools` 只能依赖 `gen`、`blob`、`obs`、`authz`，`P.09` K271）
- M1 不做（`P.09` K271）：回放（INV-13，M2 随检查点续跑）；非幂等工具崩溃后转人工确认（M2 人工节点）；授权的 `ask`、`propose`（M3，M1 的 `authz.Fixed` 一律放行）

## 3. 继承的上级约束
INV-09、INV-14、INV-16、`S.04` §3、`E.11-R1`–`R3`、`E.11.02`。

## 4. 接口
```go
// engine/tools/tool.go
type Risk uint8                                  // RiskL0 … RiskL3
func ParseRisk(s string) (Risk, error)           // "L0" … "L3"
func (r Risk) String() string
func (r Risk) Action() gen.Action                // gen.ActToolL0 …
type Def struct {
    ID           string          // builtin:ws_read | mcp:<服务>/<工具> | ext:<包>/<节点> | skill:<名>
    Name         string          // 给模型看的名字 ^[a-z0-9_]{1,64}$
    Description  string
    Input        json.RawMessage // 参数的 JSON Schema
    Risk         Risk            // 注册时声明，不能低于 S.04 §3 的下限
    Idempotent   bool            // 外部系统本身支持幂等键
    Timeout      time.Duration   // 0 = 60 秒
    Pool         string          // "" = tool:<ID>
    TaintsResult bool            // 结果含外部内容（检索、HTTP、文件读、ws_read、MCP → true）
}
type Call struct { Args json.RawMessage; IdemKey string; Taint bool }
type Impl interface { Def() Def; Invoke(ctx context.Context, c Call) (Raw, error) }

// engine/tools/registry.go
type Registry struct{ /* 读多写少，带锁 */ }
func NewRegistry() *Registry
func (r *Registry) Register(i Impl) error        // 校验 ID、Name、Risk 下限、ID 不重复
func (r *Registry) Get(id string) (Impl, bool)
func (r *Registry) List() []Def                  // 按 ID 排序
var MinRisk = map[string]Risk{"builtin:ws_read": RiskL0}   // S.04 §3；内置工具加一个就加一行

// engine/tools/idem.go
func IdemKey(runID, execKey, scope string, args json.RawMessage) (string, error)   // sha256 十六进制；args 先规范化（键排序、去空白）
type Record struct {
    IdemKey, RunID, ExecKey, Tool string
    Risk                          Risk
    Status                        string    // started | succeeded | failed（同 store.ToolCall）
    ArgsRef, ResultRef            blob.Ref
    StartedAt                     time.Time
}
type Ledger interface {                          // 第 ⑥ 片用 store.ToolCallRepo 的适配器接上
    Begin(ctx context.Context, r Record) (existing *Record, err error)
    Finish(ctx context.Context, idemKey, status string, resultRef blob.Ref, endedAt time.Time) error
}

// engine/tools/handle.go
type Limiter interface { Acquire(ctx context.Context, onWait func(waiting int64)) (release func(), err error) }   // *sched.Pool 满足
type Intent struct { IdemKey, Tool string; Risk Risk; ArgsRef blob.Ref }
type CallRecord struct {
    IdemKey, Tool string; Risk Risk
    Status   string                  // succeeded | failed | deduplicated
    ArgsRef, ResultRef blob.Ref
    Taint    bool
    Queued, Latency time.Duration
    Err      *Error
}
type Hooks struct {
    OnIntent func(ctx context.Context, in Intent)        // 写 tool.intent
    OnCall   func(ctx context.Context, r CallRecord)     // 写 tool.call（每次 Call 恰好一次）
    OnWait   func(pool string, waiting int64)            // 资源池排队（node.throttled）
}
type Env struct {
    RunID, ExecKey, Scope string           // Scope：直接调用为空，Agent 内调用为 turn/index
    Actor   gen.Actor
    Authz   authz.Checker
    Ledger  Ledger
    Blobs   blob.Store
    Pool    func(name string) Limiter      // nil 或返回 nil：不限
    Counter Counter
    Trim    TrimOpts
    Hooks   Hooks
    Now     func() time.Time               // nil = time.Now
}
type Handle interface { Def() Def; Call(ctx context.Context, args json.RawMessage, taint bool) (Result, error) }
func NewHandle(i Impl, env Env) Handle    // 执行器通过 RunCtx.Tool 拿到它（第 ⑥ 片）
```

## 5. 行为
`Handle.Call`：
1. `key = IdemKey(run_id, exec_key, scope, args)`；参数原文写进工作区得到 `ArgsRef`。
2. `Ledger.Begin(Record{started})`：
   - 已有 `succeeded`：从 `ResultRef` 读出上次的 `Result` 返回，`OnCall` 的 `Status` 为 `deduplicated`，不调用工具。
   - 已有 `started`（上次在调用中崩溃）：`Idempotent` 为真时带同一个键继续调用；否则返回 `*Error{user_input, "tool_maybe_executed"}`"工具「X」上次调用可能已经执行过，M1 不自动重发；确认后重新运行"（转人工在 M2）。
   - 已有 `failed`：返回 `*Error{transient, "tool_failed_before"}`（同一个键上次已失败；重试时运行会换执行键）。
3. 授权：`Authz.Check(Request{Actor, Action: Risk.Action(), Target{Scope}, Taint})`；`deny`、`ask`、`propose` 都返回 `auth_denied`（M1 不会出现 `ask`、`propose`）。
4. L1 及以上：`OnIntent`（INV-14）。
5. 资源池 `Acquire`（池名 `Def.Pool`，默认 `tool:<ID>`）；L2、L3 拿到名额后、调用前再判定一次授权（`S.04-R6`）。
6. 超时 context（`Def.Timeout`，默认 60 秒）→ `Invoke`（`Call.IdemKey` 带上幂等键）。
7. 成功：`Trim`（`E.11.02`，选项 `Env.Trim`）；`Taint = 输入污染 || Def.TaintsResult`，`TaintSrc` = `Raw.Sources`（只在 `TaintsResult` 时）；`Result` 的 JSON 写进工作区作 `ResultRef`；`Ledger.Finish(succeeded)`；`OnCall`。
8. 失败：`Ledger.Finish(failed)`；`OnCall`；返回 `*Error`。

## 6. 不变量
- L1 及以上的每次真实调用之前都有 `OnIntent`
- 同一个幂等键的成功调用只会真实执行一次
- 每次 `Call` 恰好一次 `OnCall`

## 7. 错误处理
`Invoke` 返回 `*Error` 时用它的类别；`context.DeadlineExceeded` → `timeout`；调用方取消 → `cancelled`；其他错误 → `transient`。错误信息里不带密钥和完整参数（只带工具 ID 和参数的前 8 位哈希）。注册失败返回普通 error（ID、Name 不合法，风险低于下限，ID 重复）。

## 8. 验收标准
1. 重复调用同一幂等键只执行一次
2. 崩溃在调用中后恢复：幂等工具重发，非幂等工具报错不重发
3. 风险等级低于下限的注册被拒
4. L2、L3 发出前再判定一次授权
5. 回放（M2，`P.09` K271）

### 实施卡
- 要建 / 要改的文件：`engine/tools/tool.go`、`engine/tools/registry.go`、`engine/tools/idem.go`、`engine/tools/handle.go`、`engine/tools/handle_test.go`、`engine/tools/fake/fake.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1101-T1 幂等去重`：同一参数调两次只 `Invoke` 一次，第二次 `OnCall` 为 `deduplicated`、结果相同；参数键顺序不同也算同一键
  - `E1101-T2 崩溃恢复`：账本里已有 `started` 时，幂等工具带同一键重发，非幂等工具返回 `tool_maybe_executed` 且不调用
  - `E1101-T3 风险下限`：`builtin:ws_read` 声明 L0 能注册；把下限表里的工具声明得更低被拒；ID、Name 不合法、重复注册被拒
  - `E1101-T5 发出前再判定`：L0 判定 1 次、L2 判定 2 次；第二次 `deny` 时不调用、返回 `auth_denied`；L1 有 `OnIntent`、L0 没有
  - `E1101-T6 失败与记录`：超时 → `timeout`；`*Error` 的类别原样保留；失败时 `Ledger` 记 `failed`、`OnCall` 恰好一次且错误信息不含参数原文；污染标记按输入和 `TaintsResult` 合并
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ⑤b 片（`m1-tools-ctx`）开工前复查：依赖方向：账本、资源池、token 计数用本包接口，事件交给 `Hooks`；结果类型挪到 `E.11.02`；回放、转人工、`ask` 推到后面的里程碑（`E1101-T4` 回放推到 M2，加 `E1101-T6`）；写明重复键三种情况；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K271 |
