# C.06.05 路径 ID 规则

| 项 | 内容 |
|---|---|
| 编号 | C.06.05 |
| 类型 | 实施 |
| 上级 | C.06 事件 |
| 下级 | 无 |
| 状态 | 草稿 |
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
    "scopes":  { "type": "array", "items": { "type": "object", "required": ["node_id"], "properties": { "node_id": { "$ref": "#/$defs/Ulid" }, "iter": { "$ref": "#/$defs/Iter" } } },
                 "description": "从外到内每一层容器节点及其迭代号，用来唯一确定一次执行" },
    "iter":    { "$ref": "#/$defs/Iter", "description": "本节点自身的迭代（C7 展开的份号、重试次数）" }
  }
}
```
- **C.06.05-R5** "一次节点执行"的唯一键 = `node_id` + 每层 `scopes` 的迭代号 + 自身 `iter`。状态投影、检查点、幂等键都用这个键（规范化为字符串：`<node_id>|<scope1_id>:r2|<scope2_id>:f3|a1`）。

## 4. 验收标准
1. 闭环迭代模板第 2 轮执行池第 3 份里的执行者，路径为 `根图/闭环迭代#r2/执行池#3/执行者`。
2. 显示名含 `/` 的节点，路径里显示为全角。
3. 改名后，用旧 `node_id` 仍能查到历史事件。

### 实施卡
- 要改的文件：`schema/common.schema.json`（`Iter`、`Loc`）。
- 测试用例：`C0605-T1`…`T3`。路径生成函数在 `E.09.01`，前后端各一份，用同一组测试向量 `schema/examples/paths.json`。
