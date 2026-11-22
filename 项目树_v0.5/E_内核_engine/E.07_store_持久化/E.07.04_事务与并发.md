# E.07.04 事务与并发

| 项 | 内容 |
|---|---|
| 编号 | E.07.04 |
| 类型 | 实施 |
| 上级 | E.07 store 持久化 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引04 |
| 最后修改 | 2026-11-22 |

## 1. 职责
规定事务边界和并发写入方式，保证 SQLite 单写者下的正确性和吞吐。

## 2. 不做什么
- 不实现业务锁（版本冲突在 `op`）

## 3. 继承的上级约束
`C.06.01-R1`、`G.05.02`。

## 4. 接口
```go
// engine/store/sqlite/writer.go
type writer struct{ reqs chan writeReq }   // 单个写连接 + 写队列
func (w *writer) Do(ctx context.Context, fn func(*sql.Tx) error) error
```

## 5. 行为
| 规则 | 说明 |
|---|---|
| 单写者 | 一个写连接，所有写事务经写队列串行执行；读用连接池（最多 8 个），WAL 下读不阻塞写 |
| 攒批 | 写队列在 2ms 窗口内把多个运行的事件写入合并为一个事务（每个运行的 seq 仍各自连续） |
| 事务边界 | Op 批次：一个事务（`E.05-R2`）；事件批：一个事务，同时更新 `hx_runs.last_seq` 和投影；检查点与 `checkpoint.saved` 事件同一事务（`引04` §5） |
| 账本 cas | `INSERT … WHERE (SELECT max(version) …) = ?`，影响行数 0 即冲突 |
| 超时 | 单个写事务 > 1s 记 warn；> 5s 视为异常，记 error 并返回 |
| 关闭 | `Close` 先停止接收新写请求，等待队列清空（最多 10s） |

## 6. 不变量
- 同一运行的事件 seq 连续且与写入顺序一致
- 写队列不丢请求（关闭时也处理完）

## 7. 错误处理
`SQLITE_BUSY` 在写队列模型下不应出现；出现时重试 3 次后返回错误并记 error。

## 8. 验收标准
1. 10 个运行并发各写 1 万条事件：每个运行 seq 连续，总耗时 < 3s
2. 关闭时队列清空

### 实施卡
- 要建 / 要改的文件：`engine/store/sqlite/writer.go`、`engine/store/sqlite/writer_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0704-T1 并发写`
  - `E0704-T2 关闭清空`
  - `E0704-T3 BenchmarkAppendEvents`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
