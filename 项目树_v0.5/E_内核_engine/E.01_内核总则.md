# E.01 内核总则

| 项 | 内容 |
|---|---|
| 编号 | E.01 |
| 类型 | 规范 |
| 上级 | E 内核 engine/ |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01, 引03§4 |
| 最后修改 | 2026-11-24 |

> 本文是内核核心接口的**唯一定义**（`P.09` K2）。`引01` §2、`引03` §4、`引_关键决定` 里的三个版本不再使用。

## 1. 包依赖方向
```
                      engine.Engine（engine/engine.go：组装入口）
                                   │
        ┌────────────── run ──────────────┬────────── orch
        │            /   |   \            │         /    \
      sched      exec/*  authz  ext       │       op    tools
        │      /  |   \     \    \        │        |       |
       obs  ctxasm llm tools  schema ◄────┘     schema   mcp
                |          |      |                 |
              schema      blob  graph ◄─────────── graph
                 \                /
                  ────── gen ─────
       store（只依赖 gen）     blob（只依赖标准库）
```
| 包 | 可以 import | 不可以 import |
|---|---|---|
| `graph` | `gen` | 其他所有 engine 包 |
| `schema` | `gen`、`graph` | `op`、`run`、`exec`… |
| `op` | `gen`、`graph`、`schema`、`authz` | `run`、`exec`、`store`（通过接口使用） |
| `authz` | `gen`、`graph` | `op`、`run` |
| `store`、`store/*` | `gen` | 其他 engine 包 |
| `blob` | 标准库 | 全部 engine 包 |
| `obs` | `gen` | `run`、`exec` |
| `llm`、`llm/*` | `gen`、`obs` | `exec`、`run` |
| `tools`、`tools/builtin/*` | `gen`、`blob`、`obs`、`authz` | `exec`、`run` |
| `mcp` | `gen`、`tools` | `exec`、`run` |
| `ctxasm` | `gen`、`schema`、`blob`、`llm`（只用计数接口） | `exec`、`run` |
| `exec`、`exec/*` | `gen`、`graph`、`schema`、`ctxasm`、`llm`、`tools` 的接口、`obs`、`blob`（`RunCtx` 用到 `obs.Usage`、`blob.Reader`） | `run`、`sched`、`store` |
| `sched` | `gen`、`graph`、`obs`、`exec` 的接口 | `exec` 的实现、`run` |
| `run` | 以上全部（除 `orch`） | `internal/**` |
| `orch` | `gen`、`graph`、`op`、`schema`、`authz`、`tools`、`exec`（接口） | `run` 的实现细节 |
| 全部 | — | `internal/**`、`cmd/**`；`net/http`（`llm/*`、`tools/builtin/http`、`tools/builtin/fetch`、`mcp` 例外） |

机器可读版是 `tools/depcheck/rules.yaml`（`G.03.01` §5.3）：上表改了，规则文件同一批改。

## 2. 组装入口
```go
// engine/engine.go
type Deps struct {
    Store    store.Store
    Blobs    blob.Store
    Clock    sched.Clock            // 生产用 sched.RealClock，测试用 sched.NewVirtualClock
    Secrets  SecretResolver         // 由 internal/platform 实现
    Models   llm.Registry
    Tools    tools.Registry
    Pricing  obs.PricingTable
    Logger   *slog.Logger
    Meter    obs.Meter              // 可以为 obs.NopMeter
    Tracer   obs.Tracer             // 可以为 obs.NopTracer
    Instance string                 // 进程实例 ID（租约用）
}

type SecretResolver interface {
    Resolve(ctx context.Context, name string) (string, error)   // 只在发请求的那一刻调用（S.03-R3）
}

type Engine struct{ /* 私有 */ }

func New(d Deps) (*Engine, error)
func (e *Engine) Registry() *schema.Registry
func (e *Engine) Ops() *op.Pipeline
func (e *Engine) Runs() *run.Manager
func (e *Engine) Authz() authz.Checker
func (e *Engine) Orchestrator() *orch.Orchestrator
func (e *Engine) Recover(ctx context.Context) error   // 启动时恢复未完成的运行（E.16.04）
func (e *Engine) Close(ctx context.Context) error     // 优雅关闭：停止派发 → 等待在飞节点到安全点 → 刷事件
```

## 3. 执行器接口（`engine/exec/executor.go`）
```go
type Executor interface {
    Kind() string                                          // NodeDef.impl.entry，原子节点为中文类型名
    Caps() Caps                                            // 声明需要哪些能力
    Validate(n *graph.Node, g *graph.Graph, reg schema.View) []gen.Diag
    Run(rc RunCtx, in Inputs) (Outputs, error)
}

type Caps struct {
    Model    bool   // 需要调用模型：只有 Agent 执行器可以为 true（INV-05，由 E.03.01 注册时检查）
    Tools    bool   // 需要调用工具
    Subgraph bool   // 会执行子图（循环、扇出、子图引用）
    Ask      bool   // 会请求人工
    Ledger   bool
}

// 可选能力
type Resumable interface { Resume(rc RunCtx, in Inputs, cp Checkpoint) (Outputs, error) }
type Cacheable interface { CacheKey(n *graph.Node, in Inputs) (key string, ok bool) }

type Inputs  map[string]Value     // 键为端口名；multi 端口值为 Value{List}（C.04.04）
type Outputs map[string]Value

type Value struct {
    Type     string          `json:"type"`               // 实际数据类型，如 方案@1
    Data     json.RawMessage `json:"data,omitempty"`
    Ref      string          `json:"ref,omitempty"`      // 超过 8KB 转 ws://（E.08）
    Taint    bool            `json:"taint,omitempty"`
    TaintSrc []string        `json:"taint_src,omitempty"`
    Partial  bool            `json:"partial,omitempty"`
}
```

