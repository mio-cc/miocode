# B.04.05 mandates 授权书

| 项 | 内容 |
|---|---|
| 编号 | B.04.05 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

## 1. 职责
管理授权书和挂载、查询有效档位、提权申请、急停。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/mandates?anchor=` | 列表 | → `Mandate[]` |
| POST | `/mandates` | 新建（仅用户） | `Mandate` → 201 |
| GET | `/mandates/{mid}` | 详情 | → `Mandate` |
| PUT | `/mandates/{mid}` | 修改（仅用户；图上的挂载变化走 `set_mandate` Op） | → `Mandate` |
| POST | `/mandates/{mid}/revoke` | 收回（安全点生效，`S.04-R6`） | → 204 |
| GET | `/authz/effective?graph_id=&node_id=&scope=&actor=model:*` | 解析后的有效档位、命中的授权书、解释链（给档位面板） | → `Effective` |
| POST | `/sessions/{sid}/level` | 快速设置会话档位（档位胶囊，`U.12` §6）：内部创建或更新挂在会话上的授权书 | `{level}` → `Effective` |
| GET | `/estop` | 急停状态 | → `{global, runs[]}` |
| POST | `/estop` | 全局急停（用户或命令行） | → 204 |
| DELETE | `/estop` | 解除全局急停（**仅用户或 anydoorctl**，`B.03.05` 第 5 步） | → 204 |

## 5. 行为
- 模型的提权申请不走 HTTP：编排者调用内部工具 `request_elevation`，产品层创建审批（`E.17.02`）。
- 解除急停：API 层检查 Caller；内核 `Estop.Release` 再检查一次（两层拦截，`S.09-R2`）。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/mandates.go`、`internal/api/estop.go`、`internal/api/mandates_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0405-T1 授权书增改`
  - `B0405-T2 有效档位解释链`
  - `B0405-T3 会话快速设档`
  - `B0405-T4 急停两层拦截`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
