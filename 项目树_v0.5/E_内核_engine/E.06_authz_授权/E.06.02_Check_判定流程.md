# E.06.02 Check 判定流程

| 项 | 内容 |
|---|---|
| 编号 | E.06.02 |
| 类型 | 实施 |
| 上级 | E.06 authz 授权 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引07 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现 `Checker.Check`：对一个（主体、动作、目标、上下文）给出 allow / propose / ask / deny 及理由。

## 2. 不做什么
- 不负责把 ask 变成审批或提议（调用方负责：Op 流水线 → 提议；工具调用 → 审批）

## 3. 继承的上级约束
INV-09、INV-10、INV-15、INV-16、`C.09` §5、`S.04`。

## 4. 接口
```go
type Checker interface {
    Check(ctx context.Context, req Request) Result
}
type Request struct {
    Actor   gen.Actor
    Parent  *gen.Actor           // 上级编排者链（下放）
    Action  gen.Action
    Target  Target               // {Session, Graph, Node, Scope, Field, Tool, Model}
    Taint   bool
    TaintSrc []string
    Mandate string               // 调用方指定的授权书（可选）
    Stats   *PatchStats          // apply_patch 时：新增节点数、深度、涉及的工具和模型
    Cost    *obs.Budget          // 预估花费
}
type Result struct {
    Effect  gen.Effect           // allow | propose | ask | deny
    Reasons []string
    Mandate string
    Level   int
}
```

## 5. 行为
判定顺序（`C.09` §5 叠加规则）：
1. `estop.release` 且 actor 不是 user → deny（硬编码，第一步，INV-10）。
2. actor 为 user：急停中只允许读和 `estop.*`；否则 allow。
3. 急停中（全局或该运行）：模型、外部一律 deny（读除外）。
4. 解析有效授权（`E.06.01`）。
5. `deny` 列表命中 → deny。
6. 查判定表 `(level, action)` 得到基础结果；档位 2 时按 `overrides`（scope、ops、tools_max_risk、tools_allow、models、max_nodes、max_depth、allow_spawn）调整；档位 3、4 时 `except` 命中的改为 ask。
7. 档位 4 的特殊禁止：修改授予自己的授权书、新建更宽的授权书、设置 `l3_skip_human`、关闭审计 → deny（`S.04-R4`）。
8. 污染：`taint=true` 且动作是修改性动作且授权书 `taint=ask` → allow 改为 ask（若信任来源列表覆盖全部 `TaintSrc` 则不改，`S.05-R6`）。
9. 预算：`Cost` 超出剩余预算 → ask。
10. 写审计（ask、deny、修改性 allow）。

## 6. 不变量
- 判定是纯函数：相同输入（含时钟、授权书集合）结果相同
- `estop.release` 对非 user 永远 deny

## 7. 错误处理
内部错误（例如授权书解析失败）一律返回 deny，原因"授权判定失败，已记录"，并记 error 日志——宁可拒绝也不放行。

## 8. 验收标准
1. 判定表每一格（C09-T1）
2. 档位 4 禁止项
3. 污染转审核与信任来源
4. 预算转审核
5. 内部错误默认拒绝
6. 单次判定 p99 < 1ms

### 实施卡
- 要建 / 要改的文件：`engine/authz/check.go`、`engine/authz/table.go`、`engine/authz/check_test.go`、`engine/authz/bench_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0602-T1 全表`：`authz_matrix.yaml` 每一格（`C09-T1`）；模型请求 `estop.release` 在任何授权书下都是 deny（`C09-T2`）
  - `E0602-T2 档位 4 禁止`：档位 4 的模型改给自己授权的那份授权书 → deny（`C09-T3`）
  - `E0602-T3 污染`
  - `E0602-T4 预算`
  - `E0602-T5 故障默认拒绝`
  - `E0602-T6 BenchmarkCheck`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
