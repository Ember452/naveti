# contracts 持有 chord 的契约声明，而不只是类型

- 背景：P2 的 wire 契约必须被宿主和 web 端同时持有。`AGENTS.md` §3 规定"跨进程 wire 类型住 `packages/contracts`"，但 `structure.md` §5 给 contracts 写的却是"可以 import：无（零运行时：只有类型、常量与纯函数）"。在 chord v2 里，一个 wire 契约是一个**值**：`remote(name, { version, params, variants })` 加 `obj()`/`str()` 这些 schema 构造。只把类型放 contracts，两端就各自 `remote()` 一次——两份声明，改一处不报错，正是"两处真相"。
- 决定：contracts 依赖 `@naveti/chord`，导出契约值与 schema；它仍然零 I/O、无状态、无注册表（一次调用只构造一个 branded 声明对象）。`check-package-layers` 把"contracts 可以用的内核包"写成显式白名单，当前只有 `@naveti/chord`——放宽的是一个名字，不是一条规则。`structure.md` §5 的 contracts 行按现实改写。
- 被拒绝的替代方案：
  - **类型在 contracts、契约值在 host**：客户端要拿契约就得再写一遍，或从 host 取——后者会把宿主代码引进浏览器包，正是 `check-client-face` 要防的事。
  - **新建 `packages/platform/wire`**：多一个包解决的是命名，不是边界；且 `AGENTS.md` 已经把 wire 类的东西指定给 contracts。
  - **从 chord 的 barrel 补导出 `Method` 以消 TS2883**：那是改内核，而根因是检查程序要求"声明可移植"——产品包从不经 tsc 产出 `.d.ts`（发布由打包器负责）。`tsconfig.json` 的检查程序因此关掉 `declaration`，内核的声明发射仍由 `pnpm build` 全量跑，CI 的 `build-check` 也在。
- 后果：contracts 的入口预算实测 174 个文件，因为 `@naveti/chord/next` 是整包 barrel。这是"契约 DSL 由 chord 提供"的代价，也是 parked「门面入口的认知面积预算」的第一个数据点：能压缩认知面积的是 `@naveti/host/extend/*`，不是 contracts。浏览器侧不受影响——Vite 打包后 `node:sqlite`、`openStore`、`sqliteBackend`、`node:fs` 的命中都是 0（见 2026-10-30-p2-runtime-shape）。若 chord 将来提供只含契约构造的子路径，contracts 应改用它并把预算压回去。
