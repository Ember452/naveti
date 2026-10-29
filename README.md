# naveti

基于持久化 agent 内核的个人 agent。

内核来自 pi 1.4.0 的源码快照（来源与偏离见 [`NOTICE.md`](./NOTICE.md) 与 [`docs/migration/`](./docs/migration/)），本仓库在它之上自建产品层。**产品层（`packages/contracts`、`platform`、`providers`、`features` 与 `apps/`）尚未建立**——现在这个仓库能保证的是：内核干净、门禁可跑、结构规则有机检。

## 现在有什么

```
packages/kernel/{telemetry,ai,chord,codemode,mcp,durable}   六个内核包，可改，按档位改
docs/structure.md                                            空间轴权威：放哪、何时建
KERNEL.md                                                    内核能改到什么程度、怎么记账
docs/kernel/{seats,divergence}.md                            扩展点清单、改动账本
docs/migration/baseline.md                                   什么算绿、哪些是平台限制
AGENTS.md                                                    agent 在本仓库的硬约束
```

设计取向只有一句：**一个功能一个包，内核可改但必须留痕，每条规则都要能被机器检查。**

## 命令

```bash
pnpm install

pnpm build          # 六包构建，不联网
pnpm check          # biome + 依赖与导入守卫 + 锁文件一致性 + 测试清单棘轮 + tsc
pnpm test:ci        # 门禁测试：单进程 projects + 密封环境（需先 build）

pnpm build:catalog  # 显式刷新模型目录（联网），产物 diff 单独提交
pnpm hooks:install  # 一次性装 pre-commit / pre-push 钩子
```

`pnpm test`（逐包脚本）不是 Windows 上的门禁，原因见 `docs/migration/baseline.md`。

## 状态

内核迁移与 P0 结构改造已完成，Windows 与 Ubuntu 两侧门禁全绿（数字与限制见 `docs/migration/baseline.md`）。下一步是产品层主干：`contracts` → `platform/host` → `apps/server` → 第一个功能。

## 许可

见 [`LICENSE`](./LICENSE)。上游来源与商标归属见 [`NOTICE.md`](./NOTICE.md)。
