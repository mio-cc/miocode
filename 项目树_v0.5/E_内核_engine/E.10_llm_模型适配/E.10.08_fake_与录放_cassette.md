# E.10.08 fake 与录放 cassette

| 项 | 内容 |
|---|---|
| 编号 | E.10.08 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引12 |
| 最后修改 | 2026-11-24 |

## 1. 职责
提供不调真模型的测试手段：
- **录放（cassette）**：在 HTTP 这一层录下真实的请求和响应（包括 SSE 原文），之后原样回放。协议的编码、解码因此是对着真实格式测的（契约测试，`E.10-R3`）。
- **fake**：脚本化的 `llm.Client`，给执行器、编排者、对话 Agent 的单元测试用（`Q.06` §3.2）。
- `--fake-llm` 演示模式和模板自带的录放（`C.13.04`）在 M1 做（`P.09` K251）。

## 2. 不做什么
- 不进入正式模式的调用路径（`--fake-llm` 除外）
- 不做"按事件日志回放一次运行"（INV-13，那是 `E.10.09` 的 `Replaying`，M1）

## 3. 继承的上级约束
`Q.06`、`G.05.04-R6`、`E.10-R5`、`S.03-R7`。

## 4. 接口
```go
package cassette

// Transport 是给 llm.Options.Transport 用的录放传输层。
// 只回放：按请求找 dir/<name>.json 里的记录，找不到就让测试失败，不回退到真实调用。
// go test ... -record：真发请求（通过 llm 的测试守卫，E.10.01 §5.3），把请求和响应写进 dir/<name>.json。
func Transport(t testing.TB, dir, name string, secrets ...string) http.RoundTripper // secrets：录制时要从文件里抹掉的密钥原文
var Record = flag.Bool("record", false, "真实调用模型并更新录放（只在开发机上用，Q.06-R7）")
```
录放文件（一份 = 一个用例里按顺序发生的若干次请求）：
```json
{
  "recorded_at": "2026-11-24T12:00:00Z",
  "note": "Mistral 真实录制 / 按官方文档手写",
  "interactions": [
    {
      "request":  { "method": "POST", "path": "/v1/chat/completions", "body": { "...": "规范化后的 JSON" } },
      "response": { "status": 200, "headers": { "Content-Type": "text/event-stream" }, "body": "data: {...}\n\n" }
    }
  ]
}
```
```go
package fake

type Step struct {
	Deltas []llm.Delta // 按顺序吐出；最后会补一个 Done
	Resp   *llm.Resp   // 只给结果时用
	Err    error       // 模拟错误（*llm.Error）
}
func New(caps llm.Caps, steps ...Step) *Client // 实现 llm.Client；按调用次序取 Step，用完再调用 → 错误
func (c *Client) Requests() []llm.Req          // 收到过的请求，供断言"模型收到了什么"
```

## 5. 行为
- **匹配**：按顺序回放第 n 次请求时，比较方法、路径、规范化后的请求体（键排序；去掉 `stream` 以外不影响语义的字段：无）；不一致时测试失败并打印差异（不是静默跳过）。
- **脱敏**（`S.03-R7`、`Q.06-R6`）：录制时不写请求头；响应头只留 `Content-Type`、`Retry-After`；请求体、响应体里出现传入的 `secrets` 原文或像密钥的串（`sk-…`、`Bearer …` 等，规则同 `E.10.01` §5.5）一律换成 `[REDACTED]`。
- **手写录放**：没有真实密钥的协议，按官方文档的示例手写同样格式的文件，`note` 写明"按官方文档手写"和文档地址；有了密钥再用 `-record` 重录。
- **录制**：只在开发机上，`go test ./engine/llm/protocol/<名>/... -record`；密钥用 `ANYDOOR_DEV_SECRET_<名>` 环境变量（`G.11-R3`、`Q.06-R7`），测试从它取。`-record` 让 `Transport` 设置 `ANYDOOR_LLM_RECORD=1`（`t.Setenv`），放开 `E.10.01` 的测试守卫。录制写出的 `note` 是"真实录制（go test -record）："加请求过的地址（`scheme://host`）；可以手工补上厂商、模型和日期（`note` 不参与匹配）。

## 6. 不变量
- 不带 `-record` 时，任何测试都不会发出真实模型请求
- 录放文件里没有密钥原文和认证头

## 7. 错误处理
回放找不到文件或记录不够：测试失败，写出文件名和请求序号；请求不一致：测试失败，写出差异。

## 8. 验收标准
1. 录制后回放，响应体逐字节一致
2. 缺记录、请求不一致时报错而不是联网
3. 录放文件里没有密钥
4. fake 按脚本返回，并记下收到的请求

### 实施卡
- 要建 / 要改的文件：`engine/llm/cassette/cassette.go`、`engine/llm/cassette/redact.go`、`engine/llm/cassette/cassette_test.go`、`engine/llm/fake/fake.go`、`engine/llm/fake/fake_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`engine/store/`、`web/`、`engine/llm/protocol/`
- 测试用例：
  - `E1008-T1 录放往返`：对 `httptest`（回环地址，守卫放行）用录制模式发两次请求写出文件；再用回放模式跑同样的两次请求，响应状态、头、体逐字节一致，且 `httptest` 没有再收到请求；写出的 `note` 含请求的地址
  - `E1008-T2 缺记录与不一致`：文件不存在、记录比请求少、请求体不一致，三种情况测试失败并说明原因（用 `testing.TB` 的替身捕获失败）
  - `E1008-T3 脱敏`：录制时带 `Authorization`、`x-api-key` 请求头和传入的密钥原文、响应体里含 `sk-` 开头的串，写出的文件里都找不到
  - `E1008-T4 fake 脚本`：按次序返回 Deltas / Resp / Err；`Requests()` 记下每次的请求；脚本用完后再调用 → 错误
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `E1008-T5 模板演示`：在 `B.06.05`（M1）跑：演示模式跑通内置模板
- 允许使用的依赖：标准库
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑨ 片（`m0-llm`）开工前复查：录放改在 HTTP 层（协议的编码解码对着真实格式测）、文件格式与脱敏写全、可以手写；fake 改为脚本化的 `llm.Client`；演示模式和模板录放推到 M1（`E1008-T5` 在其他叶子跑）；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K251 |
| 2026-11-24 | 第 ⑨ 片整片评审后（`P.09` K252）：§5 录制写出的 `note` 写明请求的地址，可以手工补厂商和模型；`E1008-T1` 补一条 | `P.09` K252 |
| 2026-11-24 | 状态改为"冻结"：第 ⑨ 片（`m0-llm`）squash 合并进代码仓库 `main`，提交 `fdbda299d663789d112f4ecb124901e234b645f8`（`G.02.06-R21`） | `relay slice` 通过；整片评审 19 行，1 条不符合、3 条有疑问已修（`P.09` K252）并复核；按 `G.08-R3` 由验证者合并 |
