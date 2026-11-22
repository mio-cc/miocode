# E.11.06 内置工具：代码执行

| 项 | 内容 |
|---|---|
| 编号 | E.11.06 |
| 类型 | 实施 |
| 上级 | E.11 tools 工具 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 选§4 |
| 最后修改 | 2026-11-22 |

## 1. 职责
内置代码执行工具：在 wazero（WebAssembly）沙箱里运行 JavaScript 和 Python 代码（`S.06`）。

## 2. 不做什么
- 不支持任意本地进程执行
- v1 不提供 Docker 执行器的实现（可选执行器作为后续叶子）

## 3. 继承的上级约束
`S.06` §1、`P.09` K25、K35。

## 4. 接口
```go
// builtin:code_exec
type Args struct {
    Lang     string            // js | python
    Code     string
    Inputs   map[string]any    // 作为 JSON 传给程序
    Files    []string          // 工作区里要只读挂载的文件引用
    TimeoutMs int              // 默认 10000，上限 30000
    MemoryMB  int              // 默认 256，上限 512
}
```

## 5. 行为
- 运行时：QuickJS 的 WASI 构建（M2 先做）、CPython 的 WASI 构建（M3）；运行时文件随程序发布，加载前校验哈希（`S.12-R8`）。
- 文件系统：只挂载本次调用的临时目录（读写）和 `Files`（只读）；看不到其他任何路径。
- 网络：无。
- 资源：CPU 时间、内存、输出大小（10MB）上限；超出强制终止，返回 user_input"沙箱超限：{项目}"。
- 环境变量：空。
- 风险：L1；工具配置声明出站白名单时为 L2（v1 不开放出站）。

## 6. 不变量
- 沙箱里的代码无法访问宿主文件系统和网络

## 7. 错误处理
代码异常：返回 Result（Summary 为错误输出），不当作工具失败；超限：user_input。

## 8. 验收标准
1. `S.06` §4 的四条用例全部通过
2. JS 与 Python 各 10 个功能用例
3. 运行时文件哈希校验失败时拒绝加载

### 实施卡
- 要建 / 要改的文件：`engine/tools/builtin/code/*.go`、`engine/tools/builtin/code/runtimes/*.wasm（构建脚本生成）`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1106-T1 文件隔离`
  - `E1106-T2 网络隔离`
  - `E1106-T3 超时`
  - `E1106-T4 内存`
  - `E1106-T5 功能用例`
- 允许使用的依赖：`tetratelabs/wazero`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
