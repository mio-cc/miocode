# B.05.01 订阅中心

| 项 | 内容 |
|---|---|
| 编号 | B.05.01 |
| 类型 | 实施 |
| 上级 | B.05 SSE 事件流 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

## 1. 职责
订阅中心：每条流（每个运行、每张图、每个会话）一个 hub，把内核广播的事件分发给所有订阅者。

## 2. 不做什么
- 不读写事件存储以外的数据

## 3. 继承的上级约束
`B.05-R1`、`E.09.01`（`obs.Hub`）。

## 4. 接口
```go
type Center struct{ /* map[StreamKey]*hub */ }
func NewCenter(bus *obs.Hub, events store.EventRepo, log *slog.Logger) *Center
func (c *Center) Subscribe(ctx context.Context, key store.StreamKey, since int64) (*Sub, error)
type Sub struct{ C <-chan Frame; Close func() }
type Frame struct { ID int64; Event string; Data []byte; Comment string }
```

## 5. 行为
- hub 按需创建：第一个订阅者到来时创建，最后一个离开 60 秒后销毁。
- 每个订阅者一个有界 channel（容量 1024）；分发时不阻塞：channel 满了就断开这个订阅者（让它自己重连补发），不拖慢其他订阅者（`引09` §3.5）。
- 事件序列化一次，复用到所有订阅者。

## 6. 不变量
- 一个慢订阅者不影响其他订阅者的延迟

## 7. 错误处理
无。

## 8. 验收标准
1. 100 个订阅者同时接收 1 万条事件，全部按序收到
2. 一个订阅者不读，被断开，其他人不受影响
3. hub 按需销毁

### 实施卡
- 要建 / 要改的文件：`internal/sse/center.go`、`internal/sse/hub.go`、`internal/sse/center_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0501-T1 广播`
  - `B0501-T2 慢订阅者`
  - `B0501-T3 生命周期`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
