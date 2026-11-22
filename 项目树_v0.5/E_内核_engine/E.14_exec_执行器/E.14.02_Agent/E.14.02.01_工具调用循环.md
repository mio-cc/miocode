# E.14.02.01 工具调用循环

| 项 | 内容 |
|---|---|
| 编号 | E.14.02.01 |
| 类型 | 实施 |
| 上级 | E.14.02 Agent |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现模型调用和工具调用的循环：渲染提示词 → 调模型 → 执行工具 → 把结果加回消息 → 再调模型，直到得到最终结果或达到上限。

## 2. 不做什么
- 不实现单个工具的逻辑（`E.11`）

## 3. 继承的上级约束
`E.14.02-R1`、INV-09、INV-14、`E.06.03`。

## 4. 接口
```go
func (a *Agent) Run(rc exec.RunCtx, in exec.Inputs) (exec.Outputs, error)
type agentCP struct { Turn int; MsgsRef string; Calls []string /* 已完成的幂等键 */ }
```

## 5. 行为
```
render = E.13.05.Render(packet, node)
msgs = render.Messages; turn = 0
loop:
  turn++ ; if turn > max_turns → structural "超过最大轮数"
  resp = rc.LLM(model).Complete(req{msgs, tools, output, reasoning})   // 已包好重试、计量
  if resp.ToolCalls:
      for each call (并行支持时并发执行，最多 3 个同时):
          if calls_total > max_tool_calls → 不再执行工具，给模型一条消息"工具调用次数已用完，请直接给出结果"
          h = rc.Tool(name)；res = h.Call(args, taint = packet.Taint)
          msgs += tool 消息（摘要 + 片段 + 引用）
      rc.Checkpoint(agentCP{turn, msgs 存工作区, calls})
      continue
  if 调用了内部工具 escalate → rc.Escalate(...)，结束本次执行（输出为空，升级端口带值）
  out = E.14.02.03.Decode(resp)    // 结构化输出 + 修复重试
  return {result: out}
```
- 工具调用失败：把错误摘要作为工具结果交给模型（"检索失败：超时"），由模型决定下一步；连续 3 次同一工具失败 → 结束并以 transient / structural 失败。
- 模型的工具名不存在或参数不合 schema：作为工具结果返回错误说明（不计入失败次数），模型可以修正。
- 恢复（`Resumable`）：从检查点读回消息和已完成的工具调用，继续下一轮；已完成的工具靠幂等键不会重复执行。

## 6. 不变量
- 每一轮模型调用都有 `llm.call` 事件
- 工具调用次数不超过 `max_tool_calls`
- 输出污染 = 上下文包污染 ∪ 工具结果污染（`E.06.03`）

## 7. 错误处理
模型错误由包装层重试（`E.10.09`）；重试耗尽按错误类别失败。

## 8. 验收标准
1. fake 模型脚本：两轮工具调用后给出结果
2. 超过 max_tool_calls 时提示模型收尾
3. 崩溃在第 2 轮后恢复，不重复第 1 轮的工具调用
4. escalate 工具触发升级

### 实施卡
- 要建 / 要改的文件：`engine/exec/agent/loop.go`、`engine/exec/agent/agent.go`、`engine/exec/agent/loop_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E140201-T1 工具循环`
  - `E140201-T2 调用上限`
  - `E140201-T3 恢复`
  - `E140201-T4 升级`
  - `E140201-T5 工具错误回传`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
