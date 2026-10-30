# packages/platform/host

- **拥有什么**：装配（`openHost`：store → harness → 宿主能力 → 功能的契约 → transport）、seat 的封闭枚举、`paths` 的注入点、本机 loopback transport，以及给功能用的门面 `@naveti/host/extend/*`。
- **可以 import 什么**：kernel、`@naveti/contracts`。**不 import 任何功能**——功能经 `compose.ts` 的 `install()` 进来。
- **占哪些 seat**：不占；它是 seat 的声明方与校验方。
- **依赖谁**：`@naveti/{chord,durable,ai,contracts}` 与 `ws`；数据目录由 `apps/*` 注入，自己不猜。
- **删掉会怎样**：没有任何端能连上内核；`pnpm check` 的 `check-package-layers` 与 `check-entry-graphs` 会先红（产品层入口必须有预算）。

## 组装顺序是设计，不是实现细节

`openHost` 之后调用方做三件事，顺序固定：`install(features)` → `listen()` → （进程结束时）`close()`。`install` 里的 `start` 钩子在契约挂上之后、开始监听之前跑——"确保第一个会话存在"这类工作需要这个位置，而不是在工厂里 await。

## 两个不能破的边界

1. **这个包不出现功能 id**。功能的唯一外部痕迹是 `apps/server/src/compose.ts` 的一行。出现 `chat`/`memory` 这类名字就说明业务判断漏进了平台。
2. **功能只经门面取内核能力**。门面按子路径显式列出（禁 `export *`）；一个有消费者的能力才加子路径，加子路径是门面工作，不是给某个功能开特例。

## 文档

设计背后的理由见 `docs/architecture.md` §2.2（请求进来之后、界面更新之前）与 `docs/kernel/seats.md`；入口预算见 `scripts/entry-budgets.json`。
