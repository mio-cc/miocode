# B.07.04 单实例锁

| 项 | 内容 |
|---|---|
| 编号 | B.07.04 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引15 |
| 最后修改 | 2026-11-24 |

## 1. 职责
保证同一个数据目录只有一个 `anydoor` 在运行：取锁、写端口文件；取不到锁时读出已运行实例的 PID 和端口，并能探测它是否存活。

## 2. 不做什么
- 不处理不同数据目录的多个实例（允许同时运行）
- 不打开浏览器、不打印提示、不重试：第二次启动时的转交流程在 `B.02`（`B02-T4`，`P.09` K240）

## 3. 继承的上级约束
`B.07-R1`–`R6`、`S.02-R10`、`B.01` §3 第 3 步。

## 4. 接口
```go
// internal/platform/lock/lock.go
type Instance struct{ PID int; Port int }     // Port 为 0：对方还没写端口文件

type Lock struct{ /* 持有的锁文件 */ }

// Acquire 取数据目录的锁。拿到：返回 *Lock；已被别的实例持有：返回 nil, *Instance, nil。
func Acquire(d datadir.Dir) (*Lock, *Instance, error)
func (l *Lock) WritePort(port int) error      // 写 <DataDir>/port
func (l *Lock) Release() error                // 删 port 文件、解锁、关闭锁文件（锁文件本身留着）

// Probe 请求 http://127.0.0.1:<port>/api/v1/health，200 且 {"ok": true} 为存活；超时由 ctx 决定。
func Probe(ctx context.Context, port int) bool
```

## 5. 行为
- 锁文件 `<DataDir>/anydoor.lock`（没有就建，权限只有当前用户）：
  - Unix：`flock(LOCK_EX|LOCK_NB)`（`golang.org/x/sys/unix`）。
  - Windows：`LockFileEx(LOCKFILE_EXCLUSIVE_LOCK|LOCKFILE_FAIL_IMMEDIATELY)`，锁的是文件末尾之外很远的一个字节（偏移 `0x7FFFFFFF_00000000`），文件开头写的 PID 别的进程仍能读。
  - 进程退出（包括崩溃、被杀）时由操作系统释放锁。同一进程里第二次 `Acquire` 同样拿不到。
- 拿到锁：把锁文件内容改成本进程 PID（十进制加换行）。
- 拿不到锁：读锁文件的 PID 和 `port` 文件的端口（读不到或格式不对时为 0），返回 `Instance`。
- `WritePort`：`datadir.WritePrivate` 写十进制端口加换行。`Release` 之后 `Lock` 不能再用。
- `Probe`：只连 `127.0.0.1`；`port` 为 0 直接返回 false；不跟随跳转；读响应体最多 1 KB。

## 6. 不变量
- 同一数据目录不可能同时有两个实例写数据库

## 7. 错误处理
锁文件打不开（权限）：`Acquire` 返回错误 `lock: 打不开 <路径>：<原错误>`。

## 8. 验收标准
1. 第二次取锁读出已运行实例的 PID 和端口
2. 持有锁的进程被杀后锁自动释放
3. 存活探测：正常、无响应、端口没人听三种情况

### 实施卡
- 要建 / 要改的文件：`internal/platform/lock/lock.go`、`internal/platform/lock/flock_unix.go`、`internal/platform/lock/flock_windows.go`、`internal/platform/lock/lock_test.go`
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/platform/datadir/`、`internal/platform/auth/`、`internal/platform/secret/`、`internal/platform/config/`
- 测试用例：
  - `B0704-T1 第二次取锁`：同一进程里第一次 `Acquire` 拿到、`WritePort(7300)`；第二次返回 `Instance{PID: 本进程, Port: 7300}`；`Release` 后第三次拿到，`port` 文件已删除
  - `B0704-T2 崩溃释放`：子进程（测试二进制自己，环境变量 `ANYDOOR_LOCK_HELPER=1` 时取锁后打印 `locked` 并一直等）持有锁时，父进程 `Acquire` 读出子进程的 PID；杀掉子进程后父进程能拿到锁
  - `B0704-T3 存活探测`：`httptest` 在 127.0.0.1 上返回 `{"ok":true}`：true；返回 500：false；接受连接但不回应、`ctx` 200ms 超时：false；关掉的端口：false；端口 0：false
- 允许使用的依赖：标准库、`golang.org/x/sys`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑦ 片（`m0-platform`）开工前复查：转交流程（重试、开浏览器、提示）移到 `B.02`；接口改为 `Acquire` / `WritePort` / `Release` / `Probe`；Windows 锁远处的字节以便读 PID；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K239、K240 |
