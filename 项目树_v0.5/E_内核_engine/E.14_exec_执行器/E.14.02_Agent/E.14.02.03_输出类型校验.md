# E.14.02.03 输出类型校验

| 项 | 内容 |
|---|---|
| 编号 | E.14.02.03 |
| 类型 | 实施 |
| 上级 | E.14.02 Agent |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
保证 Agent 的输出符合 `output_schema`：结构化输出策略、修复、带错误反馈重试，以及"找不到就说找不到"。

## 2. 不做什么
- 不实现解析和修复算法（`E.10.06`）

## 3. 继承的上级约束
`E.10.06`、`C.13.03-R3`。

## 4. 接口
```go
func decodeOutput(rc exec.RunCtx, resp *llm.Resp, strat structured.Strategy, schema *jsonschema.Schema, retry int, msgs []llm.Message) (exec.Value, error)
```

## 5. 行为
- 校验不通过：把 `structured.Feedback(errs)` 作为 user 消息追加，重新调用模型（不带工具），最多 `repair_retry` 次；每次重试计入 `max_turns`。
- 仍不通过：失败类别 `format_invalid`（按重试策略节点级重试一次，再失败则升级）。
- 类型声明允许"未找到"（字段 `status` 的 enum 含"未找到"）时，规则段写明"找不到信息时 status 填未找到，不要编造"（`E.13.05`）。
- 输出值 `Type` 写实际类型（`方案@1`），大于 8KB 存工作区。

## 6. 不变量
- 返回的 result 一定通过 schema 校验

## 7. 错误处理
`format_invalid` 带最后一次的校验错误列表，节点详情里可以查看。

## 8. 验收标准
1. 第一次输出缺必填字段、第二次修正通过
2. 两次都失败后 format_invalid
3. Partial 结果不出现在 result 上

### 实施卡
- 要建 / 要改的文件：`engine/exec/agent/output.go`、`engine/exec/agent/output_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E140203-T1 修正重试`
  - `E140203-T2 失败`
  - `E140203-T3 大输出转引用`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
