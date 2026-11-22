# E.14.03 上下文装配节点

| 项 | 内容 |
|---|---|
| 编号 | E.14.03 |
| 类型 | 实施 |
| 上级 | E.14 exec 执行器 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
上下文装配节点：调用 `ctxasm` 把输入装配成上下文包，作为 Agent 的 context 输入。

## 2. 不做什么
- 不调用模型（摘要通过 `exec.Summarizer` 的内部 Agent 执行完成）

## 3. 继承的上级约束
`E.13`、INV-07。

## 4. 接口
| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `recipe` | recipe_ref | 执行者配方@1 | 内联 |
| `budget` | number 0.02–0.5 | 0.1 | 内联；预算 × 窗口 |
| `on_overflow` | enum：pointer / summarize / truncate / reject | pointer | 覆盖配方设置 |
| `honor_inherit` | — | true | kernel 锁 |

输入：`in`（任意，多连）、`model`（资源引用，决定窗口）。输出：`context`（上下文包@1）、`dropped`（列表[任意]：被裁掉内容的引用）。

## 5. 行为
- `Run`：编译配方（缓存）→ `ctxasm.Assemble` → 输出。
- 缓存：`CacheKey = sha256(配方版本 ‖ 输入值哈希 ‖ 模型窗口 ‖ budget ‖ on_overflow)`；`summarize` 模式下摘要结果也随缓存复用。

## 6. 不变量
- 输出类型永远是 `上下文包@1`

## 7. 错误处理
见 `E.13.02`。

## 8. 验收标准
1. 闭环模板里 6 个装配节点运行正确
2. 缓存命中时状态为 cached

### 实施卡
- 要建 / 要改的文件：`engine/exec/ctxassembly/*.go`、`schema/builtin/nodedefs/上下文装配.yaml`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1403-T1 模板运行`
  - `E1403-T2 缓存`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