## 4. RunCtx（`engine/exec/runctx.go`）
```go
type RunCtx interface {
    context.Context                                  // 取消、超时、暂停（E.16.06）

    // 位置与配置
    Loc() gen.Loc                                    // C.06.05
    RunID() string
    Node() *graph.Node
    Params() Params                                  // 默认值 ← 实例参数 ← 被提升参数的连线输入
    Seed() int64
    Replaying() bool                                 // 回放中：执行器不得产生任何外部调用（INV-13）

    // 输出与观测
    Emit(port string, v Value) error                 // 流式端口多次调用；阻塞即背压
    Progress(frac float64, note string)
    Log(level slog.Level, msg string, kv ...any)

    // 状态
    Checkpoint(state any) error                      // E.16.03
    LoadCheckpoint(into any) (bool, error)

    // 人与升级
    Ask(req AskRequest) (AskResponse, error)         // 节点进入 waiting，阻塞到有结果（E.14.11.01）
    Escalate(e Escalation) error

    // 预算
    Budget() BudgetView
    Charge(u obs.Usage) error                        // 超预算返回 ErrBudgetExceeded

    // 外部能力（按 Caps 授予；没声明的能力调用时返回 ErrCapDenied）
    LLM(ref gen.ResourceRef) (llm.Client, error)     // 已包好：授权、资源池、重试、计量、录放
    Tool(id string) (tools.Handle, error)            // 已包好：授权、幂等、资源池、裁剪、污染
    Blobs() blob.Reader
    Ledger(scope string) LedgerHandle
    Subgraph(g *graph.Subgraph, in Inputs, opt SubOpts) (Outputs, error)
}

type SubOpts struct {
    Scope    gen.Iter     // 本次子图执行的迭代号（轮次、份号）
    Isolated bool         // 独立的局部账本
    Budget   *obs.Budget  // 从父级划拨的额度
}
```

## 5. 其他核心接口的位置
| 接口 | 定义在 | 文档 |
|---|---|---|
| `store.Store` 及各仓库 | `engine/store/store.go` | `E.07.01` |
| `blob.Store` | `engine/blob/blob.go` | `E.08` |
| `llm.Client`、`llm.Provider` | `engine/llm/llm.go` | `E.10.01` |
| `tools.Impl`、`tools.Handle`、`tools.Registry` | `engine/tools/tool.go` | `E.11.01` |
| `authz.Checker` | `engine/authz/check.go` | `E.06.02` |
| `sched.Clock` | `engine/sched/clock.go` | `E.15.04` |

## 6. 规则
- **E.01-R1** 执行器**不得**直接访问 store、HTTP、文件系统、环境变量、全局变量；一切外部能力从 `RunCtx` 拿（便于测试和回放）。
- **E.01-R2** 执行器返回的错误必须用 `exec.Fail(class, err)` 包装，`class` 取 `C.11` §4（`G.05.01-R9`）。
- **E.01-R3** 执行器不修改节点状态（`C.07-R4`）；状态只由调度器根据执行器的返回和 `RunCtx` 调用推进。
- **E.01-R4** `Replaying()` 为真时，`LLM()`、`Tool()` 返回录放包装：直接给出事件日志里记录的结果，不发真实请求（INV-13）。执行器本身不需要判断回放，除了编排者（`E.17.04`）。
- **E.01-R5** 接口变更是契约变更：按 `C.01` §5.2 的破坏性修改流程走，并同步本文。

### 实施卡
- 要建的文件：`engine/engine.go`、`engine/doc.go`、`engine/exec/executor.go`、`engine/exec/runctx.go`、`engine/exec/value.go`、`engine/exec/errors.go`。§1 表格的机器可读版 `tools/depcheck/rules.yaml` 和它的测试归 `G.03.01`（`P.09` K254）。
- 测试用例：`E01-T1`（depcheck 对故意违规的包报错）移到 `G.03.01` 的 `G0301-T3`；`E01-T2` `Engine.New` 缺少必需依赖时返回明确错误；`E01-T3` 没声明 `Caps.Model` 的执行器调用 `rc.LLM` 返回 `ErrCapDenied`。
- 允许使用的依赖：标准库、`gen`。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | §1 表补全 `exec`（`obs`、`blob`）、`sched`（`exec` 的接口）、`orch`（`gen`、`graph`）、`mcp`（`gen`），与 §3、§4 的接口一致；机器可读版 `rules.yaml` 和 `E01-T1` 移到 `G.03.01` | `P.09` K254 |
