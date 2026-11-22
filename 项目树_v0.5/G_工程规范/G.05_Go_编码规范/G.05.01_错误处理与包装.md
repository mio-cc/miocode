# G.05.01 错误处理与包装

| 项 | 内容 |
|---|---|
| 编号 | G.05.01 |
| 类型 | 规范 |
| 上级 | G.05 Go 编码规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 规则
| 编号 | 规则 |
|---|---|
| G.05.01-R1 | 错误一律向上返回，并用 `fmt.Errorf("动作: %w", err)` 包装上下文。动作写"在做什么"，如 `"apply op 01J…: %w"` |
| G.05.01-R2 | 需要被调用方判断的错误定义成包级哨兵错误（`var ErrConflict = errors.New("op: conflict")`）或错误类型；调用方用 `errors.Is` / `errors.As` 判断，不比较字符串 |
| G.05.01-R3 | 错误信息小写开头、不带句号、英文；给用户看的中文文案由 API 层按错误码查表生成（`C.11`、`G.13`），不放在 error 字符串里 |
| G.05.01-R4 | 同一个错误只处理一次：要么记日志，要么返回，不能既记日志又返回 |
| G.05.01-R5 | 不允许 `_ = f()` 丢弃错误，除非注释说明原因（例如 `Close` 只读文件） |
| G.05.01-R6 | 只有两种情况允许 panic：程序启动时的配置错误（`Must*` 函数）；不可能发生的程序缺陷（并注释为什么不可能）。运行时任何来自用户、模型、网络的数据都不能导致 panic |
| G.05.01-R7 | 调度器、执行器、HTTP 处理函数的入口都要 `recover`，把 panic 转成 `internal` 类错误并记录堆栈，不能让一个节点的 panic 拖垮整个进程 |
| G.05.01-R8 | 内核错误到 API 错误码的映射只在 `internal/api/errors.go` 一处做；内核里不出现 HTTP 状态码 |
| G.05.01-R9 | 节点失败必须归入 `C.11` §4 的失败类别之一；执行器返回的错误通过 `exec.Fail(class, err)` 包装 |

## 2. 例子
```go
// 正例
if err := s.Ops().Append(op, inv, v); err != nil {
    return fmt.Errorf("append op %s at v%d: %w", op.ID, v, err)
}
if errors.Is(err, op.ErrConflict) { … }

// 反例
if err != nil {
    log.Println("出错了", err)       // R3、R4、G.05-R4
    return errors.New("写入失败")     // 丢失原错误
}
```

## 3. 检查方式
`errcheck`、`errorlint`、`wrapcheck`（只对跨包调用）、`forbidigo`（禁止 `panic(` 出现在非 `Must` 函数，豁免需 `//nolint:forbidigo // 原因`）。
