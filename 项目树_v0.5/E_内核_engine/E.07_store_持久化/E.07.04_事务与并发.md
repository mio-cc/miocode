# E.07.04 事务与并发

| 项 | 内容 |
|---|---|
| 编号 | E.07.04 |
| 类型 | 实施 |
| 上级 | E.07 store 持久化 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引04 |
| 最后修改 | 2026-11-24 |

## 1. 职责
规定事务边界和并发写入方式，保证 SQLite 单写者下的正确性；实现写队列。

## 2. 不做什么
- 不实现业务锁（版本冲突在 `op`）。
- 不攒批：事件攒批在 `E.09.01`，存储收到一次调用就是一个事务（`P.09` K237，去掉原来的 2ms 跨运行合并）。

## 3. 继承的上级约束
`C.06.01-R1`、`G.05.02`（goroutine 有所有者、能取消）、`E.07-R5`。

## 4. 接口
```go
// engine/store/sqlite/writer.go
type writer struct{ /* 一个写连接 + 请求队列 + 一个 goroutine */ }
func newWriter(db *sql.DB, log *slog.Logger) *writer     // db 的 MaxOpenConns 必须是 1
func (w *writer) Do(ctx context.Context, fn func(*sql.Tx) error) error
func (w *writer) Close(timeout time.Duration) error
var errWriterClosed = errors.New("sqlite: 写队列已关闭")
```

## 5. 行为
| 规则 | 说明 |
|---|---|
| 单写者 | 一个写连接，所有写事务经队列由一个 goroutine 串行执行；读用另一个连接池（`E.07.02`），WAL 下读不阻塞写 |
| 事务 | `Do`：`BeginTx` → `fn` → 提交；`fn` 返回错误或 panic 时回滚，panic 转成错误返回，写队列继续工作 |
| 取消 | 请求还在排队时 `ctx` 取消：不执行，返回 `ctx.Err()`；已开始执行的事务用 `ctx` 执行 |
| 事务边界 | 由调用方决定：Op 批次一个事务（`E.05-R2`）；事件批一个事务，同时更新 `hx_runs.last_seq`（`E.07.01` §5）；检查点与 `checkpoint.saved` 事件同一事务（`引04` §5，调用方用 `Tx`） |
| 超时 | 单个写事务超过 1s 记 warn；超过 5s 时它的 context 被取消、事务回滚，记 error 并返回 `context.DeadlineExceeded` |
| SQLITE_BUSY | 写队列模型下不应出现；出现时（错误信息含 `SQLITE_BUSY` 或 `database is locked`）间隔 50ms 重试整个事务，最多 3 次，仍失败记 error 返回 |
| 关闭 | `Close`：不再接收新请求（之后的 `Do` 返回 `errWriterClosed`），把已排队的执行完；超过 `timeout` 时返回错误，没执行的请求返回 `errWriterClosed` |

## 6. 不变量
- 同一运行的事件 seq 连续且与写入顺序一致（由串行执行保证）。
- 已排队的请求在关闭时也被处理或得到错误，不会一直阻塞。

## 7. 错误处理
见 §5 表；`fn` 的错误原样返回（不包装），哨兵错误能用 `errors.Is` 判断。

## 8. 验收标准
1. 10 个 goroutine 并发各写 1 万条：每组 seq 连续，总耗时 < 3s。
2. 关闭时队列清空。

### 实施卡
- 要建 / 要改的文件：`engine/store/sqlite/writer.go`、`engine/store/sqlite/writer_test.go`、`go.mod`、`go.sum`
- `go.mod` 加 `modernc.org/sqlite`（`G.10` 已登记）：验证者 `go get modernc.org/sqlite@latest` 后 `go mod tidy`；实施者不手改 `go.mod`、`go.sum`。
- 不许碰的文件：`schema/`、`gen/`、`engine/store/store.go`、`engine/store/storetest/`、`engine/store/memstore/`
- 测试用例（测试里自己建一张两列的表 `t(grp, seq)`，不依赖迁移）：
  - `E0704-T1 并发写`：10 个 goroutine，每个用 `Do` 写 1 万条（每个事务 100 条，seq 取本组 `max(seq)+1`），结束后每组 seq 从 1 到 10000 连续；`-short` 时每组 1000 条
  - `E0704-T2 关闭清空`：排队 100 个请求后 `Close(10s)`：100 个都执行了；之后 `Do` 返回 `errWriterClosed`
  - `E0704-T3 回滚与 panic`：`fn` 返回错误、`fn` panic 时数据不留下，下一个 `Do` 正常
  - `E0704-T4 排队时取消`：一个长事务执行中，另一个请求的 `ctx` 取消后立刻返回 `context.Canceled`，它的 `fn` 没有执行
  - `BenchmarkAppendEvents`：每次 `Do` 写 64 条
- 允许使用的依赖：标准库、`modernc.org/sqlite`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 6 片（`m0-store`）开工前复查：去掉 2ms 跨运行合并（攒批在 `E.09.01`）；写明取消、panic、超时、关闭的行为；本叶子把 `modernc.org/sqlite` 加进 `go.mod`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K237 |
