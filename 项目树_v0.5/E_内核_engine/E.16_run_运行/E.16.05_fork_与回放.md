# E.16.05 fork 与回放

| 项 | 内容 |
|---|---|
| 编号 | E.16.05 |
| 类型 | 实施 |
| 上级 | E.16 run 运行 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 选§7 Burr |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现回放（完全复现，不调用外部）、从检查点分叉（fork，之后的部分真实执行）、从某节点重跑、单节点重放。

## 2. 不做什么
- 不实现运行历史界面（`W.09.05`）

## 3. 继承的上级约束
INV-13、`C.12-R6`、`R7`、`引04` §7、`P.10`（Burr）。

## 4. 接口
```go
func (m *Manager) Replay(ctx context.Context, runID string, by gen.Actor) (*RunMeta, error)
func (m *Manager) Fork(ctx context.Context, runID string, at ForkPoint, patch *gen.GraphPatch, by gen.Actor) (*RunMeta, error)
type ForkPoint struct { Loc gen.Loc; Seq int64 }     // 某个检查点；或某个节点执行之前
func (m *Manager) ReplayNode(ctx context.Context, runID string, loc gen.Loc, live bool) (*NodeReplay, error)
```

## 5. 行为
| 操作 | 新建运行 | 使用 | 调用模型 / 工具 |
|---|---|---|---|
| 回放 | 是，`replay_of` | 原快照 + 原事件里的 `llm.call`、`tool.call`、`orch.expanded`、`approval.resolved` 录制值 | 否 |
| 从检查点分叉 | 是，`fork_of` + `fork_seq` | 原快照（可带补丁修改参数）+ 截止到该 seq 的事件（复制，标记来源）+ 检查点 | 分叉点之后真实调用 |
| 从节点重跑 | 是（分叉的特例） | 上游节点输出复用（状态 cached），该节点及下游重跑 | 该节点起真实调用 |
| 单节点重放 | 否（临时执行，不进事件日志） | 节点记录的输入 + 录制响应；`live=true` 时真实调用一次用于对比 | 默认否 |

- 回放时 `RunCtx.Replaying()=true`，`LLM()` / `Tool()` 返回录放包装（`E.01-R4`）；编排者读 `orch.expanded`（`E.17.04`）；审批不再弹出。
- 注册表哈希不同：回放给 warn 仍执行；**续跑和分叉**拒绝并提示从检查点开新运行（`C.12-R6`、`R7`——分叉本身就是新运行，用新的注册表，所以分叉允许，续跑不允许）。
- 分叉的界面文案"从运行 #12 分叉"（`U.19.05`）。

## 6. 不变量
- 回放发出的网络请求数为 0
- 回放的最终状态与原运行一致

## 7. 错误处理
录制缺失（例如事件被清理）：回放失败并说明缺哪一段。

## 8. 验收标准
1. 回放闭环模板零请求且结果一致（M5 验收）
2. 从第 2 轮检查点分叉并修改参数
3. 从节点重跑上游为 cached
4. 单节点重放对比

### 实施卡
- 要建 / 要改的文件：`engine/run/replay.go`、`engine/run/fork.go`、`engine/run/replay_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1605-T1 回放零请求`
  - `E1605-T2 分叉`
  - `E1605-T3 节点重跑`
  - `E1605-T4 单节点重放`
  - `E1605-T5 续跑注册表哈希不同`：拒绝续跑，提示从检查点 fork 一次新运行（`C12-T3`）
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
