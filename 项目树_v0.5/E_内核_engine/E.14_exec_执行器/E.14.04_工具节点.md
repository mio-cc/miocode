# E.14.04 工具节点

| 项 | 内容 |
|---|---|
| 编号 | E.14.04 |
| 类型 | 实施 |
| 上级 | E.14 exec 执行器 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
工具节点：两种用法——作为**端点**连到 Agent 的 `tools`，让 Agent 自己决定调用；或者**直接调用**一次，把结果输出给下游。

## 2. 不做什么
- 不实现工具（`E.11`）

## 3. 继承的上级约束
`E.11.01`、INV-09、INV-14。

## 4. 接口
| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `tool` | tool_ref | builtin:search | 内联 |
| `risk` | enum：L0–L3 | 取工具声明 | 只能调高（内联显示） |
| `rate` | integer 1–120 | 10 | 每分钟上限，只能比全局配置更小 |
| `args` | object | {} | 直接调用时的参数；可以用 `{{inputs.request.字段}}` 引用输入 |
| `result_type` | type_ref | 任意 | 直接调用时结果的类型 |
| `trim` | enum：relevant / head / none | relevant | — |
| `keep_pointer` | — | true | kernel 锁 |

输入：`request`（任意）。输出：`endpoint`（工具端点@1）、`result`（$T）。

## 5. 行为
- 判断模式：`endpoint` 输出有连线 → 端点模式（本节点执行时只输出端点描述 `{tool, risk, schema_ref, rate}`，不调用工具）；`result` 有连线 → 直接调用；两者都有 → 两种都做。
- 直接调用：`rc.Tool(tool).Call(args, taint=输入污染)`；actor 为 `runtime/node:<id>`，授权按所在位置对模型的授权判定（`C.09` §4.1）。
- 缓存：只对 L0 工具，`CacheKey = sha256(tool ‖ 规范化 args)`，默认 1 小时（可配置）。

## 6. 不变量
- 端点模式不产生任何工具调用

## 7. 错误处理
见 `E.11.01`。

## 8. 验收标准
1. 端点模式
2. 直接调用模式
3. L0 缓存命中
4. L2 直接调用触发审批

### 实施卡
- 要建 / 要改的文件：`engine/exec/tool/*.go`、`schema/builtin/nodedefs/工具.yaml`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1404-T1 端点`
  - `E1404-T2 直接调用`
  - `E1404-T3 缓存`
  - `E1404-T4 审批`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
