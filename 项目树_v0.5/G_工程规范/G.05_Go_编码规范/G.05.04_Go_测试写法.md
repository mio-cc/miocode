# G.05.04 Go 测试写法

| 项 | 内容 |
|---|---|
| 编号 | G.05.04 |
| 类型 | 规范 |
| 上级 | G.05 Go 编码规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引12 |
| 最后修改 | 2026-11-22 |

## 1. 规则
| 编号 | 规则 |
|---|---|
| G.05.04-R1 | 测试用标准库 `testing` + `stretchr/testify`（`require` 用于前置条件，`assert` 用于检查结果） |
| G.05.04-R2 | 多组输入用表驱动测试，每组有名字；实施卡的用例编号写进子测试名（`t.Run("C0503-T1/remove with edges", …)`） |
| G.05.04-R3 | 输出较大的结构（图文档、提示词、事件序列）用黄金文件比较：`testdata/*.golden`，`go test -update` 更新；更新黄金文件的提交必须说明原因 |
| G.05.04-R4 | 随机性测试用 `pgregory.net/rapid`（属性测试，`Q.03`）；失败时把种子写进日志，便于复现 |
| G.05.04-R5 | 并发代码的测试必须在 `-race` 下通过；不用 `time.Sleep` 等待（`G.05.02-R7`），用虚拟时钟或同步原语 |
| G.05.04-R6 | 测试不访问网络、不调用真模型（`Q.06`）；需要模型时用 `llm/fake` 或录放 `llm/cassette` |
| G.05.04-R7 | 存储相关测试同时在 `memstore` 和 SQLite（临时文件）上跑一遍（接口一致性测试） |
| G.05.04-R8 | 测试里用 `t.TempDir()`、`t.Cleanup()`，不留下文件 |
| G.05.04-R9 | 一个测试只验证一件事；失败信息要能直接看出哪里错（用 `assert.Equal(t, want, got, "节点 %s 状态", id)` 这样带说明的写法） |

## 2. 例子
```go
func TestAssignable(t *testing.T) {
    vectors := loadVectors(t, "../../schema/examples/assign_vectors.json")
    for _, v := range vectors {
        t.Run(v.ID+"/"+v.Src+"->"+v.Dst, func(t *testing.T) {
            got := schema.Assignable(mustParse(t, v.Src), mustParse(t, v.Dst), reg)
            assert.Equal(t, v.Want.OK, got.OK)
            assert.Equal(t, v.Want.Rule, got.Rule)
        })
    }
}
```
