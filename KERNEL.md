# KERNEL

本仓库的 `packages/` 是内核基线，来自 pi 的源码快照（见 [`NOTICE.md`](./NOTICE.md)）。
它已经被 vendor 进来，因此**上游的后续变化不会自动进入本仓库**。

## 1. 边界规则

- `packages/*` 是内核，`apps/*` 将来是产品层。**内核不得 import 产品层**，任何 `app` 相关引用都必须留在 `apps/`。
- 产品层只通过包的公开入口（`package.json` 的 `exports`）使用内核，不直接 import `packages/*/src/*` 的内部文件。
- 内核不承载产品语义：UI、命令、皮肤、安装器、发布流程都不进 `packages/*`。

## 2. 允许的改动范围

| 类型 | 是否允许 | 说明 |
| --- | --- | --- |
| 新增扩展点（新的 hook、新的 task 类型、新的 storage 后端） | 允许 | 通过 `defineExtension` / `defineTask` / `Storage` 接口挂接 |
| 新增 provider、模型目录数据 | 允许 | 属商品件，跟随上游生态 |
| 修复 bug | 允许 | 必须附回归测试 |
| 修改 `entry` schema、`task` 状态机语义、commit 原子性 | 需 ADR | 破坏已持久化数据的兼容性 |
| 修改 `policy` / 审批 / 审计语义 | 需 ADR | 属冻结区 |
| 让内核反向依赖产品层 | 禁止 | CI 守卫拦截 |

## 3. 上游回补

不做常规同步，也不做 rebase（本仓库没有上游 git 历史）。只有满足以下**任一**条件时，才从上游摘取改动：

1. 安全漏洞，或数据损坏类 bug（entry 丢失、commit 非原子、恢复后状态错乱）。
2. 需要支持的 provider 新 API，或 MCP 协议新版本，现有代码撑不住。
3. 上游的某个契约改进正好解掉当前正在踩的坑。

摘取方式：`node scripts/sync-upstream.mjs` 生成文本对照，人工挑选后在**同一个改动里**完成并跑通全绿。

**禁止半跟随**：`durable` 与 `chord` 共享 entry schema、delta 编码与 task 语义，单独升级其中一个会造成契约错配，比完全冻结更危险。要么不动，要么成对摘取并全绿。

## 4. 验收

任何改动的最低门槛：

```
npm run check      # biome + pinned-deps + runtime-deps + ts 相对导入 + entry graph + tsc --noEmit
npm test           # 逐包测试
```

迁移基线（2026-10-29）为全绿；修改内核后必须仍然全绿。
