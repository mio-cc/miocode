# G.03 仓库与目录规范

| 项 | 内容 |
|---|---|
| 编号 | G.03 |
| 类型 | 规范 |
| 上级 | G 工程规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§1 |
| 最后修改 | 2026-11-22 |

## 1. 目的
规定仓库里每个目录放什么、不许放什么。目录乱了，依赖方向就会乱（INV-19），实施模型也会把文件放错地方。

## 2. 完整目录树
```
harness/
├─ go.mod  go.sum  Makefile  Taskfile.yaml  .golangci.yml  LICENSE  NOTICE  CHANGELOG.md  README.md
├─ cmd/
│  ├─ harnessd/            # 服务入口：main.go、embed.go（go:embed web/dist）
│  └─ harnessctl/          # 命令行工具
├─ schema/                 # ★ 契约层唯一事实来源（C）
│  ├─ *.schema.json
│  ├─ builtin/             # 内置数据：nodedefs/ types/ recipes/ rolecards/ messages/ 以及各种 *.yaml 数据表
│  └─ examples/            # 合法示例 + invalid/ 非法示例（测试用）
├─ gen/                    # ← 由 schema 生成的 Go 代码，禁止手改
├─ engine/                 # 内核库（E），可以被别的 Go 程序 import
│  ├─ graph/ schema/ ext/ op/ authz/ store/ blob/ obs/ llm/ tools/ mcp/ ctxasm/ exec/ sched/ run/ orch/
├─ internal/               # 产品层（B），不对外
│  ├─ api/ sse/ app/ platform/
├─ web/                    # 前端（W）
│  ├─ index.html  vite.config.ts  tsconfig.json  package.json  pnpm-lock.yaml
│  ├─ public/fonts/        # 自托管字体
│  └─ src/
│     ├─ main.tsx  App.tsx  routes/
│     ├─ shell/            # 外壳布局（W.02）
│     ├─ canvas/           # 画布引擎（W.06）；canvas/core/ 不 import React
│     ├─ panels/           # 面板组件（W.07）
│     ├─ components/ui/    # 基础组件（W.08）
│     ├─ pages/            # 页面（W.09）
│     ├─ state/            # zustand stores（W.03）
│     ├─ ops/              # 前端 Op 层（W.05）
│     ├─ lib/protocol/     # 协议层（W.04）；generated/ 禁止手改
│     ├─ lib/i18n/         # 文案（W.10）
│     └─ styles/           # tokens.css（复制自设计令牌源）、base.css
├─ design/                 # 设计令牌源 tokens.css、原始字体、图标 SVG 源（U）；web/ 里的副本由生成器复制
├─ templates/              # 内置模板包（T）
├─ evals/                  # 评测集（Q.07）
├─ testdata/               # 跨模块共用的测试数据（cassette、夹具）
├─ docs/                   # 只放面向开发者的简短说明；设计文档在 sj/项目树_v0.5，不复制进仓库
└─ tools/                  # 开发工具：gen/ depcheck/ release/ lint 规则
```

## 3. 规则
| 编号 | 规则 |
|---|---|
| G.03-R1 | 一级目录只能是上面列出的这些。新增一级目录必须改本文 |
| G.03-R2 | `engine/` 下的包只能 import `gen/`、`engine/` 其他包和标准库 / 已登记依赖，不能 import `internal/`、`cmd/`（INV-19） |
| G.03-R3 | `internal/platform/` 不能 import `engine/` 以外的产品层包；`internal/api/` 只能通过 `internal/app/` 暴露的接口使用产品层 |
| G.03-R4 | 包之间的依赖只能向下（`引01` §2 依赖图）；环形依赖由 Go 编译器拦截，跨层的反向依赖由 `tools/depcheck` 拦截 |
| G.03-R5 | 测试数据：只被一个包用的放在该包的 `testdata/`；多个包共用的放在仓库根 `testdata/` |
| G.03-R6 | `gen/`、`web/src/lib/protocol/generated/`、`web/dist/` 是生成物：`gen/` 和 `generated/` 要提交进仓库（便于审查），`web/dist/` 不提交 |
| G.03-R7 | 不建 `utils/`、`common/`、`helpers/`、`misc/` 这类没有含义的目录。工具函数放在使用它的包里；被三个以上包用到时，新建一个按用途命名的包（如 `engine/internal/canon`） |
| G.03-R8 | Go 的 `internal/` 子目录可以用来隐藏包内实现，例如 `engine/op/internal/rebase/` |
| G.03-R9 | 前端 `src/` 下新建目录必须属于 W 树里的某个节点 |

## 4. 检查方式
- `go run ./tools/depcheck`：按 R2、R3、R4 检查 import，规则写在 `tools/depcheck/rules.yaml`。
- CI 脚本：一级目录白名单；`git ls-files gen/ generated/` 里的文件和生成器输出一致。
