# E.14.02 Agent

| 项 | 内容 |
|---|---|
| 编号 | E.14.02 |
| 类型 | 实施 |
| 上级 | E.14 exec 执行器 |
| 下级 | E.14.02.01 工具调用循环、E.14.02.02 生命周期、E.14.02.03 输出类型校验 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-23 |

## 1. 职责
Agent 节点：**唯一调用模型的节点**（INV-05）。拿上下文包、模型、角色卡、工具，执行"模型调用 ↔ 工具调用"的循环，产出符合 `output_schema` 的结果。

## 2. 端口与参数
| 端口 | 方向 | 类型 |
|---|---|---|
| `context` | 入（必） | 上下文包@1（INV-07） |
| `model` | 入（必） | 资源引用@1（kind=模型） |
| `prompt` | 入 | 资源引用@1（kind=提示词，接提示词节点；有连线时代替 `instruction`） |
| `tools` | 入（多） | 工具端点@1 |
| `result` | 出 | $T（T ← output_schema） |

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `rolecard` | rolecard_ref | — | 内联；`名称@版本` 或 `名称@latest`，冻结快照时解析成具体版本（`C.13.02-R4`） |
| `instruction` | text | '' | 内联；这一次要做什么（`U.10.07` §3）。`prompt` 端口有连线时取上游提示词节点渲染出的文本，界面显示"由上游提供"（`C.03.05-R2`、`R5`） |
| `output_schema` | type_ref | 方案@1 | 内联 |
| `lifecycle` | enum：ephemeral / resident | ephemeral | 内联；见 `E.14.02.02` |
| `temperature` | number 0–1 | 0.7 | — |
| `reasoning` | enum：''/off/minimal/low/medium/high/xhigh/max | '' | 思考强度，和对话框同一套 7 级（`U.09.06-R5`）。`''` = 用设置里的默认强度（缺省 medium，`U.09.06-R6`）；属性页只列出所选模型支持的强度（`C.16-R5`）；模型不支持时按 quirks 映射到最接近的一级并记 warn（`E.10.05`）。`P.09` Q24 |
| `max_tool_calls` | integer 1–50 | 10 | 见 `E.14.02.01` |
| `max_turns` | integer 1–50 | 12 | 模型调用轮数上限 |
| `repair_retry` | integer 0–3 | 2 | 见 `E.14.02.03` |
| `max_output_tokens` | integer | 模型默认 | — |
| `context_src` | — | 上下文装配 | kernel 锁 |

## 3. 下级清单
| 编号 | 名称 |
|---|---|
| E.14.02.01 | 工具调用循环 |
| E.14.02.02 | 生命周期 |
| E.14.02.03 | 输出类型校验 |

## 4. 共同约束
- **E.14.02-R1** `Caps{Model: true, Tools: true, Ask: true}`；注册表只允许这个执行器声明 `Model`（`E.03.01`）。
- **E.14.02-R2** 摘要（上下文溢出、长驻压缩）也通过 Agent 执行器的内部执行完成（`P.09` K32），由 `exec.Summarizer` 封装。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 参数补 `rolecard`、`instruction`；`prompt` 端口说明接提示词节点 | `P.09` K213 |
