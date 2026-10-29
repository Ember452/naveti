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

| 包 | 拥有什么 | 关键符号 | 内部依赖 |
| --- | --- | --- | --- |
| `telemetry` | 遥测契约与类型化 schema | 契约类型、`render` | 无 |
| `ai` | 模型适配、模型目录、流式事件、token 计量 | `createModels`、provider 导出 | `telemetry` |
| `chord` | 契约、复制状态、JSON 链路上的 RPC、watch/snapshot | `createHost`、`defineFacet`、`local`/`remote` | `telemetry` |
| `codemode` | 沙箱内执行 JS，唯一能力是调用注入的工具 | 沙箱入口 | 无 |
| `mcp` | Model Context Protocol 客户端 | 客户端与传输 | 无 |
| `durable` | 会话日志、doc、task 状态机与调度、工具执行、审批 hook、装配 | `Harness.open`、`defineExtension`、`defineTool`、`defineDoc`、`defineTask`、`hook`、`section` | `chord`、`ai`、`codemode`、`telemetry` |

**内部依赖列逐条对应各包 `package.json` 的 `dependencies`，以那里为准。** 它纠正过一个常见的误写：`ai` 与 `chord` 是并列的（`chord` 不依赖 `ai`），`codemode` 不依赖 `chord`，`durable` 不依赖 `mcp`。

## 阅读顺序（按任务，而不是从头读到尾）

| 你要做什么 | 读这些 |
| --- | --- |
| 看会话怎么存、怎么恢复 | `durable/src/harness/harness.ts` → `documents.ts` → `entries.ts` |
| 接一个工具或 hook | `durable/src/harness/define.ts` → `tool.ts` → `hooks` 的类型 |
| 看前端订阅的那条流 | `chord/src/index.ts` 的 watch/snapshot 面 |
| 换模型或加 provider | `ai/src/models.ts` + `catalog/` |
| 改沙箱能力面 | `codemode/src/index.ts` |

**不必读的**：`dist/`、`catalog/` 里的生成物、`test/` 里的夹具（除你要改的那个用例）、各包 CHANGELOG。

## 这里不该出现

UI、命令、皮肤、安装器、发布流程、产品的业务判断。那些属于 `packages/{contracts,platform,providers,features}` 与 `apps/`。

## 命令

```bash
pnpm build   # 六包，拓扑序，不联网
pnpm check   # 类型、依赖、入口图、守卫
pnpm test:ci # 门禁测试（需先 build）
```
