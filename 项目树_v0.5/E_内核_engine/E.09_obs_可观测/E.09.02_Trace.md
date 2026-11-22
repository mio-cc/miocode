# E.09.02 Trace

| 项 | 内容 |
|---|---|
| 编号 | E.09.02 |
| 类型 | 实施 |
| 上级 | E.09 obs 可观测 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引11 |
| 最后修改 | 2026-11-22 |

## 1. 职责
把运行、节点执行、模型调用、工具调用映射成 OpenTelemetry trace（可选导出）。

## 2. 不做什么
- 不替代本地事件日志（`E.09-R1`）

## 3. 继承的上级约束
`E.09-R2`、`引11` §2.2。

## 4. 接口
```go
type Tracer interface {
    StartRun(ctx context.Context, runID string) context.Context
    StartNode(ctx context.Context, loc gen.Loc, kind string) (context.Context, func(status string))
    StartLLM(ctx context.Context, attrs LLMAttrs) (context.Context, func(u Usage, err error))
    StartTool(ctx context.Context, attrs ToolAttrs) (context.Context, func(status string))
}
func NewOTel(endpoint string) (Tracer, error)   // 配置了 OTEL_EXPORTER_OTLP_ENDPOINT 时启用
var NopTracer Tracer
```

## 5. 行为
| 本系统 | OTel span | 主要属性 |
|---|---|---|
| 运行 | `harness.run` | `harness.run_id`、`harness.graph_id` |
| 节点执行 | `harness.node` | `harness.node_id`、`harness.path`、`harness.node_type`、`harness.status` |
| 模型调用 | `gen_ai.chat`（GenAI 语义约定） | `gen_ai.system`、`gen_ai.request.model`、`gen_ai.usage.input_tokens`、`gen_ai.usage.output_tokens` |
| 工具调用 | `harness.tool` | `tool.name`、`tool.risk`、`tool.idem_key` |
| 等待 | span event `wait.start` / `wait.end` | `wait.kind`：queue / throttle / approval |
- GenAI 语义约定的版本锁定（`go.opentelemetry.io/otel/semconv` 的具体版本写进 `G.10`）。
- 属性里不放提示词和输出正文（`E.09-R2`）。

## 6. 不变量
- 未配置导出地址时不初始化 SDK，零开销

## 7. 错误处理
导出失败只记 warn，不影响运行。

## 8. 验收标准
1. 配置导出到测试收集器后，一次模板运行产生正确的 span 树
2. 属性中没有正文

### 实施卡
- 要建 / 要改的文件：`engine/obs/trace.go`、`engine/obs/trace_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0902-T1 span 树结构`
  - `E0902-T2 无正文`
- 允许使用的依赖：`go.opentelemetry.io/otel` 及 sdk、otlp
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
