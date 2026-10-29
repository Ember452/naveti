# packages/kernel

六个内核包放在这里。**它是运行时，不是产品层。**

## 谁拥有

本仓库拥有它。来源是 pi 1.4.0 源码快照（`NOTICE.md`），但**不是冻结的第三方依赖**：允许改，按档位改。

| 档 | 内容 | 门槛 |
| --- | --- | --- |
| A | 新扩展点、新 provider 数据、修 bug | 补 conformance 测试 + 更新 `docs/kernel/seats.md` |
| B | entry schema、task 状态机、commit 原子性、审批/审计语义 | ADR + 迁移脚本 + `tests/golden/` 更新 + 账本条目 |
| C | 拆包、换 transport、改持久化格式 | 停功能开发，一次改完 |

完整定义见 [`KERNEL.md`](../../KERNEL.md) §2。

## 先看什么

1. 要改哪个文件 → 先查 [`docs/kernel/divergence.md`](../../docs/kernel/divergence.md)：它是否已经偏离过上游。
2. 要接一个挂点 → 查 [`docs/kernel/seats.md`](../../docs/kernel/seats.md)：seat 是封闭清单。
3. 运行时怎么运转 → 查 [`docs/architecture.md`](../../docs/architecture.md)。

## 六包一句话

| 包 | 拥有什么 |
| --- | --- |
| `durable` | 会话日志、doc、task 状态机与调度、工具执行、审批 hook、装配（`Harness.open`） |
| `chord` | 契约、复制状态、JSON 链路上的 RPC、watch/snapshot、SQLite 与内存后端 |
| `ai` | 模型适配、模型目录、流式事件、token 计量 |
| `mcp` | Model Context Protocol 客户端 |
| `codemode` | 沙箱内执行 JS，唯一能力是调用注入的工具 |
| `telemetry` | 遥测契约与类型化 schema |

依赖方向：`telemetry ← ai ← chord ← durable`，`codemode`/`mcp` 与它们并列。`durable` 是其余五包的消费者，不是它们的底座。

## 这里不该出现

UI、命令、皮肤、安装器、发布流程、产品的业务判断。那些属于 `packages/{contracts,platform,providers,features}` 与 `apps/`。

## 命令

```bash
pnpm build   # 六包，拓扑序，不联网
pnpm check   # 类型、依赖、入口图、守卫
pnpm test:ci # 门禁测试（需先 build）
```
