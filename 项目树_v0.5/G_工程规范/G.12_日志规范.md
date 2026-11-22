# G.12 日志规范

| 项 | 内容 |
|---|---|
| 编号 | G.12 |
| 类型 | 规范 |
| 上级 | G 工程规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引11 |
| 最后修改 | 2026-11-22 |

## 1. 目的
统一日志的格式、级别和脱敏要求。日志用于排查问题，不是事件（`C.06-R5`），也不能泄露密钥和用户内容。

## 2. 规则
| 编号 | 规则 |
|---|---|
| G.12-R1 | 只用 `log/slog`；输出 JSON 到 `<DataDir>/logs/harnessd-YYYYMMDD.log`，按天滚动，保留 14 天；`--dev` 模式同时输出彩色文本到终端 |
| G.12-R2 | logger 通过依赖注入传入（`slog.Logger`），不用全局默认 logger |
| G.12-R3 | msg 用英文、小写、`对象.动作` 风格（`op.applied`、`llm.retry`）；信息放在键值对里，不拼进 msg |
| G.12-R4 | 公共字段：`component`（包名）、`run_id`、`graph_id`、`session_id`、`node_id`、`path`、`request_id`（有就带，用 `logger.With` 预置） |
| G.12-R5 | 级别含义：`debug` 开发排查用，默认关闭；`info` 生命周期事件（启动、运行开始结束、配置变化）；`warn` 能自动恢复的异常（重试、降级、未知配置项）；`error` 需要人关注的失败（必须带 `err` 字段） |
| G.12-R6 | **绝不记录**：密钥、token、cookie、Authorization 头；模型请求和响应的正文；工具调用的参数和结果正文；用户消息正文。需要时只记录长度、哈希、工作区引用（`*_ref`） |
| G.12-R7 | 所有日志经过脱敏 handler：按键名（`key`、`secret`、`token`、`password`、`authorization`、`cookie`）和值的模式（`sk-`、`AIza`、`Bearer `、长度 ≥ 32 的随机串）替换为 `[REDACTED]` |
| G.12-R8 | 高频路径（每个节点每次调度、每个 SSE 帧）不打 info 日志；需要观察时用指标（`E.09.04`） |

## 3. 例子
```go
log := base.With("component", "sched", "run_id", runID)
log.Info("run.status", "from", "pending", "to", "running")
log.Warn("llm.retry", "provider", p, "attempt", 2, "backoff_ms", 2000, "err", err)
```

## 4. 检查方式
- 脱敏测试：向 logger 写入各种密钥形态，输出里不出现原文（`Q.04`、INV-22）。
- `forbidigo`：禁止 `fmt.Print`、`log.Print`（`G.05.05`）。
