# C.03.05 参数界面提示

| 项 | 内容 |
|---|---|
| 编号 | C.03.05 |
| 类型 | 实施 |
| 上级 | C.03 节点定义 NodeDef |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5.2 |
| 最后修改 | 2026-11-23 |

## 1. 职责
在参数 schema（`C.03.02`）上增加界面提示字段，让节点上和右栏里的参数界面完全由声明生成；并规定"参数 ↔ 端口"的绑定关系（ComfyUI 的"控件可转为输入"做法）。

## 2. 不做什么
- 不规定控件长什么样（`U.10.07`、`U.11`）
- 不改变参数的取值和校验规则（`C.03.02`）

## 3. 继承的上级约束
`C.03.02`、`C.04`、INV-17（界面结构来自生成的类型）。

## 4. 接口
```json
"ParamUI": {
  "type": "object", "additionalProperties": false,
  "properties": {
    "group":     { "enum": ["常用", "高级"], "default": "高级", "description": "常用：显示在节点上；高级：只在右栏属性里" },
    "order":     { "type": "integer", "description": "同组内排序，小的在前" },
    "widget":    { "enum": ["auto", "text", "area", "number", "slider", "select", "segment", "switch", "connection", "model", "rolecard", "code"], "default": "auto" },
    "rows":      { "type": "integer", "minimum": 2, "maximum": 12, "description": "area 的默认行数；节点上固定 3 行，右栏可拉高" },
    "placeholder": { "type": "string", "maxLength": 80 },
    "bind":      { "type": "string", "description": "同名输入端口。端口有连线时，参数显示为『由上游「X」提供』，运行时用上游的值" },
    "show_if":   { "type": "string", "description": "条件表达式（与分支节点同一套），为假时隐藏，如 kind == '提示词'" },
    "connection_type": { "type": "string", "description": "widget=connection 时可选的连接类型（C.16）" },
    "help":      { "type": "string", "maxLength": 200, "description": "悬停提示，不常驻显示" }
  }
}
```
NodeDef 新增（`C.03.01`）：`"dynamic_ports": {"from_param": "value", "pattern": "{{name}}", "type": "any", "max": 8}`——从参数文本里抽取 `{{变量}}` 生成输入端口（提示词节点用）。

## 5. 行为
- **C.03.05-R1** 节点上最多显示 4 个"常用"参数；超出的自动降为"高级"并在校验里给提示（不报错）。
- **C.03.05-R2** `bind` 的端口必须在 NodeDef 的 `in` 里声明，类型兼容参数类型；绑定后参数值保留，断开连线即恢复使用。
- **C.03.05-R3** 原来的"转为端口"（`promoted`，`C.02`）改名为"接线"，实现上等价于运行时给参数自动生成一个 `bind` 端口；两种写法并存，界面一致。
- **C.03.05-R4** `dynamic_ports` 生成的端口名就是变量名；变量改名时，已有连线按旧名找不到则断开并提示（Op `rename_dynamic_port` 自动迁移同名连线）。
- **C.03.05-R5** Agent 节点内置参数：`rolecard`（widget=rolecard，常用）、`instruction`（widget=area，常用，bind=prompt）、`output_schema`（常用）、其余高级。
- **C.03.05-R6** 所有界面提示只影响显示，不进入执行；内核忽略它们（`E.03`）。

## 6. 不变量
- 同一份 NodeDef 在节点上、右栏、命令面板里生成的参数界面一致
- `bind` 端口有连线时，运行使用上游值

## 7. 错误处理
`show_if` 表达式不合法：诊断 V19（警告），按"显示"处理。

## 8. 验收标准
1. Agent、提示词、工具三个节点的参数界面全部由声明生成，无手写界面
2. 提示词里写 `{{a}} {{b}} {{a}}` 生成 2 个端口
3. 接线后参数格显示"由上游提供"，断开后恢复原值

### 实施卡
- 要建 / 要改的文件：`schema/nodedef.schema.json（ParamUI、dynamic_ports）`、`web/src/canvas/params/*.tsx`、`engine/node/ports_dynamic.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `C0305-T1 生成界面`
  - `C0305-T2 动态端口`
  - `C0305-T3 bind 运行时取值`
  - `C0305-T4 常用超 4 个降级`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
