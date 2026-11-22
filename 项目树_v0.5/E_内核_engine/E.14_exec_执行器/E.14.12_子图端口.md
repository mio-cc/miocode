# E.14.12 子图端口

| 项 | 内容 |
|---|---|
| 编号 | E.14.12 |
| 类型 | 实施 |
| 上级 | E.14 exec 执行器 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
子图端口节点：子图的边界。入口把父层传入的值发出；出口把值交还父层；摘要端口向外报告进度；升级端口向外求助。

## 2. 不做什么
- 不在父层出现（父层只看到容器节点的端口）

## 3. 继承的上级约束
INV-03、`C.02.04-R2`、`R3`。

## 4. 接口
| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `role` | enum：entry / exit / summary / escalation | entry | 内联 |
| `port_name` | string | in / out | 对应父节点的端口名 |
| `trigger` | enum：each_round / on_change / on_finish | on_finish | summary：什么时候产生简报 |
| `max_chars` | integer | 800 | summary：简报长度上限 |
| `routes` | object | — | escalation：本层路由规则 |

输入：`in`（$T）。输出：`out`（$T）。

## 5. 行为
- entry：执行时直接输出父层传入的对应端口值（`rc.Subgraph` 调用时注入）。
- exit：收集到的值作为子图输出交还父层。
- summary：**不调用模型**，用确定性模板从本层投影取数（目标、状态、结论、验收检查、花费，`引11` §7）；超过 `max_chars` 时截断并给出引用。写 `brief.updated`（按 goal_id 只保留最新）。
- escalation：见 `E.14.11.02`。

## 6. 不变量
- entry / exit 端口集合与父节点端口一一对应

## 7. 错误处理
无。

## 8. 验收标准
1. 三层嵌套里入口和出口值正确传递
2. summary 不产生 llm.call
3. 简报覆盖

### 实施卡
- 要建 / 要改的文件：`engine/exec/subport/*.go`、`schema/builtin/nodedefs/子图端口.yaml`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1412-T1 传值`
  - `E1412-T2 简报无模型调用`
  - `E1412-T3 覆盖`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
