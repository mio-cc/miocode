# E.06.04 急停

| 项 | 内容 |
|---|---|
| 编号 | E.06.04 |
| 类型 | 实施 |
| 上级 | E.06 authz 授权 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引07 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现全局和运行级急停：触发、持久化、取消传播、解除（只有用户）。

## 2. 不做什么
- 不实现急停界面（`U.14.04`、`W.07.01`）

## 3. 继承的上级约束
INV-10、`S.09`。

## 4. 接口
```go
type Estop struct{ /* atomic + store */ }
func (e *Estop) Trigger(ctx context.Context, scope Scope, by gen.Actor) error     // scope: Global | Run(id)
func (e *Estop) Release(ctx context.Context, scope Scope, by gen.Actor) error     // by.kind != user → ErrForbidden
func (e *Estop) Active(runID string) bool                                         // 全局或该运行
func (e *Estop) Subscribe() <-chan Change
```

## 5. 行为
1. Trigger：设置原子标志 → 写 `hx_settings`（持久化）→ 写 `estop.triggered` 事件和审计 → 通知运行管理器取消对应运行的根 context（`E.16.06`）→ 未处理审批标为 cancelled。
2. 启动时读取持久化状态，恢复急停（`S.09-R1`）。
3. Release：**第一行**检查 `by.kind == user`，否则返回 `ErrForbidden`（与 `E.06.02` 第 1 步形成两层拦截，`S.09-R2`）；然后清标志、写事件和审计；档位不恢复（`S.09-R5`）。
4. 运行级急停由运行自己的状态记录；模型可以触发运行级急停（踩刹车），不能解除。

## 6. 不变量
- 任何非 user 的 Release 调用都失败
- 重启后急停状态保持

## 7. 错误处理
持久化失败：内存标志仍然生效（宁可急停），记 error 日志并在下次写入时重试。

## 8. 验收标准
1. 模型 Release 失败（S.09 §4-1）
2. 1 秒内全部运行停止（S.09 §4-2，与 E.16.06 联测）
3. 重启后仍急停（S.09 §4-3）

### 实施卡
- 要建 / 要改的文件：`engine/authz/estop.go`、`engine/authz/estop_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0604-T1 只有用户能解除`
  - `E0604-T2 持久化恢复`
  - `E0604-T3 取消联动`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
