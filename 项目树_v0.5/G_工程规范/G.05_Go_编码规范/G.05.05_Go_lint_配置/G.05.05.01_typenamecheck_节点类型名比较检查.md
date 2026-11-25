# G.05.05.01 typenamecheck 节点类型名比较检查

| 项 | 内容 |
|---|---|
| 编号 | G.05.05.01 |
| 类型 | 实施 |
| 上级 | G.05.05 Go lint 配置 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | `G.05.05-R3`；INV-02；`E.03-R1`；`tools/lint/quirkscheck`（`E.10.05` §5.1，写法相同） |
| 最后修改 | 2026-11-25 |

## 1. 职责
实现 `go run ./tools/lint/typenamecheck`：检查调度、校验、运行代码里没有按原子节点类型名写分支（`G.05.05-R3`、INV-02）。节点的性质要从 NodeDef、TypeDef 和生成的表读。替换 `O.01` 留下的桩（`STUB(G.05.05)`），`go run ./tools/build -check` 已经在调用它。

## 2. 不做什么
- 不检查别的目录：`engine/exec`（执行器按 `Kind()` 注册，"只有 Agent 能调模型"的检查在那里，INV-05）、`internal/`、`web/` 不在范围内
- 不检查厂商名（`quirkscheck`）

## 3. 继承的上级约束
`G.05.05-R3`、INV-02、`E.03-R1`。

## 4. 接口
```
go run ./tools/lint/typenamecheck [目录…]   缺省检查仓库的 engine/sched、engine/schema、engine/run（不存在的跳过）；有问题退出码 1，读不了文件退出码 2
```

## 5. 行为
- 扫描目录下所有非测试的 `.go` 文件（跳过 `testdata/`）；找 `==`、`!=`、带标签的 `switch` 的 `case`、`strings.HasPrefix` / `HasSuffix` / `Contains` / `EqualFold` 里的操作数：
  - 字符串字面量等于某个原子节点类型名；
  - 或者是 `gen` 包里 `NodeType` 开头的常量（`gen.NodeTypeAgent` 等）。
- 原子节点类型名的清单：仓库 `schema/builtin/nodedefs/*.yaml` 的 `name`（读不到时用 `gen` 的 `NodeType*` 常量值）。
- 每处一行：`<文件>:<行>: 比较了节点类型名 <名字>：<那一行代码>`；最后写总数。没有问题时写"typenamecheck：检查了 N 个文件，没有节点类型名的比较"。

## 6. 不变量
- 仓库的 `main` 上没有违规

## 7. 错误处理
Go 文件解析失败：写出文件和原因，退出码 2。

## 8. 验收标准
1. 对故意写的类型名比较报出文件和行号
2. 比较参数名、类别、普通字符串不报
3. 仓库自己通过

### 实施卡
- 要建 / 要改的文件：`tools/lint/typenamecheck/main.go`、`tools/lint/typenamecheck/main_test.go`、`docs/checks.md`
- `tools/lint/typenamecheck/main.go` 现在是桩，本叶子整体替换（`G.02.06-R10`）；`docs/checks.md` §3 删掉 typenamecheck 那一行
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/`、`cmd/`、`web/`、`tools/build/`、`tools/relay/`
- 测试用例：
  - `G050501-T1 违规检出`：测试目录里放一个写了 `if n.Type == "循环"`、`switch def.Name { case "Agent": }`、`n.Type == gen.NodeTypeLoop` 的文件，三处都报出行号；测试文件和 `testdata/` 里的不报
  - `G050501-T2 不误报`：比较参数名（`"max_rounds"`）、类别（`"边界"`）、协议名和普通字符串的文件不报
  - `G050501-T3 仓库自检`：在仓库上运行（缺省目录），退出码 0
- 允许使用的依赖：标准库、`github.com/goccy/go-yaml`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-25 | 新建：`G.05.05` 是规范、不能领取，typenamecheck 的实现单独成一个实施叶子（做法同 `G.03.01`），放进 M1 第 ①b 片；状态"已审" | `P.09` K256 |
| 2026-11-25 | 状态改为"冻结"：第 ①b 片（`m1-validate`）squash 合并进代码仓库 `main`，提交 `e662c6d2f58e4e26ed13c8304f6ab43b0125dc09`（`G.02.06-R21`） | `relay slice` 通过；`E.03.03` 第一轮 `T02`、`T21`、`T25` 用例输入写错、`G.05.05.01` 两处 errcheck，修复后通过；整片评审 16 行全部符合；按 `G.08-R3` 由验证者合并 |
