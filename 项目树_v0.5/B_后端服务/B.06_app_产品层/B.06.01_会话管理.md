# B.06.01 会话管理

| 项 | 内容 |
|---|---|
| 编号 | B.06.01 |
| 类型 | 实施 |
| 上级 | B.06 app 产品层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-22 |

## 1. 职责
管理会话：增删改查、挂图、当前图、消息存储、会话事件。

## 2. 不做什么
- 不生成回复（`B.06.02`）

## 3. 继承的上级约束
`C.10`、`C.06.04`、`B.06-R1`–`R3`。

## 4. 接口
```go
type Sessions interface {
    Create(ctx context.Context, title string) (*gen.Session, error)
    Get(ctx context.Context, id string) (*gen.Session, error)
    List(ctx context.Context, q SessionQuery) (store.Page[gen.Session], error)
    Update(ctx context.Context, id string, patch SessionPatch) (*gen.Session, error)
    Delete(ctx context.Context, id string) error                        // 软删除
    AttachGraph(ctx context.Context, id, graphID string, makeActive bool) error
    DetachGraph(ctx context.Context, id, graphID string) error
    Messages(ctx context.Context, id string, q MessageQuery) (store.Page[gen.Message], error)
    AppendUserMessage(ctx context.Context, id string, content string, sel *gen.Selection) (*gen.Message, error)
    AppendSystemMessage(ctx context.Context, id string, blocks []gen.MessageBlock) (*gen.Message, error)
}
```

## 5. 行为
- 标题：新会话标题为空时，第一条用户消息后自动生成（截取前 20 字；有模型时由对话 Agent 在回复结束后生成一个更短的标题，走 `B.06.02` 的同一条执行路径，不单独调用模型）。
- 每次修改都写会话事件（`session.updated`、`session.graph_attached` 等），seq 在同一事务分配。
- `AttachGraph(makeActive=true)` 时同时写一条带 `graph` 卡片块的 system 消息（例如"已创建图「竞品定价调研」"）。
- 会话默认授权书：新建会话时挂一份 1 档授权书（`S.04-R2`）。

## 6. 不变量
- 删除会话不删除图
- 每次修改都有对应的会话事件

## 7. 错误处理
不存在：`ErrNotFound`。

## 8. 验收标准
1. 增删改与事件
2. 自动标题
3. 默认 1 档授权书
4. 删除不删图

### 实施卡
- 要建 / 要改的文件：`internal/app/session/*.go`、`internal/app/session/session_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0601-T1 增删改`
  - `B0601-T2 事件`
  - `B0601-T3 默认授权`
  - `B0601-T4 软删除`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
