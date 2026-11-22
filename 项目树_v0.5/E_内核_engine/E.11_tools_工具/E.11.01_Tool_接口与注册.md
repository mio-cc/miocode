# E.11.01 Tool 接口与注册

| 项 | 内容 |
|---|---|
| 编号 | E.11.01 |
| 类型 | 实施 |
| 上级 | E.11 tools 工具 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§2 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义工具接口、注册表，以及调用包装 `Handle`（授权 → 幂等查询 → 意图事件 → 资源池 → 超时 → 调用 → 裁剪 → 记录）。

## 2. 不做什么
- 不实现具体工具（`E.11.03`–`E.11.07`、`E.12`）

## 3. 继承的上级约束
INV-09、INV-14、INV-16、`S.04` §3、`E.11-R1`–`R3`。

## 4. 接口
```go
type Risk uint8 // L0 L1 L2 L3
type Def struct {
    ID          string          // builtin:search | mcp:<服务>/<工具> | ext:<包>/<节点> | skill:<名>
    Name        string          // 给模型看的名字 [a-z0-9_]{1,64}
    Description string
    Input       json.RawMessage
    Risk        Risk            // 注册时声明，不能低于 S.04 §3 下限；实例只能调高
    Idempotent  bool            // 外部系统本身支持幂等键
    Timeout     time.Duration
    Pool        string          // 默认 tool:<ID>
    TaintsResult bool           // 结果是否含外部内容（检索、HTTP、文件读、MCP → true）
}
type Call struct { Args json.RawMessage; IdemKey string; Taint bool; Caller gen.Loc }
type Result struct {
    Summary  string             // ≤ 300 字
    Snippets []Snippet
    Data     json.RawMessage
    Ref      string             // 原文引用，必有（keep_pointer kernel 锁）
    Taint    bool
    TaintSrc []string
    Bytes    int
}
type Impl interface { Def() Def; Invoke(ctx context.Context, c Call) (Result, error) }
type Registry interface {
    Register(i Impl) error
    Get(id string) (Impl, bool)
    List(f Filter) []Def
}
type Handle interface { Def() Def; Call(args json.RawMessage, taint bool) (Result, error) }   // 由 RunCtx.Tool 返回
```

## 5. 行为
`Handle.Call`：
1. `key = sha256(run_id | exec_key | attempt_scope | 规范化 args)`（`attempt_scope`：直接调用为空，Agent 内调用为 `turn/index`）。
2. 回放中：从 `hx_tool_calls` 取录制结果返回（INV-13）。
3. `ToolCalls().Begin(key)`：已有 `succeeded` → 直接返回记录结果，写 `tool.call{status: deduplicated}`；已有 `started` 无结果（上次崩溃在调用中）→ `Idempotent` 为真时带同一键重发，否则转人工确认"上次可能已执行，是否重发？"（`引05` §11）。
4. `authz.Check(tool.Lx, target{Tool: ID}, taint)`：deny → `auth_denied`；ask → `rc.Ask(kind: tool)`，驳回 → `auth_denied`。L2、L3 即使之前判定过，也在发出前再判定一次（`S.04-R6`）。
5. 写 `tool.intent`（L1 及以上）。
6. 资源池 Acquire → 超时 context → `Invoke`（请求头带 `Idempotency-Key`，支持时）。
7. 裁剪（`E.11.02`）、污染标记（`E.06.03`）→ `Finish(key, succeeded)` → 写 `tool.call`。

## 6. 不变量
- L1 及以上的每次真实调用之前都有 `tool.intent`
- 同一个幂等键的成功调用只会真实执行一次

## 7. 错误处理
工具错误按类别：网络 → transient；4xx → user_input；超时 → timeout；授权 → auth_denied。错误信息里不带密钥和完整参数（只带摘要）。

## 8. 验收标准
1. 重复调用同一幂等键只执行一次
2. 崩溃在调用中后恢复：非幂等工具转人工确认
3. 风险等级低于下限的注册被拒
4. 回放不调用

### 实施卡
- 要建 / 要改的文件：`engine/tools/tool.go`、`engine/tools/registry.go`、`engine/tools/handle.go`、`engine/tools/idem.go`、`engine/tools/handle_test.go`、`engine/tools/fake/*.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1101-T1 幂等去重`
  - `E1101-T2 崩溃恢复转人工`
  - `E1101-T3 风险下限`
  - `E1101-T4 回放`
  - `E1101-T5 发出前再判定`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
