# C.15 包与贡献点

| 项 | 内容 |
|---|---|
| 编号 | C.15 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5.2 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义"包"：Harness 里一切可扩展能力（节点预设、工具、连接类型、数据类型、设置项、模板、技能）都由某个包贡献。内置功能是一个不能停用的核心包；接入的 MCP 服务自动成为一个包；扩展包、技能也是包。

## 2. 不做什么
- 不规定扩展包的打包与签名（`X.02`、`X.10`）
- 不改变 13 种原子节点（内核只认原子节点，`P.04` INV-01）

## 3. 继承的上级约束
`X.01`、`C.03`、`C.13`、ADR-003（13 原子节点）。

## 4. 接口
```json
"Package": {
  "required": ["id", "kind", "name", "version"],
  "properties": {
    "id":      { "type": "string", "description": "core | mcp:<名> | ext:<名> | skill:<名>" },
    "kind":    { "enum": ["core", "mcp", "extension", "skill"] },
    "name":    { "type": "string" }, "version": { "type": "string" },
    "enabled": { "type": "boolean" }, "locked": { "type": "boolean", "description": "core 为 true" },
    "contributes": {
      "node_presets":     { "type": "array", "items": { "$ref": "#/$defs/NodePreset" } },
      "tools":            { "type": "array", "items": { "$ref": "tool.schema.json#/$defs/ToolDef" } },
      "connection_types": { "type": "array", "items": { "$ref": "connection.schema.json#/$defs/ConnectionType" } },
      "types":            { "type": "array" }, "templates": { "type": "array" }, "skills": { "type": "array" },
      "settings":         { "type": "array", "items": { "$ref": "#/$defs/SettingDef" } }
    },
    "requires_connections": { "type": "array", "items": { "type": "string" } },
    "permissions": { "type": "array", "items": { "type": "string" } }
  }
},
"NodePreset": {
  "required": ["id", "atom", "path", "name"],
  "properties": {
    "id": {}, "atom": { "description": "13 种原子节点之一" },
    "path": { "type": "array", "items": { "type": "string" }, "maxItems": 3, "description": "节点库分类路径，如 [工具, MCP · github]" },
    "name": {}, "description": {}, "params": { "type": "object", "description": "预填参数" }, "label": {}
  }
},
"SettingDef": { "required": ["key", "label", "type"], "properties": { "key": {}, "label": {}, "type": { "enum": ["text", "number", "select", "segment", "switch"] }, "options": {}, "default": {}, "help": {} } }
```

## 5. 行为
- **C.15-R1** 节点库里的每一项都是一个 NodePreset：基于某个原子节点，预填参数和标签。拖到画布上得到的就是那个原子节点，`meta.preset = <包 id>/<预设 id>`（只用于显示来源）。
- **C.15-R2** MCP 服务连接成功后，后端为它生成 `mcp:<名>` 包：每个工具 → 一条 ToolDef + 一条 NodePreset（atom=工具，path=[工具, MCP · <名>]，参数从工具的 inputSchema 生成）。新工具默认停用（`S.08-R12`）。
- **C.15-R3** 停用的包：它的预设在节点库里灰显，不能拖入；画布上已有的节点显示"缺少：<包名>"，运行前校验报 V20。
- **C.15-R4** 包的 `settings` 出现在两处且是同一份数据：包详情页、"设置 › 包的设置"分组（`U.21`）。
- **C.15-R5** 核心包贡献：内置工具、模型提供方连接类型、SMTP / 搜索连接类型、9 个基础数据类型、内置模板、7 张角色卡。
- 接口：`GET /api/v1/packages`、`GET /packages/{id}`、`POST /packages/{id}/enable|disable`（替代 `B.04.08`、`B.04.12` 的部分接口，旧路径保留为别名一个版本）。`enable|disable` 的响应为 `{package, registry_hash}`（前端据此刷新节点类型与节点库，`W.09.04` §6.3）；`GET /packages/{id}` 对技能包另带 `skill_md`（SKILL.md 原文，≤ 64KB）；MCP 包带 `mcp {state, last_error, new_tools}`（`P.09` K150）。

## 6. 不变量
- 节点库内容 = 所有启用包的 node_presets 之和
- 停用包不会删除任何图里的节点

## 7. 错误处理
包清单校验失败：安装拒绝，`extension_invalid`；MCP 工具 inputSchema 无法转成参数：该工具只出现在包详情，不生成预设，记 warn。

## 8. 验收标准
1. 停用 MCP 包后它的节点灰显、画布上已有节点报 V20
2. 一个 MCP 工具生成的预设参数与 inputSchema 一致
3. 包设置在两处修改结果一致

### 实施卡
- 要建 / 要改的文件：`schema/package.schema.json`、`engine/registry/packages.go`、`internal/api/packages.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `C15-T1 预设汇总`
  - `C15-T2 MCP 生成包`
  - `C15-T3 停用`
  - `C15-T4 包设置`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §5 接口补 `enable|disable` 的响应、技能包的 `skill_md`、MCP 包的状态字段 | 第 9 棒写 `W.09.04`；`P.09` K150 |
