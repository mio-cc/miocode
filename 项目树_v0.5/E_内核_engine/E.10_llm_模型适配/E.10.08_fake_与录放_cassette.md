# E.10.08 fake 与录放 cassette

| 项 | 内容 |
|---|---|
| 编号 | E.10.08 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引12 |
| 最后修改 | 2026-11-22 |

## 1. 职责
提供不调真模型的测试手段：脚本化的 fake 模型、录制和回放真实响应的 cassette；同时支撑 `--fake-llm` 演示模式。

## 2. 不做什么
- 不进入正式模式的调用路径（`--fake-llm` 除外）

## 3. 继承的上级约束
`Q.06`、`G.05.04-R6`、`U.18-R5`。

## 4. 接口
```go
package fake
func New(script Script) llm.Provider
type Script interface { Next(req llm.Req) (llm.Resp, error) }    // 按 (model, 消息哈希) 查表，或按调用次序
func FromCassettes(dir string) Script

package cassette
func Record(inner llm.Client, dir string) llm.Client             // 包装真实 Client，把请求和响应写进 dir
func Replay(dir string) llm.Client                               // 只回放；找不到对应记录时报错，不回退到真实调用
```

## 5. 行为
- 请求匹配键：`sha256(规范化 Req，去掉 Metadata 和温度)`。
- cassette 文件里的密钥和认证头在写入时去掉（`S.03-R7`）。
- 模板自带的 fixtures（`C.13.04`）就是 cassette 目录，`--fake-llm` 时按模板名加载。
- 测试默认只回放；`go test -record`（自定义 flag）才真调用并更新录制。

## 6. 不变量
- CI 里任何测试都不会发出真实模型请求（网络隔离检查）

## 7. 错误处理
回放找不到记录：`ErrNoRecording`，测试直接失败并打印请求键。

## 8. 验收标准
1. 录制后回放，结果逐字节一致
2. 缺记录时报错而不是联网
3. 演示模式跑通 4 个模板

### 实施卡
- 要建 / 要改的文件：`engine/llm/fake/*.go`、`engine/llm/cassette/*.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1008-T1 录放往返`
  - `E1008-T2 缺记录报错`
  - `E1008-T3 模板演示`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
