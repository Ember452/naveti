# P2 的运行时形状：Durable 在 chord v2 的 store 上，经本机 socket 到第二个端

- 背景：P2 要先把"产品层能接上内核"的前提证死，否则 contracts 与 transport 的形状会在步骤 1–2 定错，`paths` 注入与 chat 落盘都建立在 SQLite 可用上。放到 P3 发现前提错，成本是重写而不是一天。spike 全部放在 `.verify-tmp/p2-spike/`（gitignored），不建 `apps/`。
- 决定（已定案）：
  1. **运行时链**：`openNodeSqliteDatabase(path)` → `openStore(sqliteBackend(db))` → `StoreStorage.open(store, owner)` → `Harness.open(storage, { models, registry, settings: { extensions }, env })`。实测一轮 `read`/`edit`/`bash` 加一次回答后重开同一文件：9 条 entry、3 条 `naveti.tool-result`、entry id 与 kind 逐条相同；库 132 KiB；存储冷开（open + store + claim）中位 8 ms。
  2. **transport**：`platform/host/src/transport/` 的两个实现（进程内 `memoryLinkPair`、绑 `127.0.0.1` 的 WebSocket + token）都产出内核 `Link`；wire 契约立在 `@naveti/chord/next`（`remote` + `host.accept`/`host.connect`），`Link` 是内核已声明的 seam，不在 contracts 重写一份。实测内存链接与真实 WebSocket 各跑一轮：连上 25 ms 拿到首个 view，9 帧 value，3 条 tool-result 经 socket 到达，服务端文件被工具改写。
  3. **远程工厂签名是 `(params, principal, self)`**。`self.open`（打开 Durable 的 native）在 local 与 remote 对象上都可用；把 principal 当 self 会得到 `self.open is not a function`（spike 第一版就这么错的）。
  4. **浏览器可行**：`vite build`（`resolve.conditions: ["source"]`）产出单文件 1.08 MB / 236 KB gzip；bundle 内 `node:sqlite`、`openStore`、`sqliteBackend`、`node:fs`、`node:zlib` 命中均为 0（`durable` 命中 11 次，逐条看过是注释文本）。因此不需要在 contracts 加运行时出口，也不需要 platform/web 再包一层 connect。
  5. **`apps/server` 是普通 Node 进程**：五步之后打印 `ws://127.0.0.1:<port>/?token=…`。宿主是 spawn 它还是 import 进同一进程，两种形态都被"打印地址"这一个接口覆盖，P2 不依赖这个选择，留到 P3。
  6. **`biome.json` 的 `!!apps` 实测**：放一个明显不合格式且带 `debugger` 的 `apps/probe/src/bad.ts`，`node scripts/biome-check.mjs` 仍报 `Checked 1117 files`、exit 0；改成显式的 `apps/*/src/**/*.{ts,tsx}` 后同一探针被报 `Checked 1118 files`、2 errors、exit 1。原因是 `includes` 是白名单且没有任何正向 pattern 命中 `apps/`——它既不是排除也不覆盖。`docs/migration/deviations.md` 的 D4 说"biome.json excludes apps"是错的，已改。
- 仍未定：Electron 内 `node:sqlite` 是否可用、Electron 的包体积与启动耗时。**到期条件：P3 第一次出安装包之前**（同一条写进 `docs/plan/master-plan.md` 的 P3 gate）。退路成本很低：`storage` 是内核已声明的 seam，退路 = 加一个 provider 包，不改任何调用点——这个便宜是 transport 用内核 `Link` 换来的，若改成自研传输，退路就变成"改一批调用点"。另有一条日志事实：Node 24.14.1 下 `node:sqlite` 仍打印 `ExperimentalWarning: SQLite is an experimental feature`（v22.13 起免 flag，22.5–22.12 需 `--experimental-sqlite`），所以 `engines >=22.19` 安全，但启动日志会带上这条警告。
- 被拒绝的替代方案：
  - **chord v1（root 导出的 `createHost`/`acceptWebSockets`）**：`durable` 与本仓库所有 durable×chord 集成例子（`test/examples/35..37`、`store-storage.test.ts`、`harness-registry-reader.test.ts`）只走 `chord/next` + `StoreStorage`，v1 没有任何已验示例。选 v1 等于自己发明两者之间的桥，且拿不到"一个 store 装下 chord 文档与 durable 提交"的原子性。
  - **自研 REST + 自定义 WS 消息层**：要重造 snapshot/delta/重连，`remote` 阶段还得再对齐一次。
  - **spike 里装 Electron 验证 `node:sqlite`**：会把 electron 拉进仓库依赖、动 lockfile 与 `allowBuilds`，而 `apps/desktop` 是 P3。
- 后果：P2 立在上游标 `experimental` 的 `chord/src/next`（142 文件 / 22,517 行）上。`KERNEL.md` §5 的回补策略允许把"未偏离的文件整体替换为上游版本"，所以策略是：**上游若破坏 v2 契约形状，锁快照、不跟随该次回补**；可观测信号是 `sync-upstream` 报告里 `chord/next` 的 changed 数突增。第二个后果：host 的心跳在事件循环被阻塞超过 30 s 时会关闭链接，所以 P3 若把 server 搬进 Electron 主进程，需要重新评估同步阻塞点（工具执行本身走子进程，不受影响）。
