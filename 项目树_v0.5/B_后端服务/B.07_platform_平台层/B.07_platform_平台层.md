# B.07 platform 平台层

| 项 | 内容 |
|---|---|
| 编号 | B.07 |
| 类型 | 实施 |
| 上级 | B 后端服务 |
| 下级 | B.07.01 本地鉴权、B.07.02 密钥存储、B.07.03 配置、B.07.04 单实例锁、B.07.05 数据目录布局 |
| 状态 | 已审 |
| 素材 | 引15 |
| 最后修改 | 2026-11-24 |

## 1. 这一组管什么
`internal/platform`：Anywhere Door 自带的本机默认实现（原先由"宿主"提供的能力，`引15` §3）——本地鉴权、密钥存储、配置、单实例锁、数据目录布局。

## 2. 下级清单
| 编号 | 名称 | 包 |
|---|---|---|
| B.07.01 | 本地鉴权 | `internal/platform/auth` |
| B.07.02 | 密钥存储 | `internal/platform/secret` |
| B.07.03 | 配置 | `internal/platform/config` |
| B.07.04 | 单实例锁 | `internal/platform/lock` |
| B.07.05 | 数据目录布局 | `internal/platform/datadir` |

第 ⑦ 片（`m0-platform`）的领取顺序：`B.07.05` → `B.07.04` → `B.07.01` → `B.07.02` → `B.07.03`。只监听 127.0.0.1、Host / Origin 校验、token 换 cookie 这些 HTTP 层的部分在 `B.02`、`B.03.05`，和单二进制打包同在第 ⑧ 片（`P.09` K239）。

## 3. 共同约束
- **B.07-R1** 平台层不依赖内核实现（`B.01` §2）：不 import `engine/**`、`internal/api`、`internal/app`。要实现内核的接口（`engine.SecretResolver`）时按方法签名实现，不 import 接口所在的包；要用存储时，在本包里定义只含所需方法的小接口，由组装代码（`cmd/anydoor`）把 `store.Store` 的仓库传进来（`P.09` K240）。
- **B.07-R2** 三平台（Windows、macOS、Linux）行为一致；平台差异用 `_windows.go`、`_unix.go` 等文件隔离（`G.04.03`）。
- **B.07-R3** 以后要嵌入别的系统或支持多用户时，只替换平台层的实现（ADR-001 推翻条件）。
- **B.07-R4** 平台层的包之间只许 import `internal/platform/datadir`（路径、权限、原子写文件）；其余彼此不 import。
- **B.07-R5** 和时间有关的判断（会话过期、解锁冷却）用 `Options.Now` 取时间，缺省 `time.Now`，测试注入假时钟；不 `time.Sleep` 等真实时间（单实例锁的存活探测除外）。
- **B.07-R6** 所有文件都在数据目录里，路径只从 `datadir.Dir` 的方法取（`B.07.05`）；写含秘密的文件（token、密钥文件、密钥索引）一律用 `datadir.WritePrivate`。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑦ 片（`m0-platform`）开工前复查：写明包名、领取顺序；HTTP 层移到第 ⑧ 片；新增 R4–R6；R1 写明怎么实现内核接口、怎么用存储；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K239、K240 |
