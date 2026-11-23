# B.04.07 models 模型与提供方

| 项 | 内容 |
|---|---|
| 编号 | B.04.07 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-23 |

## 1. 职责
列出可用模型，管理模型提供方（含密钥）、测试连接、价格表。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/models` | 可用模型（不含密钥）：`{ref, provider, window, caps, priced, effort}`（`effort`：这个模型支持的思考强度，`C.16`） | → `Model[]` |
| POST | `/models/count-tokens` | 估算一段文字的 tokens（按模型的分词器，没有时按通用估算） | `{text, model?}` → `{tokens, exact}` |
| GET | `/providers` | 提供方列表（密钥只显示末 4 位） | → `Provider[]` |
| POST | `/providers` | 新增 `{name, kind, base_url?, backend?, secret?, caps_override?}`；`secret` 直接写入密钥库，不进配置文件 | → 201 |
| PUT | `/providers/{name}` | 修改；`secret` 缺省表示不改 | → `Provider` |
| DELETE | `/providers/{name}` | 删除（同时删除密钥；被图使用时 409 列出受影响的图） | → 204 |
| POST | `/providers/{name}/test` | 测试连接：发一次最小请求，返回可用模型和能力 | → `{ok, models, caps, error?}` |
| GET | `/pricing` · PUT `/pricing` | 价格表（版本化，`E.09.03`） | → `PricingTable` |
| GET | `/connections` | 连接列表（`C.16`）：密钥只给 `secret_tails`（末 4 位，`C.16-R6`）；模型连接带 `models[]`（`C.16-R7`） | → `Connection[]` |
| POST | `/connections` | 新建 `{type, name, values, secrets}`：`secrets` 写入密钥库后立刻丢弃 | → 201 `Connection` |
| GET | `/connections/{id}` · PUT · DELETE | 读取；修改 `{name?, values?, secrets?}`（`secrets` 缺省表示不改）；删除（同时删密钥；被图或包使用时 409 并列出，见 `usages`） | → `Connection` / 204 |
| POST | `/connections/{id}/test` | 测试连接；模型连接顺带读取模型列表 | → `ConnectionTest {ok, state, error?, models?}` |
| GET | `/connections/{id}/usages` | 谁在用：扫描所有图和包（`C.16-R4`） | → `ConnectionUsages` |
| GET | `/connection-types` | 各包声明的连接类型与表单字段（含 `suggestions`，`C.16-R8`） | → `ConnectionType[]` |

## 5. 行为
- 密钥只在请求体里出现一次，写入密钥库后请求体立刻丢弃；请求日志里不记录这几个接口的请求体（`S.03`）。
- "测试连接"的结果按提供方缓存 5 分钟。
- 前端界面只通过 `/connections`（`C.16`，本文 §4，`P.09` K178）管理连接，包括模型提供方；本文的 `/providers` 是同一份数据的旧路径，保留给 `anydoorctl` 和别名（`C.16-R9`，`P.09` K144）。`/pricing` 仍由前端的"设置 › 预算与用量 › 价格表"使用（`W.09.02`）。
- 删除时检查引用：扫描所有图里资源节点的 `provider` 字段。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/models.go`、`internal/api/providers.go`、`internal/api/providers_test.go`、`internal/api/connections.go`、`internal/api/connections_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0407-T1 增删改`
  - `B0407-T2 密钥不回显、不落日志`
  - `B0407-T3 测试连接`
  - `B0407-T4 删除被引用 409`
  - `B0407-T5 连接`：新建带 `secrets` → 响应和请求日志里都没有明文、只有 `secret_tails`；`PUT` 不带 `secrets` 时密钥不变；`/test` 返回 `models`；`/usages` 列出引用它的图和包；被引用时删除 409
  - `B0407-T6 两条路径同一份数据`：经 `/connections` 新建的模型连接在 `/providers` 里可见，反之亦然（`C.16-R9`）
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §4 `/models` 写明 `effort`；新增 `count-tokens` | 第 8 棒写 `W.07.03`、`W.07.07`；`P.09` K113 |
| 2026-11-23 | §5 写明前端只用 `/connections`，`/providers` 为旧路径 | 第 9 棒写 `W.09.04`；`P.09` K144 |
| 2026-11-23 | §4 补 `/connections`、`/connection-types` 接口及实施卡（`C.16` 已定义、前端在用，但本文没有登记） | W 全枝复查；`P.09` K178 |
