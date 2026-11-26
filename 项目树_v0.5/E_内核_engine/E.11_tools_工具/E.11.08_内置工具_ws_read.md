# E.11.08 内置工具：ws_read

| 项 | 内容 |
|---|---|
| 编号 | E.11.08 |
| 类型 | 实施 |
| 上级 | E.11 tools 工具 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引06 §6；`P.09` K268、K271 |
| 最后修改 | 2026-11-26 |

## 1. 职责
内置工具 `builtin:ws_read`：按引用读工作区原文，可以指定起点、长度和关键词。上下文溢出的 `pointer` 模式（`E.13.04`）和工具结果的原文指针（`E.11.02`）都靠它让 Agent 读回原文。

## 2. 不做什么
- 不写工作区
- 不判断哪些引用"在本运行里出现过"：由运行通过 `Seen` 接口提供（第 ⑥ 片，`E.16.01`）
- 不负责把它注入到没连它的 Agent（`E.14.02`，第 ⑥ 片）

## 3. 继承的上级约束
`S.04` §3（文件读 L0）、`引06` §6、`E.11-R1`、`E.11-R2`、`E.11.01`。

## 4. 接口
```go
// engine/tools/builtin/wsread/wsread.go
type Seen interface { Seen(ref blob.Ref) bool }       // 本运行里出现过的引用
func New(r blob.Reader, seen Seen) tools.Impl
```
`Def`：`ID` `builtin:ws_read`，`Name` `ws_read`，L0，`Idempotent` 真，`TaintsResult` 真，`Timeout` 10 秒。参数：
| 参数 | 类型 | 说明 |
|---|---|---|
| `ref` | string，必填 | `ws://sha256:<hex>` |
| `offset` | integer ≥ 0，默认 0 | 从第几个字（rune）开始 |
| `limit` | integer 1–20000，默认 4000 | 最多读多少个字 |
| `query` | string，可选 | 只返回含关键词的段落（空行分段；关键词按空白分开，不区分大小写，任一命中即可） |

## 5. 行为
1. 解析参数，不合法返回 `user_input`（`bad_args`）。
2. 引用格式不对 → `user_input`（`bad_ref`）；`Seen` 返回假 → `user_input`（`ref_not_in_run`）"只能读本运行里出现过的引用"；内容不存在 → `user_input`（`ref_not_found`）。
3. 读出原文（最多 20 MB，超过 → `user_input`，`too_large`），按 rune 取 `[offset, offset+limit)`；有 `query` 时在这一段里只留命中的段落，段落之间用一个空行连接。
4. `Raw.Text` 是读出的文字；`Raw.Data` 是 `{ref, offset, limit, total, next_offset}`（`total` 是原文字数，读到结尾时 `next_offset` 为 -1）；`Raw.Sources` 是 `[ref]`。

## 6. 不变量
- 读本运行以外的引用一定被拒绝

## 7. 错误处理
见 §5；`ctx` 取消时返回 `cancelled`。

## 8. 验收标准
1. 分段读取：`offset`、`limit`、`next_offset` 正确，中文按字计
2. 越权读取被拒
3. 关键词过滤

### 实施卡
- 要建 / 要改的文件：`engine/tools/builtin/wsread/wsread.go`、`engine/tools/builtin/wsread/wsread_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1108-T1 分段读取`：1 万字的中文原文，`offset`=9000、`limit`=4000 读到结尾，`next_offset` 为 -1；默认参数读前 4000 字
  - `E1108-T2 越权`：`Seen` 返回假时报 `ref_not_in_run`，不读工作区
  - `E1108-T3 关键词`：只返回含关键词的段落，不区分大小写
  - `E1108-T4 参数与引用`：引用格式错、内容不存在、`limit` 超范围都是 `user_input`；通过 `tools.NewHandle` 调用时结果带污染标记、来源是这个引用
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 新建：M1 唯一的内置工具，从 `E.11.03` 分出来（检索、抓取留在 `E.11.03`，M2）；状态"已审" | `P.09` K268、K271 |
