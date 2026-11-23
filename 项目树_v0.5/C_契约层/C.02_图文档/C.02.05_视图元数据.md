# C.02.05 视图元数据

| 项 | 内容 |
|---|---|
| 编号 | C.02.05 |
| 类型 | 实施 |
| 上级 | C.02 图文档 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义图文档里**只影响显示、不影响运行**的数据：节点坐标、节点显示选项、便签。

## 2. 不做什么
- **视口（平移位置、缩放比例）不进图文档。** 视口是每个用户自己的界面状态，存在前端本地（`W.03.02`）。这样平移缩放不会产生 Op、不会增加版本号（旧版 `Subgraph.view` 字段取消，`P.09` K14）。
- 选中状态、展开的面板、当前所在层也不进图文档。

## 3. 定义
```json
"Pos": {
  "type": "object",
  "required": ["x", "y"],
  "additionalProperties": false,
  "properties": { "x": { "type": "integer" }, "y": { "type": "integer" } },
  "description": "世界坐标，单位 px，节点左上角；前端负责吸附到 20px 网格，后端不强制"
},
"NodeUi": {
  "type": "object",
  "x-open": true,
  "description": "开放对象，未知字段原样保留",
  "properties": {
    "collapsed": { "type": "boolean", "default": false, "description": "折叠后只显示标题行" },
    "width":     { "type": "integer", "minimum": 160, "maximum": 640, "description": "用户拖宽后的宽度；缺省用类型默认宽度" },
    "color":     { "enum": ["none", "c1", "c2", "c3", "c4", "c5", "c6"], "default": "none",
                   "description": "标记色，映射到设计令牌 --hx-mark-c1…c6（U.03）" }
  }
},
"Note": {
  "type": "object",
  "required": ["id", "pos", "text"],
  "additionalProperties": false,
  "description": "便签：画布上的说明文字，不连线、不参与运行",
  "properties": {
    "id":    { "$ref": "common.schema.json#/$defs/Ulid" },
    "pos":   { "$ref": "#/$defs/Pos" },
    "size":  { "type": "object", "required": ["w", "h"], "additionalProperties": false, "properties": { "w": { "type": "integer", "minimum": 80 }, "h": { "type": "integer", "minimum": 40 } } },
    "text":  { "type": "string", "maxLength": 4000, "description": "Markdown，只支持粗体、斜体、列表、链接" },
    "color": { "enum": ["none", "c1", "c2", "c3", "c4", "c5", "c6"], "default": "none" },
    "origin":{ "$ref": "#/$defs/Origin" }
  }
}
```

## 4. 规则
- **C.02.05-R1** 视图数据的修改也走 Op（INV-08）：`move_nodes`、`set_node_ui`、`add_note`、`update_note`、`remove_note`（`C.05.02`）。
- **C.02.05-R2** 视图数据不参与运行快照的语义比较：运行中只改了视图数据时，不触发安全点热更新（`E.16.02`）。
- **C.02.05-R3** 视图类 Op 在并发冲突时永远不阻塞（后写者胜，`C.05.04`）。
- **C.02.05-R4** 授权上，视图类 Op 归入动作组 `op.view`（`C.09`），档位 1 及以上直接允许，不产生提议。理由：移动节点和写便签不改变系统行为，每次都走提议会严重打扰用户。

## 5. 验收标准
1. 节点 `pos.x` 为小数时校验失败。
2. 只改 `ui.collapsed` 的 Op 不触发运行中的热更新判定。

### 实施卡
- 要建 / 要改的文件：`schema/graph.schema.json`、`schema/examples/manifest.yaml`、`schema/examples/graph_ui_unknown.json`、`schema/examples/invalid/node_pos_float.json`、`schema/examples/invalid/note_size_extra.json`、`tools/schemacheck/view_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0205-T1 坐标整数`：`invalid/node_pos_float.json` 在 `pos/x` 失败
  - `C0205-T2 开放的 ui`：`graph_ui_unknown.json`（节点 `ui` 里有未知键 `x_extra`）通过；`invalid/note_size_extra.json`（`size` 多一个字段）失败
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 未知 `ui` 字段往返保留：`W0301-T1`（`W.03.01`）、`E.02.01`
  - 只改 `ui` 不触发热更新判定（§5 验收 2）：`E.16.02`
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `NodeUi` 标 `x-open`，`Note.size` 加 `required`、`additionalProperties: false`；实施卡改为机器可读写法 | `P.09` K201、K204 |
