# E.17.01 GraphPatch 应用

| 项 | 内容 |
|---|---|
| 编号 | E.17.01 |
| 类型 | 实施 |
| 上级 | E.17 orch 模型编排 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引10 |
| 最后修改 | 2026-11-22 |

## 1. 职责
把编排者产出的 GraphPatch 交给 Op 流水线：临时 ID 替换、整批判定、重复检测、失败时把诊断反馈给模型重试。

## 2. 不做什么
- 不实现判定（`E.05.05`、`E.06.02`）

## 3. 继承的上级约束
`C.08`、`E.17-R1`、`E.17-R2`。

## 4. 接口
```go
type Session struct{ /* 草稿图、工具调用记录、临时 ID 计数 */ }
func NewSession(base *graph.Graph, scope string, actor gen.Actor) *Session
func (s *Session) Finalize(rationale string, expected *gen.ExpectedEffect, origin string) (*gen.GraphPatch, error)
func (o *Orchestrator) Submit(ctx context.Context, p *gen.GraphPatch, actor gen.Actor, taint bool) (*op.Result, error)
func Fingerprint(p *gen.GraphPatch) string
```

## 5. 行为
1. `Finalize`：草稿与原图做结构化 Diff（`E.05.03`）→ 生成最少的 Op 序列（新增元素用 `tmp:N`）→ 计算 fingerprint。
2. 重复检测：同一会话或同一运行内 fingerprint 重复 → 不提交，返回给模型"这个修改和之前的提议相同"，并升级（防原地打转）。
3. 全量校验草稿：有 error → 把诊断作为工具结果喂回模型，让它修正（最多 2 次），仍失败 → 结束并在对话里说明。
4. `Submit`：作为一个批次交给 `op.Pipeline`（actor = 模型实例、taint = 上下文是否污染）；结果：直接应用 / 转提议（202）/ 拒绝。
5. fingerprint 规范化：去掉临时 ID 编号、理由、坐标；按 (kind, 目标, 参数) 排序；数值参数分桶（例如并发 3 和 4 视为相近）。

## 6. 不变量
- GraphPatch 的每条子 Op 都单独经过授权和校验
- 同一 fingerprint 在同一会话或运行内只提交一次

## 7. 错误处理
校验失败、重复、拒绝都以工具结果的形式返回给模型，并写进对话回复。

## 8. 验收标准
1. 对话改图 S2 场景（档位 1、3 各一次）
2. 重复提议被识别（改说法的同一修改）
3. 校验失败后模型修正

### 实施卡
- 要建 / 要改的文件：`engine/orch/session.go`、`engine/orch/finalize.go`、`engine/orch/fingerprint.go`、`engine/orch/submit_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1701-T1 S2 两档`
  - `E1701-T2 fingerprint 规范化`
  - `E1701-T3 校验反馈`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
