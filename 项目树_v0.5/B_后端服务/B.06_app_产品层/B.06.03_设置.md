# B.06.03 设置

| 项 | 内容 |
|---|---|
| 编号 | B.06.03 |
| 类型 | 实施 |
| 上级 | B.06 app 产品层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-22 |

## 1. 职责
设置的读写：校验、写配置文件、写密钥库、通知各模块热更新。

## 2. 不做什么
- 不实现设置界面（`W.09.02`）

## 3. 继承的上级约束
`G.11`、`S.03`、`B.07.02`、`B.07.03`。

## 4. 接口
```go
type Settings interface {
    Get(ctx context.Context) (*gen.Settings, error)
    Patch(ctx context.Context, changes map[string]json.RawMessage) (*PatchResult, error)
    Providers() ProviderSettings     // B.04.07 用
    MCP() MCPSettings                // B.04.08 用
}
type PatchResult struct { Applied, RestartRequired, NextRun []string }
```

## 5. 行为
- 每个配置项按 `G.11` 的登记（类型、是否热更新）校验和分类。
- 写入：`platform/config.Write`（原子写）；含密钥的项（提供方密钥）只写密钥库，配置文件里只留密钥名。
- 热更新通知：
| 配置 | 通知谁 |
|---|---|
| 日志级别 | logger |
| 主题 | 只存配置，前端读取 |
| 资源池 | `sched.Pools.Reconfigure`（下次运行生效） |
| 提供方、默认模型、能力覆盖 | `llm.Registry` 重建对应提供方 |
| 工具白名单、文件目录 | `tools.Registry` |
| MCP 服务 | `mcp.Manager.Configure` |
| 保留期 | 后台维护任务（`B.09`） |

## 6. 不变量
- 配置文件里永远不出现密钥值

## 7. 错误处理
校验失败：400，指出哪个配置项；写文件失败：500，配置不变。

## 8. 验收标准
1. 每类配置的热更新路径
2. 密钥不进配置文件
3. 重启生效项正确标出

### 实施卡
- 要建 / 要改的文件：`internal/app/settings/*.go`、`internal/app/settings/settings_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0603-T1 热更新`
  - `B0603-T2 密钥隔离`
  - `B0603-T3 分类`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
