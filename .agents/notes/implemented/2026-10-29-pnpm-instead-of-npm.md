# 包管理器从 npm 换成 pnpm（隔离式 node_modules）

- 背景：产品层会有几十个包，而 npm 的扁平 `node_modules` 会把"代码 import 了但 package.json 没声明"的依赖藏起来。这个仓库已经被这种藏法喂过：`@smithy/types` 在 `ai` 里被 import，manifest 却没有它，npm 靠提升让它一直没暴露。
- 决定：pnpm 11.13.0 + 隔离式 `node_modules`；包间依赖一律 `workspace:*`；依赖的构建脚本由 `pnpm-workspace.yaml` 的 `allowBuilds` 显式放行（当前五个：canvas 拒绝，其余四个允许）。用 `check-workspace-resolution.mjs` 把"必须 `workspace:*`"变成红线。
- 被拒绝的替代方案：`node-linker=hoisted`（模拟 npm）。迁移风险最低，但等于把刚买到的隔离性又关掉；`@smithy/types` 那次就会继续隐形。
- 后果：换管理器当天的代价是一次性重写脚本与 CI；长期收益是"未声明依赖立刻红"。锁文件从 `package-lock.json` 换成 `pnpm-lock.yaml`，由 `check-lockfile-commit.mjs` 保证与 manifest 同进同退。
