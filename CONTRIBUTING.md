# 贡献指南

这是一个以单人开发为主的项目，但仓库里留了 issue/PR 的准入门禁。下面是你需要知道的全部。

## 谁能提交

`.github/workflows/pr-gate.yml` 会检查 PR 作者是否在 `.github/APPROVED_CONTRIBUTORS` 里，或者是否是仓库协作者。名单初始为空（只保留协作者），外部 PR 会被自动关闭并留下说明。想提交请先开 issue；维护者在 issue 回复 `lgtmi`（后续 issue 保持打开）或 `lgtm`（后续 issue 与 PR 都保持打开）后，`approve-contributor.yml` 会把该账号写进名单。

## Issue 优先

写代码前先开 issue，说明：现象 / 期望 / 复现步骤 / 受影响的包。标签用 `pkg:*`（`pkg:durable`、`pkg:chord`、`pkg:ai` 等）。

没有 issue 的 PR 不进入评审。

## PR 的最低门槛

三个 job 必须全绿：

| Job | 覆盖 |
| --- | --- |
| `build-check` | `pnpm install --frozen-lockfile` → `pnpm build` → `pnpm check` |
| `test-ci` | `pnpm test:ci`：单进程、全部 project、密封环境，与本地同源 |
| `durable-lanes` | `test:retention0` + `test:store` + `test:workers`（`test:ci` 不跑的三条） |

本地等价命令：

```bash
pnpm install
pnpm build          # 测试需要 dist：ai 与 chord 的 probe 用例走构建产物
pnpm check
pnpm test:ci        # 单进程 + 密封环境
pnpm smoke          # 持久化与恢复冒烟
```

装一次钩子，让静态检查在提交时就跑：`pnpm hooks:install`。

## 提交信息

`type(scope): 摘要`，正文写**为什么**。一个提交只做一件事；重构与行为改变不要混在一起。

```
fix(durable): keep the task id stable across a restart

The scheduler reused the previous id when a resumed run had no inbox entry,
so the ordering test saw two tasks for one id.
```

## 会被拒绝的改动

- 给内核加产品语义（UI、命令、皮肤、安装器）。见 `KERNEL.md` §1。
- 改内核语义却没有账本条目（`docs/kernel/divergence.md`）或 ADR。见 `KERNEL.md` §2。
- 为了让测试变绿而删测试、加 `.skip`、放宽断言，或修改 `scripts/test-integrity.json` 而不在同一提交里说明。
- 关掉、注释掉或绕过守卫。
- 把上游品牌、链接、CHANGELOG 历史重新引入（见 `docs/migration/deviations.md` D1）。

## 排版与语言

- 代码与注释用英文；面向使用者的文档用中文（`docs/`）。
- 缩进由 biome 决定，不要手调。`pnpm check` 会格式化。
- 一个事实只有一处权威；引用写"见 X"，不要复制正文。
