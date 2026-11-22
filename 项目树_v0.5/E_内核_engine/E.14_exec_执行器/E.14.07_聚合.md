# E.14.07 聚合

| 项 | 内容 |
|---|---|
| 编号 | E.14.07 |
| 类型 | 实施 |
| 上级 | E.14 exec 执行器 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
聚合节点：对列表做**纯规则**的结构化处理：计数、分组、比例、投票、去重、排序、取前 K、过滤、拼接、统计、分歧检测。

## 2. 不做什么
- 不调用模型、不做任何 IO

## 3. 继承的上级约束
`C.03.03` §5（`deterministic` kernel 锁）、`C.04.03` §2（算子类型表）、`引03` §5.7。

## 4. 接口
| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `op` | enum：count / group / group_ratio / vote / dedupe / sort / top_k / filter / concat / stats / divergence | group_ratio | 内联 |
| `key` | string（字段路径） | cluster | 内联 |
| `expr` | expr | — | filter、sort 的表达式 |
| `k` | integer | 3 | top_k |
| `levels` | object | — | group_ratio 的分级规则，如 `[{name: 共识, when: "ratio == 1"}]` |
| `deterministic` | — | true | kernel 锁 |

输入：`items`（列表[$T]，必）。输出：`result`（$U）。

## 5. 行为
- 表达式用 `expr-lang/expr`，环境只暴露 `item`、`items`、`count`、`ratio` 等只读变量；禁用所有函数调用以外的内置能力（无时间、无随机、无 IO）。
- 确定性：分组前按 key 排序再分组，不依赖 map 遍历顺序；浮点比较用固定精度。
- 缓存：总是（输入哈希 + 参数）。

## 6. 不变量
- 相同输入输出逐字节相同

## 7. 错误处理
表达式编译错误：Validate 报 V03；运行时求值错误：user_input，带出错的条目序号。

## 8. 验收标准
1. 每个算子至少 3 个用例
2. 打乱输入顺序 100 次结果一致（除 sort 语义外）
3. 表达式无法访问时间和随机

### 实施卡
- 要建 / 要改的文件：`engine/exec/aggregate/*.go`、`schema/builtin/nodedefs/聚合.yaml`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1407-T1 各算子`
  - `E1407-T2 确定性`
  - `E1407-T3 表达式沙箱`
- 允许使用的依赖：标准库、`expr-lang/expr`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
