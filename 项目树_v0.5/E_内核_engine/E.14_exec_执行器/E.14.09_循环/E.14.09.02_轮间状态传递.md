# E.14.09.02 轮间状态传递

| 项 | 内容 |
|---|---|
| 编号 | E.14.09.02 |
| 类型 | 实施 |
| 上级 | E.14.09 循环 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现轮间状态传递：上一轮出口值里哪些字段带进下一轮、带多少、超了怎么压缩；差距报告如何进入下一轮。

## 2. 不做什么
- 不决定差距报告的内容（由验收 Agent 产出）

## 3. 继承的上级约束
`引03` §5.9（carry）、`P.09` K32。

## 4. 接口
```go
func next(prev json.RawMessage, out exec.Outputs, fields []string) json.RawMessage
func carry(state json.RawMessage, budgetTokens int, sum exec.Summarizer) exec.Inputs
```

## 5. 行为
- 第 1 轮入口值 = `init` 输入。第 N 轮入口值 = 上一轮出口值中 `carry_fields` 列出的字段（缺省为全部），加上 `round`、`history`（往轮的简短记录列表）。
- **差距报告**：子图出口类型通常包含 `gap: 差距报告@1`；它作为 `carry_fields` 的一部分进入下一轮，配方通过 `in.gap` 取用（`C.13.01`）。
- 携带内容超过 `carry_budget × 窗口`：较早轮次的 `history` 交给 `exec.Summarizer` 压缩（内部 Agent 执行），最近一轮原样保留。
- 携带状态存进检查点；超过 8KB 存工作区。

## 6. 不变量
- 只有 `carry_fields` 里的字段进入下一轮

## 7. 错误处理
字段不存在：忽略并记 warn。

## 8. 验收标准
1. 差距报告从第 1 轮进入第 2 轮的上下文
2. carry_fields 过滤
3. 超出预算时压缩历史

### 实施卡
- 要建 / 要改的文件：`engine/exec/loop/carry.go`、`engine/exec/loop/carry_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E140902-T1 差距报告传递`
  - `E140902-T2 字段过滤`
  - `E140902-T3 压缩`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
