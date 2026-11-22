# B.04.02 ops 操作提交

| 项 | 内容 |
|---|---|
| 编号 | B.04.02 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

## 1. 职责
提交操作、撤销重做、撤回、分支与合并、提议的处理。这是**唯一能改图的接口组**（`B.04-R2`）。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| POST | `/graphs/{id}/ops` | 提交一批 Op（`C.05.01` §4） | `{branch, base_version, group_id?, ops}` → 200 `Result` / 202 `{proposal_id}` / 409 |
| GET | `/graphs/{id}/ops?branch=&since_version=&actor=&cursor=` | 操作历史 | → `Page<OpRecord>` |
| POST | `/graphs/{id}/undo` | 撤销当前用户最近一组 | `{branch}` → `Result` |
| POST | `/graphs/{id}/redo` | 重做 | `{branch}` → `Result` |
| POST | `/graphs/{id}/ops/{op_id}/revert` | 撤回任意一条（含模型的） | → `Result` |
| POST | `/graphs/{id}/revert` | 回到某个版本 | `{branch, version}` → `Result` |
| GET | `/graphs/{id}/branches` | 分支列表（含落后 / 领先数） | → `Branch[]` |
| POST | `/graphs/{id}/branches` | 新建草稿分支 | `{name, from, at_version?}` → `Branch` |
| DELETE | `/graphs/{id}/branches/{name}` | 软删除分支 | → 204 |
| POST | `/graphs/{id}/branches/{name}/rebase` | rebase 到 main | → `Branch` |
| POST | `/graphs/{id}/branches/{name}/merge/preview` | 合并预览 | → `MergePreview` |
| POST | `/graphs/{id}/branches/{name}/merge` | 合并 | `{into, resolutions}` → `Result` |
| GET | `/graphs/{id}/proposals?status=open` | 提议列表 | → `Proposal[]` |
| GET | `/proposals/{pid}` | 提议详情 | → `Proposal` |
| GET | `/proposals/{pid}/preview` | 幽灵预览（`C.08` §4.3） | → `ProposalPreview` |
| POST | `/proposals/{pid}/decide` | 逐条处理 | `{accept, reject}` → `Result` |
| POST | `/proposals/{pid}/accept-all` · `/reject-all` | 全部采纳 / 拒绝 | → `Result` |
| POST | `/graphs/{id}/presence` | 上报正在编辑的节点（`B.05.04`） | `{scope, editing, cursor?}` → 204 |

## 5. 行为
- `actor` 一律来自鉴权（`Caller.Actor`），请求体里的 actor 字段被忽略（`C.05.01` §3）。
- 409 响应带 `missed_ops`，前端据此本地合并（`W.05`）。
- 采纳提议：内部以用户身份把被采纳的 Op 提交给流水线，`approver=user`（`C.08-R7`）。
- `presence` 是 E 级事件，不落库，不经过 Op。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/ops.go`、`internal/api/branches.go`、`internal/api/proposals.go`、`internal/api/ops_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0402-T1 提交 200/202/409/422/423`
  - `B0402-T2 撤销只撤自己的`
  - `B0402-T3 revert 模型的修改`
  - `B0402-T4 合并`
  - `B0402-T5 提议逐条处理`
  - `B0402-T6 伪造 actor 无效`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
