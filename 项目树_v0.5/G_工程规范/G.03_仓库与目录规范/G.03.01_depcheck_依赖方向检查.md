# G.03.01 depcheck 依赖方向检查

| 项 | 内容 |
|---|---|
| 编号 | G.03.01 |
| 类型 | 实施 |
| 上级 | G.03 仓库与目录规范 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | `G.03` §3、§4；`E.01` §1；`B.01` §2；INV-19；用户 2026-11-24（M0 补做） |
| 最后修改 | 2026-11-24 |

## 1. 职责
实现 `go run ./tools/depcheck`：扫描仓库里所有 Go 包的 import，按 `tools/depcheck/rules.yaml` 检查依赖方向（`G.03-R2`–`R4`、`E.01` §1、`B.01` §2、INV-19），有违规时写出文件、行号和理由，退出码 1。替换 `O.01` 留下的桩（`G.02.06-R10`），`go run ./tools/build -check` 已经在调用它。

## 2. 不做什么
- 不查依赖是否登记（`tools/ci/deps`，`G.10`）；`allow` 只约束仓库内的包
- 不查环形依赖（Go 编译器会拦）
- 不查前端（`web/` 的 import 规则在 `W.01`、`W.03.05`）

## 3. 继承的上级约束
`G.03-R2`、`R3`、`R4`、`R7`、`R8`；`E.01` §1；`B.01` §2、`B.01-R1`；INV-19；`G-R1`。

## 4. 接口
```
go run ./tools/depcheck [-rules <文件>] [目录]
```
- 目录：要检查的模块根（缺省：从当前目录往上找到的 `go.mod` 所在目录）；模块路径读 `go.mod` 的 `module` 行。
- `-rules`：规则文件（缺省：模块根的 `tools/depcheck/rules.yaml`）。
- 退出码：0 没有违规；1 有违规；2 规则文件、`go.mod` 或 Go 源文件读不了、写错了。

规则文件：
```yaml
# tools/depcheck/rules.yaml
rules:
  - pkg: engine/**                  # 必填：哪些包受这条约束
    deny: [internal/**, cmd/**]     # 可选：这些 import 一律不许（仓库内、仓库外的路径都可以写）
    except: [engine/llm/**]         # 可选：这些包不受这条约束
    tests: true                     # 可选：也检查 _test.go；缺省只检查非测试文件
    why: INV-19、G.03-R2            # 必填：违规时显示的理由
  - pkg: engine/store/**
    allow: [gen/**, engine/store/**] # 可选：仓库内的 import 只能是这些；写 [] 表示一个都不能有
    why: E.01 §1
```

## 5. 行为

### 5.1 模式
- 仓库内的包写相对模块根的路径（`engine/llm`、`internal/platform/auth`）；仓库外的写完整 import 路径（`net/http`）。仓库内的 import 先去掉模块路径前缀再比较。
- `x/**` 匹配 `x` 本身和它下面的所有包；其他写法完全相同才匹配。只有末尾可以写 `/**`；不能以 `/` 开头或结尾，不能有空段。

### 5.2 检查
- 扫描模块根下所有目录：跳过以 `.` 或 `_` 开头的目录、`testdata`、`vendor`、`node_modules`，以及有自己 `go.mod` 的子目录（嵌套模块）。一个目录里的 `.go` 文件算一个包（包路径 = 模块路径 + 相对目录），只读 import（`go/parser` 的 `ImportsOnly`），不看构建标签；`import "C"` 不算。
- 一个包匹配到的每条规则都要满足（各条之间是"且"）：
  - `allow`：这个包的每个仓库内 import 都要匹配 `allow` 里的某一项；仓库外的 import 不受 `allow` 约束（由 `G.10` 管）。
  - `deny`：匹配 `deny` 里任何一项的 import 都是违规。
  - `except` 里的包跳过这条规则；`tests` 为假时只看非测试文件（`_test.go` 之外，含外部测试包）。
- 每处违规一行：`<文件>:<行>: <包> import <路径>：<why>（rules.yaml 第 <N> 条）`，文件写相对模块根的路径。最后一行写总数；没有违规时写"depcheck：检查了 N 个包，没有违规"。

### 5.3 `rules.yaml` 的内容
逐行对应 `E.01` §1 和 `B.01` §2 的依赖表；表改了，这里同一批改。

