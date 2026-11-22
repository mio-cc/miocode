# B.08 harnessctl 命令行

| 项 | 内容 |
|---|---|
| 编号 | B.08 |
| 类型 | 实施 |
| 上级 | B 后端服务 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01 |
| 最后修改 | 2026-11-22 |

## 1. 职责
命令行工具 `harnessctl`：在终端里操作本机正在运行的 Harness，或直接处理数据目录。

## 2. 不做什么
- 不提供图编辑命令（编辑在界面里做）

## 3. 继承的上级约束
`B.03.05`（Bearer 鉴权）、`S.09`、`S.10`、`O.08`、`Q.07`。

## 4. 接口
```
harnessctl [--data-dir DIR] <命令>
  status                       运行状态：版本、端口、活动运行、急停
  open                         在浏览器打开 Harness
  estop [--run ID]             急停（全局或单个运行）
  estop release                解除全局急停（命令行代表用户本人）
  audit verify                 校验审计哈希链
  export [--include-blobs] -o FILE      导出数据
  import FILE                  导入图或导出包
  doctor                       检查环境：数据目录权限、数据库完整性（PRAGMA integrity_check）、迁移版本、密钥库后端、端口、MCP 服务、最终生效的配置（密钥只显示名称）
  diag-bundle -o FILE          生成诊断包（同 B.04.14）
  eval run --suite DIR         用 fake 或指定模型跑评测集并输出 Promptfoo 可读的结果（Q.07）
  version
```

## 5. 行为
- 连接方式：读 `<DataDir>/port` 和 `token`，用 `Authorization: Bearer` 访问本机 API；`harnessd` 没有运行时，`audit verify`、`doctor`、`export` 直接以只读方式打开数据库（不能和运行中的实例同时写）。
- 输出：默认人能读的中文；`--json` 输出 JSON（便于脚本）。
- 退出码：0 成功；1 失败；2 用法错误；3 Harness 未运行（需要运行中实例的命令）。

## 6. 不变量
- 只读命令在 harnessd 未运行时不修改数据库

## 7. 错误处理
连接失败：提示"Harness 没有运行，可以用 harnessd 启动"。

## 8. 验收标准
1. 每个命令一个用例（启动测试实例）
2. estop release 有效
3. 未运行时只读命令可用

### 实施卡
- 要建 / 要改的文件：`cmd/harnessctl/*.go`、`cmd/harnessctl/cli_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B08-T1 各命令`
  - `B08-T2 解除急停`
  - `B08-T3 离线只读`
  - `B08-T4 --json`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
