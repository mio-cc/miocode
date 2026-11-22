# E.14.05 扇出

| 项 | 内容 |
|---|---|
| 编号 | E.14.05 |
| 类型 | 实施 |
| 上级 | E.14 exec 执行器 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
扇出节点：把一份输入变成 N 份，每份执行一次子图，并行（受并发限制），按汇合方式收集结果。

## 2. 不做什么
- 不定义子图内容（来自节点的 `children`，`C.02.04`）

## 3. 继承的上级约束
`C.02.04` 容器规则、`C.06.05-R3`（份号路径）、`引03` §5.5。

## 4. 接口
| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `n` | integer 1–32 | 3 | `items` 没有连线时使用：复制 `shared` 输入 N 份 |
| `concurrency` | integer 1–64 | 3 | 内联 |
| `collect` | enum：all / k_of_n / first / timeout | all | 内联 |
| `k` | integer | 2 | collect=k_of_n 时 |
| `timeout_ms` | integer | 300000 | collect=timeout 时 |
| `isolation` | boolean | true | 每份独立的局部账本 |
| `on_fail` | enum：fail / skip | fail | 某一份失败时 |
| `budget_split` | enum：equal / on_demand | equal | 预算怎么分给每份 |
| `max_items` | integer | 1000 | 超出直接失败 |

输入：`items`（列表[$T]）、`shared`（任意，多连，每份都能拿到）。输出：`results`（列表[$U]，U = 子图出口类型）。

## 5. 行为
- 每份调用 `rc.Subgraph(children, {in: item, shared}, SubOpts{Scope: {fan: i+1}, Isolated, Budget: 划拨})`。
- 并发用信号量控制；每份完成写检查点 `Done[i]`，恢复时已完成的份不重跑。
- `k_of_n`：收到 K 份即**软取消**其余份（取消原因 `k_of_n_satisfied`，`E.16.06`）；`first` 同理；`timeout`：到时取已完成的，结果 `Partial=true`。
- `on_fail=skip`：失败份的结果为 null，不中断其他份；`fail`：取消其余份并失败。
- 结果顺序与输入顺序一致（不按完成顺序）。

## 6. 不变量
- 并发不超过 `concurrency`
- 恢复时已完成的份不重复执行
- 结果顺序确定

## 7. 错误处理
超过 `max_items`：user_input；子图失败按 `on_fail`。

## 8. 验收标准
1. 4 份并发 3：同时最多 3 个
2. k_of_n=2 时其余被软取消
3. 崩溃后恢复只重跑未完成的份
4. timeout 部分结果

### 实施卡
- 要建 / 要改的文件：`engine/exec/fanout/*.go`、`schema/builtin/nodedefs/扇出.yaml`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1405-T1 并发`
  - `E1405-T2 k_of_n`
  - `E1405-T3 恢复`
  - `E1405-T4 timeout`
  - `E1405-T5 on_fail`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
