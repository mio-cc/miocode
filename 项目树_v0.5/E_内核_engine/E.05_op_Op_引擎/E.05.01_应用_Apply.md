# E.05.01 应用 Apply

| 项 | 内容 |
|---|---|
| 编号 | E.05.01 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引08 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现 Op 流水线 `Submit`，以及每种 Op 的应用函数和逆操作计算。

## 2. 不做什么
- 不实现授权判定本身（调用 `authz.Checker`）
- 不实现 HTTP 接口（`B.04.02`）

## 3. 继承的上级约束
`C.05.01`–`C.05.03`、INV-08、INV-09、`E.05-R1`–`R3`。

## 4. 接口
```go
type Pipeline struct{ /* store、registry、authz、bus、runs 通知 */ }

type Batch struct {
    GraphID     string
    Branch      string
    BaseVersion int64
    GroupID     string
    Actor       gen.Actor          // 由调用方（API 层 / 编排者）根据鉴权结果填写
    Approver    *gen.Actor
    MandateID   string
    Taint       bool
    Ops         []gen.Op
}

type Result struct {
    Version  int64
    Applied  []string            // op id
    Rebased  bool
    IDMap    map[string]string   // tmp:N → ULID
    Diags    []gen.Diag          // warn 级
    Proposal string              // 非空表示已转为提议（HTTP 202）
}

func (p *Pipeline) Submit(ctx context.Context, b Batch) (*Result, error)

type Applier func(g *mutable, op *gen.Op) (inverse gen.Op, touched Touched, err error)
var appliers = map[gen.OpKind]Applier{ /* 每种 Op 一个，在 apply_*.go 中注册 */ }
```

## 5. 行为
```
Submit(b):
 0. 结构校验：每条 Op 按 op.schema.json；模型 actor 缺 reason → ErrBadRequest
 1. 计算每条 Op 的 Target（忽略客户端传入值，C.05.01 §3）
 2. Tx 开始；读 head（行锁 / 单写者）
 3. base < head：取 missed ops；Commutes → Rebase；否则 ErrConflict{head, missed, conflicts}
 4. 授权钩子（E.05.05）：deny → ErrForbidden；需要审核 → 存提议（E.17.03），返回 Result{Proposal}
 5. 在 Clone 上逐条 Apply，收集 inverse 和 touched；任一失败 → ErrInvalid，回滚
 6. ValidateIncremental；有 error → ErrInvalidGraph{diags}，回滚
 7. 写 ops（含 inverse、actor、approver、group_id）、写新版本（每 50 版存全文）、更新 packages 字段、写审计
 8. Tx 提交；afterCommit：广播 op.applied（每条一个事件）、通知运行管理器（E.16.02）
```
- 每种 Op 的应用逻辑放在独立文件 `apply_<kind>.go`，同时实现逆操作计算（`C.05.03` 表）。
- `group`：生成子图引用节点，选中节点移入 `children`，自动加入入口 / 出口端口节点，跨边界连线改接，改接记录写进 payload 的 `rewire`（服务器填写）。
- 临时 ID 替换在第 5 步之前完成（`C.08-R2`）。

## 6. 不变量
- 任意 Op 序列：应用后再逆序应用逆操作，图哈希与原图相同（`C.05.03-R1`）
- 版本号在同一分支连续，无空洞（拖动合并除外）
- 失败的批次不留下任何写入

## 7. 错误处理
错误类型 `ErrBadRequest`、`ErrConflict`、`ErrForbidden`、`ErrNodeLocked`、`ErrInvalid`、`ErrInvalidGraph`、`ErrEstopped`，在 `internal/api/errors.go` 映射到 `C.11` §3 的错误码。

## 8. 验收标准
1. `schema/examples/ops/` 每个合法示例应用成功、非法示例按预期失败
2. 属性测试 1000 组逆操作往返
3. 100 个并发提交，版本连续、无丢失
4. 批次中第 3 条失败，前 2 条不落库
5. 模型伪造 actor 无效

### 实施卡
- 要建 / 要改的文件：`engine/op/pipeline.go`、`engine/op/apply_*.go（每种 Op 一个）`、`engine/op/target.go`、`engine/op/tmpid.go`、`engine/op/pipeline_test.go`、`engine/op/prop_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0501-T1 每种 Op 正反例`：每种 Op 违反前置条件时报错；模型提交 `set_lock` 返回 403；`connect` 到已有连线的非多连端口时替换旧连线、撤销后恢复（`C0502-T2`、`C0502-T3`）
  - `E0501-T2 逆操作属性测试（C0503-T1）`
  - `E0501-T3 并发 100（C0504-T1）`
  - `E0501-T4 批次原子性（C0501-T3）`
  - `E0501-T5 actor 不可伪造、模型不带 reason 返回 400（C0501-T1、C0501-T2）`
  - `E0501-T6 group/ungroup 改接正确`
- 允许使用的依赖：标准库、`pgregory.net/rapid`（测试）
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
