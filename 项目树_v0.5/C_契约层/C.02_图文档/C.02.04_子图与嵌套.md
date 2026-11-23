# C.02.04 子图与嵌套

| 项 | 内容 |
|---|---|
| 编号 | C.02.04 |
| 类型 | 实施 |
| 上级 | C.02 图文档 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引02, demo v0.4 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义子图 `Subgraph`、子图引用 `SubgraphRef`，以及"哪些节点能带子图"、"最多嵌套几层"。

## 2. 不做什么
- 不定义子图怎么执行（`E.14.09` 循环、`E.14.05` 扇出、`E.14.13` 子图引用）。
- 不定义子图库怎么存（`E.07`）。

## 3. 继承的上级约束
INV-03（子图对外只暴露端口等）、INV-06（只有循环成环）、`C.02-R1`、`C.02-R2`。

## 4. 定义
```json
"Subgraph": {
  "type": "object",
  "required": ["nodes", "edges"],
  "additionalProperties": false,
  "properties": {
    "nodes": { "type": "array", "items": { "$ref": "#/$defs/Node" } },
    "edges": { "type": "array", "items": { "$ref": "#/$defs/Edge" } },
    "notes": { "type": "array", "items": { "$ref": "#/$defs/Note" }, "default": [] }
  }
},
"SubgraphRef": {
  "type": "object",
  "required": ["name", "version", "pin"],
  "additionalProperties": false,
  "properties": {
    "name":      { "type": "string", "pattern": "^[^@/]{1,60}$", "description": "子图库里的名字，如 资料采集" },
    "version":   { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "pin":       { "enum": ["snapshot", "link"] },
    "overrides": { "type": "object", "additionalProperties": { "type": "string" },
                   "description": "内部节点 ID 或 参数路径 → 替换值（资源、配方、策略引用），不打开子图也能替换" }
  }
}
```

## 5. 容器规则
"容器节点"是带子图的节点（`P.06`）。

| 节点类型 | `children` | `ref` | 说明 |
|---|---|---|---|
| 循环 | **必须** | 不允许 | 子图是循环体，每一轮执行一次 |
| 扇出 | **必须** | 不允许 | 子图是每一份要执行的内容；每份执行一次子图（`P.09` K13：demo 里扇出没有子图，以本表为准） |
| 子图引用 | 二选一，必须有一个 | 二选一 | `children`：内联子图，例如"打包为子图"生成的；`ref`：引用子图库里的版本 |
| 声明式扩展节点 `impl.type=subgraph` | 不允许 | 不允许 | 子图来自 NodeDef 本身（`C.03.04`） |
| 其他原子节点、其他扩展节点 | 不允许 | 不允许 | — |

`schema/builtin/container_rules.yaml` 是上表的机器可读版，供 `E.03.03` 的校验器读取，避免在代码里按类型名写分支（INV-02）。表里没有的节点类型 `children`、`ref` 都不允许；声明式扩展节点由 NodeDef 的 `impl` 决定（`C.03.04`），不进这张表：
```yaml
- type: 循环
  children: required
  ref: forbidden
- type: 扇出
  children: required
  ref: forbidden
- type: 子图引用
  children: one_of
  ref: one_of
```

- **C.02.04-R1** "打包为子图"（Op `group`）生成的节点类型是 `子图引用`，带 `children`。用户把它"存入子图库"后变成 `ref`（Op `set_subgraph_ref`）。
- **C.02.04-R2** 每个子图（`children`）至少有一个 `role=entry` 和一个 `role=exit` 的子图端口节点（诊断 V11）。循环和扇出创建时，服务器自动放入一对入口和出口。
- **C.02.04-R3** 子图端口节点的 `role` 决定父节点的外部端口：每个 `entry` 端口节点对应父节点的一个输入端口，每个 `exit` 对应一个输出端口，`summary` 对应输出端口 `summary`，`escalation` 对应输出端口 `escalation`。端口名取子图端口节点的 `params.port_name`（缺省为 `in` / `out`；多个时为 `in_2`、`out_2`…）。
- **C.02.04-R4** 子图之间不共享状态：子图只能通过入口拿数据、通过出口交数据（INV-04）。子图需要读写父级账本时，必须用账本节点 `scope=parent`，并由子图引用节点的 `writeback` 参数声明允许写回的字段（`E.14.13`）。

## 6. 嵌套层数
| 概念 | 定义 |
|---|---|
| 层号 | 根图是第 0 层；容器节点在第 n 层时，它的子图是第 n+1 层。`ref` 引用的子图按展开后的实际层数计算 |
| 警告阈值 | 层号 > 4：诊断 V12 级别 warn（"嵌套过深，建议打包成子图库引用"） |
| 硬上限 | 层号 > 8：诊断 V12 级别 error；运行时展开超过 8 层直接失败 |
| 引用环 | `ref` 链里出现同一个 `name`（不论版本）就是引用环：V12 error |

这个决定关闭了 `P.09` Q14。demo v0.4 的示例图是 3 层（根图 → 闭环迭代 → 资料采集），在警告阈值以内。

## 7. 版本钉住 `pin`
| pin | 编辑时 | 冻结运行快照时 |
|---|---|---|
| `snapshot` | 固定使用 `version` 这一版 | 用 `version` |
| `link` | 子图库更新时，画布提示"有新版本"，`version` 仍是上次确认的版本 | 解析到当时的最新版本，把实际版本号记进快照；运行中不再跟随更新 |

## 8. 不变量
- 任何子图内部的环都只能出现在循环节点的 `children` 内部，并且在当前层看不到这条回边（INV-06，诊断 V09）。
- 根图不能有 `entry` 以外的外部输入；根图的 `entry` 端口节点接收运行启动时的 `inputs`。

## 9. 验收标准
1. 没有 `children` 的循环、扇出节点校验失败（V11）。
2. 只有 `entry` 没有 `exit` 的子图报 V11。
3. 9 层嵌套报 V12 error；5 层嵌套报 V12 warn。
4. A 引用 B、B 引用 A 报 V12 error。

### 实施卡
- 要建 / 要改的文件：`schema/graph.schema.json`、`schema/builtin/container_rules.yaml`、`schema/examples/manifest.yaml`、`schema/examples/invalid/subgraph_ref_bad_version.json`、`schema/examples/semantic/loop_without_children.json`、`schema/examples/semantic/subgraph_without_exit.json`、`schema/examples/semantic/nesting_depth_9.json`、`schema/examples/semantic/nesting_depth_5.json`、`tools/schemacheck/subgraph_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0204-T1 容器规则表`：`container_rules.yaml` 与 §5 表一致（循环、扇出：`children` 必须、`ref` 不允许；子图引用：二选一）；`type` 都是原子节点类型名
  - `C0204-T2 子图引用`：`invalid/subgraph_ref_bad_version.json`（`version` 为 `1.0`）在 `version` 失败；`pin` 不是 `snapshot`、`link` 时失败（测试里内联）
  - `C0204-T3 诊断示例`：§9 验收 1–3 用的四个 `semantic/` 文件通过 schema，清单里的 `diag` 依次是 V11、V11、V12、V12
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - §9 验收 1–4：`E.03.03` 的 V11、V12 正反例（引用环用测试里造的子图库）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `container_rules.yaml` 的格式移到 §5；实施卡改为机器可读写法，§9 的语义检查归 `E.03.03`，本叶子提供 `semantic/` 示例 | `P.09` K201、K206 |
