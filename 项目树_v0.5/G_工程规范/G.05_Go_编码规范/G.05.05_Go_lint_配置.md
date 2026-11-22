# G.05.05 Go lint 配置

| 项 | 内容 |
|---|---|
| 编号 | G.05.05 |
| 类型 | 规范 |
| 上级 | G.05 Go 编码规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 配置
`.golangci.yml`（golangci-lint v1.6x 或更新）：
```yaml
run:
  timeout: 5m
linters:
  disable-all: true
  enable:
    - govet          # 官方静态检查
    - staticcheck    # 最全面的 bug 检查
    - errcheck       # G.05.01-R5
    - errorlint      # G.05.01-R2：用 errors.Is/As
    - wrapcheck      # G.05.01-R1：跨包返回的错误要包装
    - errname        # G.04.01：Err 前缀、Error 后缀
    - revive         # 命名、注释
    - gochecknoglobals  # G.05.03-R4
    - forbidigo      # 禁止 fmt.Print、log.Print、裸 go、panic、if provider ==
    - gosec          # 安全问题
    - bodyclose      # HTTP 响应体必须关闭
    - contextcheck   # context 传递
    - noctx          # HTTP 请求必须带 context
    - unparam
    - unused
    - gocritic
    - misspell
    - gofumpt        # 格式
    - goimports
linters-settings:
  forbidigo:
    forbid:
      - p: '^fmt\.Print.*$'
        msg: 用 slog（G.12）
      - p: '^log\.(Print|Fatal|Panic).*$'
        msg: 用 slog（G.12）
      - p: '^panic$'
        msg: 只允许在 Must* 函数中使用（G.05.01-R6）
  revive:
    rules:
      - name: exported
      - name: package-comments
      - name: receiver-naming
      - name: var-naming
issues:
  exclude-rules:
    - path: '^gen/'
      linters: [revive, gochecknoglobals, unused]
    - path: '_test\.go$'
      linters: [wrapcheck, gochecknoglobals]
```

## 2. 规则
- **G.05.05-R1** 不允许在 CI 里放宽规则。确实需要豁免某一处时，写 `//nolint:<规则> // 原因`，原因不能为空（`nolintlint` 检查）。
- **G.05.05-R2** 禁止 `if provider == "xxx"`（INV-18）由自定义检查实现：`tools/lint/quirkscheck`，在 `engine/llm` 下查找对厂商名字符串的比较。
- **G.05.05-R3** 禁止在调度、校验代码里比较节点类型名（INV-02）：`tools/lint/typenamecheck`，检查 `engine/sched`、`engine/schema`、`engine/run` 下对原子节点类型名常量的比较。
