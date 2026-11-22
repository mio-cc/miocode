# B.07.05 数据目录布局

| 项 | 内容 |
|---|---|
| 编号 | B.07.05 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 职责
规定数据目录的位置和内部布局。

## 2. 不做什么
- 不规定备份策略（`O.07`）

## 3. 继承的上级约束
`S.11` §1、`S.11-R8`、`G.11` §3（`data.dir`）。

## 4. 接口
默认位置：Windows `%APPDATA%\Harness`；macOS `~/Library/Application Support/Harness`；Linux `$XDG_DATA_HOME/harness`（缺省 `~/.local/share/harness`）。`--data-dir` 覆盖；开发模式 `./.harness-dev/`。
```
<DataDir>/
├── harness.db            # SQLite（WAL：另有 -wal、-shm 文件）
├── harness.db.bak-*      # 迁移前备份，保留 3 份
├── harness.yaml          # 配置
├── token                 # 本机 token
├── port                  # 当前端口（运行时）
├── harnessd.lock         # 单实例锁
├── secrets.enc           # 仅在文件后端时存在
├── blobs/ab/cd/<hash>    # 内容寻址存储
├── workspaces/<run_id>/  # 运行工作区（文件工具、代码沙箱）
├── extensions/<名>/      # 已安装扩展包；extensions/.pending/ 待确认
├── mcp/<名>/             # MCP stdio 服务的工作目录
├── skills/<名>/          # 用户安装的技能
├── logs/                 # harnessd-YYYYMMDD.log
└── tmp/                  # 临时文件，启动时清空
```

## 5. 行为
- 启动时创建缺失的子目录，权限仅当前用户（`S.11-R8`）。
- 路径计算集中在一个函数里，其他代码不自己拼路径。

## 6. 不变量
- 所有持久化文件都在数据目录内

## 7. 错误处理
数据目录不可写：启动失败并说明。

## 8. 验收标准
1. 三平台默认位置
2. 子目录自动创建
3. tmp 启动清空

### 实施卡
- 要建 / 要改的文件：`internal/platform/datadir/*.go`、`internal/platform/datadir/datadir_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0705-T1 默认位置`
  - `B0705-T2 创建与权限`
  - `B0705-T3 tmp 清空`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
