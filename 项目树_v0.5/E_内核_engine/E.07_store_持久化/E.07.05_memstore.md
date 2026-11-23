# E.07.05 memstore

| 项 | 内容 |
|---|---|
| 编号 | E.07.05 |
| 类型 | 实施 |
| 上级 | E.07 store 持久化 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引04 |
| 最后修改 | 2026-11-24 |

## 1. 职责
提供完全在内存里的 `Store` 实现，供内核测试和 `--fake-llm` 演示之外的单元测试使用（`E-R5`）。

## 2. 不做什么
- 不用于产品运行。
- 不追求性能。

## 3. 继承的上级约束
`E.07-R1`–`R6`、`E.07.01` 全部、`E-R5`。

## 4. 接口
```go
// engine/store/memstore/memstore.go
func New() store.Store
```

## 5. 行为
- 一把 `sync.Mutex` 保护全部数据；每条记录按 JSON 编码后保存、读出时解码（和 SQLite 的"全文"列一致，读出的值不和调用方共享内存）。
- `Tx`：持锁，复制全部集合后在副本上执行 `fn`，成功时换成副本，失败或 panic 时丢弃；`fn` 里拿到的 `Store` 直接操作副本（不再加锁）；嵌套 `Tx` 直接执行 `fn`。
- 行为必须与 SQLite 实现在契约测试下完全一致（包括错误类型、排序、分页、seq 分配）。

## 6. 不变量
- 与 SQLite 实现通过同一套契约测试。
- 读出的值修改后不影响存储里的数据。

## 7. 错误处理
与 SQLite 实现相同。

## 8. 验收标准
1. `storetest.Run(t, …)` 在 memstore 上全部通过。

### 实施卡
- 要建 / 要改的文件：`engine/store/memstore/memstore.go`、`engine/store/memstore/graphs.go`、`engine/store/memstore/runs.go`、`engine/store/memstore/misc.go`、`engine/store/memstore/memstore_test.go`
- 不许碰的文件：`schema/`、`gen/`、`engine/store/store.go`、`engine/store/storetest/`、`engine/store/sqlite/`
- 测试用例：
  - `E0705-T1 契约测试`：`storetest.Run(t, func(t *testing.T) store.Store { return memstore.New() })`（`E0701-T1`–`T3`）
  - `E0705-T2 不共享内存`：`Graphs().Meta` 读出后改 `Title`，再读还是原值；`Commit` 之后改调用方的 `Ops` 切片，存储里不变
- 允许使用的依赖：标准库、`gen`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 6 片（`m0-store`）开工前复查：JSON 编码保存（与 SQLite 一致、不共享内存）；`Tx` 写明副本做法；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K236、K237 |
| 2026-11-24 | 状态改为"冻结"：第 6 片（`m0-store`）squash 合并进代码仓库 `main`，提交 `89998584f1faadbb8d014b636230faea4bdd0c30`（`G.02.06-R21`） | `relay slice` 通过；评审 8 条全部符合；按 `G.08-R3` 由验证者合并 |
