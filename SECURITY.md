# 安全策略

## 支持范围

本项目尚未发布版本。只有 `main` 分支接受安全修复；历史提交与分支不提供支持。

内核部分来自 pi 1.4.0 源码快照（见 `NOTICE.md`），本仓库对它的改动全部记录在 `docs/kernel/divergence.md`。上游修复的摘取政策见 `KERNEL.md` §5。

## 报告漏洞

**不要开公开 issue。** 请使用 GitHub 的私有报告通道：

1. 打开仓库的 **Security** 标签页。
2. 选择 **Report a vulnerability**（GitHub Security Advisories）。

报告里请包含：受影响的包与版本、复现步骤或最小示例、影响（数据丢失 / 权限提升 / 拒绝服务 / 信息泄露）、你已经确认过的前提条件。

## 预期响应

单人维护，不承诺 SLA。通常会在一周内确认收到；修复与发布节奏取决于影响面——数据损坏类优先于其它一切。

## 依赖

- 直接依赖钉死精确版本，`check-pinned-deps` 会拦浮动范围。
- `pnpm-workspace.yaml` 的 `allowBuilds` 是显式清单：只有经过判断的包才允许在安装时执行构建脚本。
- `npm-audit` 工作流定期审计依赖；升级依赖需要跑 `pnpm check && pnpm test:ci`。

## 出网行为

- `pnpm build` **不联网**。模型目录只做校验（`check:model-data`），刷新是显式的 `pnpm build:catalog`，它的产物 diff 必须单独提交。
- 测试在密封环境里跑（`scripts/hermetic-env.mjs`）：临时 HOME、清空 API key、不读用户 git/npm 配置。
