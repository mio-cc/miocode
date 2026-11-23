# E.07.03 迁移

| 项 | 内容 |
|---|---|
| 编号 | E.07.03 |
| 类型 | 实施 |
| 上级 | E.07 store 持久化 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引01§5 |
| 最后修改 | 2026-11-24 |

## 1. 职责
规定数据库迁移的写法和执行方式，实现迁移执行器和备份；建本片的迁移文件 `0001_init.sql`（表的内容由 `E.07.02` §4.1 定）。

## 2. 不做什么
- 不定义表结构（`E.07.02`）。
- 不决定什么时候备份（`E.07.02` 的 `Open` 决定）。

## 3. 继承的上级约束
`G.04.03`（迁移文件命名）、`C.12` §3.4、`C.01-R20`、`E.07.02` §4.1。

## 4. 接口
```go
// engine/store/sqlite/migrate.go
//go:embed migrations/*.sql
var migrationFS embed.FS

var ErrSchemaTooNew = errors.New("sqlite: 数据库版本比程序新，请升级 Anywhere Door")

func SchemaVersion(ctx context.Context, db *sql.DB) (int, error)                 // 没有版本表时为 0
func Migrate(ctx context.Context, db *sql.DB, fsys fs.FS) (from, to int, err error)  // fsys 为 nil 时用 migrationFS
func Backup(ctx context.Context, db *sql.DB, path string, version, keep int) (string, error)
```
- 迁移文件：`engine/store/sqlite/migrations/NNNN_描述.sql`（四位序号从 0001 起、连续），用 `embed.FS` 打进二进制。文件分两段，`-- +goose Up` 和 `-- +goose Down` 各一行开头（沿用 goose 的写法，以后换成 goose 不用改文件）；执行器只执行 Up 段。
- 版本表 `hx_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`，执行器在第一次迁移前自己建。
- 不用 `pressly/goose`：它的全局注册违反 `E-R3`（`P.09` K237）；执行器自己写，不到 150 行。

## 5. 行为
- `Migrate`：读 `fsys` 里的迁移文件，序号必须从 1 起连续、不重名，否则返回错误；当前版本大于最大序号：`ErrSchemaTooNew`（`C.01-R20`）；否则对每个大于当前版本的文件：开事务 → 执行 Up 段（一次 `ExecContext` 执行整段）→ 写 `hx_migrations`（`applied_at` 为执行时的真实时间：迁移不在虚拟时钟下跑，是 `E.07-R5` 的例外）→ 提交；任何一步失败回滚并返回带文件名的错误。
- **只向前**：Down 段必须写（开发用），但产品里不执行降级。
- 大表变更（加列除外）先建新表、复制、改名。
- SQL 只用 SQLite 与 Postgres 都支持的语法（`引04` §10，`E.07.02` §4.1）。
- `Backup`：`VACUUM INTO '<path>.bak-<version>'`（目标已存在先删），然后同目录下 `<文件名>.bak-*` 只留序号最大的 `keep` 份，返回备份文件路径。

## 6. 不变量
- 迁移可重复执行（已执行的不再执行）。
- 迁移失败数据库回到这个文件执行前的状态。

## 7. 错误处理
迁移失败：返回 `sqlite: 迁移 0002_x.sql 失败：<原错误>`；`anydoor` 启动失败时日志写明这一句，并提示从备份恢复（`B.01`）。

## 8. 验收标准
1. 空库迁移到最新。
2. 从每个历史版本迁移到最新（迁移链测试）。
3. 更新的库被旧程序拒绝。
4. 备份只留最近 3 份。

### 实施卡
- 要建 / 要改的文件：`engine/store/sqlite/migrate.go`、`engine/store/sqlite/migrations/0001_init.sql`、`engine/store/sqlite/migrate_test.go`
- 不许碰的文件：`schema/`、`gen/`、`engine/store/store.go`、`engine/store/storetest/`、`engine/store/memstore/`、`engine/store/sqlite/writer.go`
- 测试用例：
  - `E0703-T1 空库`：新文件 `Migrate` 后 `SchemaVersion` 为 1，`E.07.02` §4.1 的 15 张表都在；再执行一次 `from == to == 1`，不报错
  - `E0703-T2 迁移链`：用 `fstest.MapFS` 写三个测试迁移（建表、加列、建新表复制改名），从版本 0、1、2 分别迁移到 3，结果相同；第 3 个迁移写错 SQL 时版本停在 2、表还是第 2 版的样子
  - `E0703-T3 版本过新拒绝`：版本表里写入 99 后 `Migrate` 返回 `ErrSchemaTooNew`；序号不连续的迁移目录返回错误
  - `E0703-T4 备份`：连续备份版本 1–5，目录里只剩 3、4、5 三份，备份文件能打开、表和数据都在
- 允许使用的依赖：标准库、`modernc.org/sqlite`（测试用，`E.07.04` 加进 `go.mod`）
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 6 片（`m0-store`）开工前复查：不用 goose，执行器自写（保留 goose 的文件写法）；版本表改名 `hx_migrations`；`Backup` 独立出来由 `Open` 调用；本叶子建 `0001_init.sql`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K237 |
| 2026-11-24 | 状态改为"冻结"：第 6 片（`m0-store`）squash 合并进代码仓库 `main`，提交 `89998584f1faadbb8d014b636230faea4bdd0c30`（`G.02.06-R21`） | `relay slice` 通过；评审 8 条全部符合；按 `G.08-R3` 由验证者合并 |
