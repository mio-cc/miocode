# B.07.04 单实例锁

| 项 | 内容 |
|---|---|
| 编号 | B.07.04 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-22 |

## 1. 职责
保证同一个数据目录只有一个 `anydoor` 在运行；第二次启动时把用户带到已运行的实例。

## 2. 不做什么
- 不处理不同数据目录的多个实例（允许同时运行）

## 3. 继承的上级约束
`S.02-R10`、`B.01` §3 第 3 步。

## 4. 接口
```go
func Acquire(dataDir string) (release func(), existing *Instance, err error)
type Instance struct { PID int; Port int }
```

## 5. 行为
- 锁文件 `<DataDir>/anydoor.lock`：Unix 用 `flock`，Windows 用 `LockFileEx`（`golang.org/x/sys`）；进程退出（包括崩溃）时操作系统自动释放。
- 拿到锁后写入 PID；端口在 HTTP 启动后写进 `<DataDir>/port`。
- 拿不到锁：读 `port` 文件，请求 `/api/v1/health` 确认存活 → 打开浏览器到 `http://127.0.0.1:<端口>/?t=<token>` → 打印"Anywhere Door 已在运行"并退出码 0。health 无响应：等待 3 秒重试一次，仍无响应则提示"另一个 Anywhere Door 进程没有响应，请结束它后重试"。

## 6. 不变量
- 同一数据目录不可能同时有两个实例写数据库

## 7. 错误处理
无。

## 8. 验收标准
1. 第二个实例转交
2. 崩溃后锁自动释放
3. 无响应的旧实例提示

### 实施卡
- 要建 / 要改的文件：`internal/platform/lock/*.go`、`internal/platform/lock/lock_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0704-T1 转交`
  - `B0704-T2 崩溃释放`
  - `B0704-T3 无响应`
- 允许使用的依赖：`golang.org/x/sys`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
