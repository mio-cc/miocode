# B.04.13 templates 模板

| 项 | 内容 |
|---|---|
| 编号 | B.04.13 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 职责
列出模板、实例化模板。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/templates` | 内置和扩展包提供的模板：`{name, version, title, summary, tags, cost_hint, inputs, requires}` | → `Template[]` |
| GET | `/templates/{name}` | 详情（含 README 和缩略图） | → `TemplateDetail` |
| POST | `/templates/{name}/instantiate` | 实例化：`{session_id?, inputs}` → 新图；有 session_id 时挂到会话并设为当前图，会话里插入一条图卡片消息 | → 201 `{graph_id}` |

## 5. 行为
- 实例化逻辑在 `B.06.05`；缺依赖时 422 列出缺失项（`C.13.04-R3`）。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/templates.go`、`internal/api/templates_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0413-T1 列表`
  - `B0413-T2 实例化并挂会话`
  - `B0413-T3 缺依赖`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