| `pkg` | 约束 | 依据 |
|---|---|---|
| `engine/**` | `deny` `internal/**`、`cmd/**`，测试文件也查 | INV-19、`G.03-R2` |
| `engine/**` | `deny` `net/http`、`net/http/**`；`except` `engine/llm/**`、`engine/tools/builtin/http/**`、`engine/tools/builtin/fetch/**`、`engine/mcp/**` | INV-19 |
| `engine/**` | `allow` `gen/**`、`engine/**` | `G.03-R2` |
| `engine/graph/**` | `allow` `gen/**`、`engine/graph/**` | `E.01` §1 |
| `engine/schema/**` | `allow` `gen/**`、`engine/graph/**`、`engine/schema/**` | 同上 |
| `engine/op/**` | `allow` `gen/**`、`engine/graph/**`、`engine/schema/**`、`engine/authz/**`、`engine/op/**` | 同上 |
| `engine/authz/**` | `allow` `gen/**`、`engine/graph/**`、`engine/authz/**` | 同上 |
| `engine/store/**` | `allow` `gen/**`、`engine/store/**` | 同上 |
| `engine/blob/**` | `allow` `engine/blob/**` | 同上 |
| `engine/obs/**` | `allow` `gen/**`、`engine/obs/**` | 同上 |
| `engine/llm/**` | `allow` `gen/**`、`engine/obs/**`、`engine/llm/**` | 同上 |
| `engine/tools/**` | `allow` `gen/**`、`engine/blob/**`、`engine/obs/**`、`engine/authz/**`、`engine/tools/**` | 同上 |
| `engine/mcp/**` | `allow` `gen/**`、`engine/tools/**`、`engine/mcp/**` | 同上 |
| `engine/ctxasm/**` | `allow` `gen/**`、`engine/schema/**`、`engine/blob/**`、`engine/llm`、`engine/ctxasm/**` | 同上（`llm` 只用接口包，不用协议和录放） |
| `engine/exec/**` | `allow` `gen/**`、`engine/graph/**`、`engine/schema/**`、`engine/ctxasm/**`、`engine/llm`、`engine/tools`、`engine/obs/**`、`engine/blob/**`、`engine/exec/**` | 同上 |
| `engine/sched/**` | `allow` `gen/**`、`engine/graph/**`、`engine/obs/**`、`engine/exec`、`engine/sched/**` | 同上 |
| `engine/run/**` | `deny` `engine/orch/**` | 同上 |
| `engine/orch/**` | `allow` `gen/**`、`engine/graph/**`、`engine/op/**`、`engine/schema/**`、`engine/authz/**`、`engine/tools/**`、`engine/exec`、`engine/orch/**` | 同上 |
| `internal/platform/**` | `allow` `gen/**`、`internal/platform/**` | `B.01` §2、`G.03-R3` |
| `internal/app/**` | `allow` `gen/**`、`engine/**`、`internal/platform/**`、`internal/app/**` | 同上 |
| `internal/sse/**` | `allow` `gen/**`、`engine/obs/**`、`engine/store/**`、`internal/sse/**` | 同上 |
| `internal/api/**` | `allow` `gen/**`、`engine`、`internal/app/**`、`internal/sse/**`、`internal/platform/auth`、`schema/builtin/messages`、`internal/api/**` | 同上 |
| `gen/**` | `allow` `[]` | `C.14`（生成物只依赖标准库） |
| `schema/**` | `allow` `[]` | `G.03` §2（契约层的 Go 包只放嵌入的数据） |

`cmd/**`、`tools/**` 不受约束。`internal/app` 的"只用暴露的接口"、`llm` 的"只用计数接口"这类包内细节静态查不了，用 Go 的 `internal/` 目录隐藏实现（`G.03-R8`）。

## 6. 不变量
- 仓库的 `main` 上 `go run ./tools/depcheck` 没有违规
- 规则文件写错时退出码 2，不会被当成"没有违规"

## 7. 错误处理
规则文件格式错：写出文件和行号（`goccy/go-yaml` 的位置）；内容错（缺 `pkg` 或 `why`、`allow` 和 `deny` 都没写、模式写法不对）：写出是第几条、哪个字段。Go 源文件解析失败：写出文件和原因。

## 8. 验收标准
1. 对一组故意违规的包逐条报出文件、行号和理由
2. 允许的写法（`except`、测试文件里的 `httptest`、仓库外的依赖）不误报
3. 仓库自己通过
4. 规则文件写错时报错退出，不放行

### 实施卡
- 要建 / 要改的文件：`tools/depcheck/main.go`、`tools/depcheck/rules.go`、`tools/depcheck/scan.go`、`tools/depcheck/rules.yaml`、`tools/depcheck/main_test.go`、`docs/checks.md`
- `tools/depcheck/main.go` 现在是 `O.01` 留下的桩（`STUB(G.03)`），本叶子整体替换（`G.02.06-R10`，`P.09` K254）；`docs/checks.md` §3 删掉 depcheck 那一行
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/`、`cmd/`、`web/`、`tools/build/`、`tools/relay/`、`tools/ci/`
- 测试用例：
  - `G0301-T1 规则文件`：合法的规则能加载；语法错报文件和行号；缺 `pkg`、缺 `why`、`allow` 和 `deny` 都没写、不认识的字段、模式写法不对（空段、`**` 不在末尾、以 `/` 开头）各自报错并写明第几条；`allow: []` 和不写 `allow` 不同
  - `G0301-T2 模式匹配`：`a/**` 匹配 `a`、`a/b`、`a/b/c`，不匹配 `ab`、`ab/c`；不带 `/**` 的完全相同才匹配；`net/http` 不匹配 `net/http/httptest`，`net/http/**` 匹配
  - `G0301-T3 违规检出`：在临时目录建一个最小模块和一份测试规则：`engine/x` import `internal/y` 报；`engine/store` import `engine/graph` 报（`allow`）；`engine/blob` import `net/http` 报；`engine/llm` import `net/http` 不报（`except`）；`internal/platform/a` import `internal/api` 报；`engine/x` 的测试文件 import `internal/y` 报（`tests: true`）；`engine/store` 的测试文件 import `net/http/httptest` 不报；`testdata/`、`_x/`、`.x/` 和嵌套模块里的违规不报；每条报告有文件、行号、包、import 路径和 `why`；有违规退出码 1，规则文件写错退出码 2
  - `G0301-T4 仓库自检`：用仓库的 `rules.yaml` 检查仓库本身，没有违规、退出码 0；`rules.yaml` 里有 §5.3 表的每一行（`E.01` §1 的 15 个包、`B.01` §2 的 4 个包、`gen/**`、`schema/**`）
- 允许使用的依赖：标准库、`github.com/goccy/go-yaml`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑦ 通过

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 新建：用户决定 M0 补做 depcheck；`G.03` 是规范、不能领取，实现单独成一个实施叶子；规则逐行对应 `E.01` §1、`B.01` §2；状态"已审" | `P.09` K254 |
