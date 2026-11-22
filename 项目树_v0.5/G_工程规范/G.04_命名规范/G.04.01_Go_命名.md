# G.04.01 Go 命名

| 项 | 内容 |
|---|---|
| 编号 | G.04.01 |
| 类型 | 规范 |
| 上级 | G.04 命名规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 规则
| 对象 | 规则 | 正例 | 反例 |
|---|---|---|---|
| 包 | 小写单词，不用下划线和复数；和目录名一致 | `ctxasm`、`authz` | `ctx_asm`、`tools_pkg` |
| 导出类型 | PascalCase 名词 | `RunCtx`、`Proposal` | `RunContextStruct` |
| 接口 | 能力名；单方法接口用 `-er` | `Store`、`Applier`、`Model` | `IStore`、`StoreInterface` |
| 函数、方法 | PascalCase / camelCase 动词开头 | `Apply`、`resolveMandate` | `DoApply`、`mandateResolver()` |
| 构造函数 | `New` + 类型名；只有一个主要类型时可以只叫 `New` | `NewPipeline`、`sqlite.New` | `CreatePipeline` |
| 常量 | 生成的常量见 `C.14-R6`；手写常量 PascalCase | `DefaultMaxRounds` | `DEFAULT_MAX_ROUNDS` |
| 哨兵错误 | `Err` + 描述 | `ErrConflict`、`ErrIllegalTransition` | `ConflictError`（这是错误类型的名字） |
| 错误类型 | 描述 + `Error` | `ValidationError` | `ErrValidation` |
| 接收者 | 1–2 个字母，同一类型的所有方法一致 | `func (p *Pipeline)` | `func (this *Pipeline)` |
| 包名不重复 | 导出名不重复包名 | `op.Apply` | `op.OpApply` |
| context 参数 | 第一个参数，名为 `ctx` | `func Run(ctx context.Context, …)` | — |
| 测试函数 | `Test<被测>_<场景>`；对应实施卡用例编号时写进子测试名 | `TestApply_RemoveNodesSnapshot`，`t.Run("C0503-T1", …)` | `TestApply2` |

## 2. 检查方式
`golangci-lint` 的 `revive`（exported、receiver-naming、var-naming）、`errname` 规则（`G.05.05`）。
