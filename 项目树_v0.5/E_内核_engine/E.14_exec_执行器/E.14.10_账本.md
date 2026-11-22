# E.14.10 账本

| 项 | 内容 |
|---|---|
| 编号 | E.14.10 |
| 类型 | 实施 |
| 上级 | E.14 exec 执行器 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
账本节点：外置状态的读写口。节点之间需要共享状态时必须显式经过账本（INV-04）。

## 2. 不做什么
- 不提供跨运行的全局可写存储以外的东西（`named` 作用域除外）

## 3. 继承的上级约束
INV-04、`C.13.03`（字段属性）、`C.02.04-R4`（writeback）、`引03` §5.10。

## 4. 接口
| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `op` | enum：read / write / append / cas / watch | read | 内联 |
| `path` | string | 目标树 | 字段路径；内联 |
| `scope` | enum：local / parent / named | local | — |
| `name` | string | — | scope=named 时的账本名 |
| `reason` | string | — | 写入理由；字段 `require_reason` 时必填 |

输入：`value`（任意）。输出：`value`（状态@1 = `{store, path, version, value}`）。

## 5. 行为
- 作用域：`local` = 当前子图的这一次执行（每轮、每份各自独立）；`parent` = 上一层（需要上一层子图引用节点的 `writeback` 声明允许）；`named` = 跨运行的命名账本（属于图，不属于运行）。
- 写入校验（由内核执行）：`readonly_except`（只有指定标签的节点能写）、`append_only`、`require_reason`。
- `cas`：带读到的版本号写入；版本不符 → `ErrConflict`（transient，可重试）。
- `watch`：注册订阅；字段变化时向所在 event 循环投递事件（`ledger.changed`）。
- 每次写入写 `ledger.changed` 事件；值的污染标记随值保存（`E.06.03`）。

## 6. 不变量
- local 账本在扇出各份之间互不可见（`isolation=true` 时）

## 7. 错误处理
越权写：auth_denied；冲突：transient。

## 8. 验收标准
1. 五种 op
2. readonly_except
3. cas 冲突重试
4. parent 写回受 writeback 限制
5. watch 唤醒 event 循环

### 实施卡
- 要建 / 要改的文件：`engine/exec/ledger/*.go`、`schema/builtin/nodedefs/账本.yaml`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1410-T1 五种 op`
  - `E1410-T2 只读字段`
  - `E1410-T3 cas`
  - `E1410-T4 writeback`
  - `E1410-T5 watch`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
