# B.04.04 approvals 审批

| 项 | 内容 |
|---|---|
| 编号 | B.04.04 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

## 1. 职责
查询和处理审批（工具调用、启动运行、提权、预算、人工节点）。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/approvals?status=pending&run_id=&session_id=` | 待办列表（同类合并后的分组，`S.04-R10`） | → `ApprovalGroup[]` |
| GET | `/approvals/{aid}` | 详情：谁、要做什么、风险、关键参数、污染来源 | → `Approval` |
| POST | `/approvals/{aid}/resolve` | 处理 | `{outcome, scope: once\|always, note?, value?, trust_sources?}` → `Approval` |
| POST | `/approvals/resolve-batch` | 一次处理一组 | `{ids, outcome, scope}` → `Approval[]` |

## 5. 行为
- 处理顺序：**先写 `approval.resolved` 事件**，再更新记录，再通知运行（INV-11、`E.14.11.01`）。
- `scope=always`：只对 L0–L2 工具有效；生成一条只放宽这个工具、挂在当前容器节点上的授权书规则（`S.04-R9`）。
- `trust_sources`：本次运行信任这些污染来源（`S.05-R6`）。
- 仅用户可以处理（`B.04-R4`）。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/approvals.go`、`internal/api/approvals_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0404-T1 批准驳回`
  - `B0404-T2 重复处理 409`
  - `B0404-T3 always 只放宽一个工具一层`
  - `B0404-T4 先落事件`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
