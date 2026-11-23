# C.06.05 路径 ID 规则

| 项 | 内容 |
|---|---|
| 编号 | C.06.05 |
| 类型 | 实施 |
| 上级 | C.06 事件 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引11 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义运行路径（给人看、用来查询）和位置 `Loc`（给程序用、用来引用）。

## 2. 运行路径格式
```
<根图>/<容器节点显示名>[#r<轮次>][#e<事件序号>]/…/<节点显示名>[#<份号>][@<重试次数>]
```
| 片段 | 何时出现 | 例子 |
|---|---|---|
| `根图` | 总是第一段 | `根图` |
| 容器节点显示名 | 进入循环、扇出、子图引用的子图时 | `根图/闭环迭代` |
| `#rN` | 循环的第 N 轮（从 1 开始） | `根图/闭环迭代#r2` |
| `#eN` | 事件模式循环的第 N 次唤醒 | `根图/主脑#e14` |
| `#N` | 扇出的第 N 份，或 C7 自动展开的第 N 项（从 1 开始） | `…/执行池#3/执行者` |
| `@N` | 第 N 次重试（第一次不写） | `…/执行者@2` |

- **C.06.05-R1** 同一层有重名节点时，在显示名后加 `~` 和节点 ID 末 4 位：`决策者~7F2A`。
- **C.06.05-R2** 显示名里的 `/ # @ ~` 替换成全角字符 `／ ＃ ＠ ～`。
- **C.06.05-R3** 扇出的份号写在**扇出节点**后面（`执行池#3/执行者`），因为每一份是扇出子图的一次执行。旧文档的例子 `执行池/执行者#3` 不准确，以本文为准。
- **C.06.05-R4** 路径只用于显示和按前缀查询。**引用节点一律用 `node_id` + `iter`**，所以节点改名不影响历史查询。

## 3. 位置 Loc（`common.schema.json`）
```json
"Iter": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "round":   { "type": "integer", "minimum": 1 },
    "event":   { "type": "integer", "minimum": 1 },
    "fan":     { "type": "integer", "minimum": 1 },
    "attempt": { "type": "integer", "minimum": 1, "default": 1 }
  }
},
"Loc": {
  "type": "object",
  "required": ["node_id", "path"],
  "additionalProperties": false,
  "properties": {
    "node_id": { "$ref": "#/$defs/Ulid" },
    "path":    { "type": "string", "maxLength": 1000 },
    "scopes":  { "type": "array", "items": { "type": "object", "required": ["node_id"], "additionalProperties": false, "properties": { "node_id": { "$ref": "#/$defs/Ulid" }, "iter": { "$ref": "#/$defs/Iter" } } },
                 "description": "从外到内每一层容器节点及其迭代号，用来唯一确定一次执行" },
    "iter":    { "$ref": "#/$defs/Iter", "description": "本节点自身的迭代（C7 展开的份号、重试次数）" }
  }
}
```
- **C.06.05-R5** "一次节点执行"的唯一键 = `node_id` + 每层 `scopes` 的迭代号 + 自身 `iter`。状态投影、检查点、幂等键都用这个键（规范化为字符串：`<node_id>|<scope1_id>:r2|<scope2_id>:f3|a1`）。写法：先写 `node_id`；再按从外到内每层容器接 `|<容器 node_id>:<迭代>`；最后接 `|<自身迭代>`。`<迭代>` 是 `Iter` 里出现的字段，按 `round`、`event`、`fan`、`attempt` 的顺序写成 `r2`、`e14`、`f3`、`a2`，有多个时用 `.` 连接（如 `f2.a1`）；容器的迭代不写 `attempt`；自身迭代总写 `a<attempt>`（缺省 `a1`），有 C7 展开份号时在前面加 `f<N>.`。

## 4. 测试向量 `schema/examples/path_vectors.json`
路径生成函数（`E.09.01`，前后端各一份）用同一组向量（`Q-R5`）：
```json
[
  {
    "name": "闭环迭代第 2 轮、执行池第 3 份里的执行者",
    "chain": [
      { "node_id": "01JDN0000000000000000000A2", "label": "闭环迭代", "iter": { "round": 2 } },
      { "node_id": "01JDN0000000000000000000B4", "label": "执行池", "iter": { "fan": 3 } },
      { "node_id": "01JDN0000000000000000000C1", "label": "执行者", "iter": { "attempt": 1 } }
    ],
    "path": "根图/闭环迭代#r2/执行池#3/执行者",
    "key": "01JDN0000000000000000000C1|01JDN0000000000000000000A2:r2|01JDN0000000000000000000B4:f3|a1"
  }
]
```
- `chain` 从外到内，最后一项是节点本身，前面各项是容器；`iter` 符合 `Iter`。
- 某一项写 `"same_label": true` 表示同一层有重名节点（R1）。
- 至少 8 条，覆盖：根图下的直接节点、`#r`、`#e`、扇出份号、C7 展开份号、`@N` 重试、`~` 重名、全角替换（R2）。
- 原来的 `paths.json` 改名为 `path_vectors.json`（测试向量统一以 `_vectors.json` 结尾，`C.01-R22`）。

## 5. 验收标准
1. 闭环迭代模板第 2 轮执行池第 3 份里的执行者，路径为 `根图/闭环迭代#r2/执行池#3/执行者`。
2. 显示名含 `/` 的节点，路径里显示为全角。
3. 改名后，用旧 `node_id` 仍能查到历史事件。

### 实施卡
- 要建 / 要改的文件：`schema/common.schema.json`、`schema/examples/path_vectors.json`、`schema/examples/manifest.yaml`、`schema/examples/loc_loop_executor.json`、`schema/examples/invalid/loc_round_zero.json`、`tools/schemacheck/loc_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0605-T1 Loc 与 Iter`：清单里的 `loc_loop_executor.json`（§5 验收 1 那次执行的 `Loc`）通过；`invalid/loc_round_zero.json` 在 `/iter/round` 失败；`scopes` 里多一个字段失败（测试里内联）
  - `C0605-T2 路径向量`：`path_vectors.json` 每条的 `chain[].iter` 符合 `Iter`、`node_id` 符合 `Ulid`；覆盖 §4 列出的各种情况；`key` 符合 R5 的写法（正则写在测试里）
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 由 `chain` 算出 `path`、`key`：`E0901-T4`（`E.09.01`），前端的同一份实现用同一组向量（`Q-R5`）
  - §5 验收 3（改名后用旧 `node_id` 仍能查到历史事件）：`E.09.01`
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `Loc.scopes` 的元素加 `additionalProperties: false`；R5 写明唯一键的字符串写法；新增 §4 路径测试向量格式，`paths.json` 改名 `path_vectors.json`；实施卡改为机器可读写法 | `P.09` K201、K204、K206 |
