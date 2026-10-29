# 依赖审计工作流转 pnpm，并真修掉它报的 9 条公告

- 背景：合并 PR #4 后核对本地/远端一致性时发现 `npm audit` 定时任务每天红：它跑 `npm ci`，而 `package-lock.json` 已在 P0 删除。`docs/structure.md` §14 早就写了"换 pnpm 后改 `pnpm audit`"，属于**写了待办没执行**——而且只有定时任务会暴露它，`check` 与 CI 都看不见。
- 决定：
  1. 工作流改名 `deps-audit.yml`：`pnpm install --frozen-lockfile --prod` + `node scripts/deps-audit.mjs`；删除 `scripts/npm-audit.mjs`。
  2. 审计脚本读 `pnpm audit --prod --json`，并支持 `NAVETI_AUDIT_REPORT` / `NAVETI_AUDIT_ACCEPT` 两个注入点——没有它们这条检查只能联网跑、无法写红例。
  3. 豁免从代码里搬进 `scripts/deps-audit-accept.json`：批一条豁免是一次**数据 diff**，不是改检查器。
  4. `pnpm-workspace.yaml` 加 per-parent `overrides`（`openai>undici ^7.30.1`、`openai>zod ^4.6.6`、`@anthropic-ai/sdk>zod ^4.6.6`），把补丁版本推进去；补丁版都在 SDK 自己声明的范围内，因此这是修，不是压。
  5. `check-lockfile-commit` 现在把 `pnpm-workspace.yaml` 的 `overrides` 段当依赖变更：否则"改 overrides + 更新锁文件"会被自己的守卫判红，而唯一的出路是把逃生阀当常规用。
- 被拒绝的替代方案：
  - **保留 `npm audit signatures` 步骤。** pnpm 没有等价子命令。留着就是照抄一个已经解释不了的工具。代价明确写进工作流注释：签名校验换成"`--frozen-lockfile` 每次安装都校验 integrity"，覆盖仍在，强度略降。
  - **把那 9 条公告逐条写进豁免表。** 5 high / 4 moderate 都有已发布的补丁版，且补丁版落在 SDK 声明范围内——豁免它们是把可修的债记成不可修的债。
  - **`zod` 全局 override。** 会把所有包的 zod 一起钉死，包括只支持 v3 的消费者；override 的范围必须是出问题的那条父边。
  - **顺手把三条文档守卫合并成一条。** 没有痛点的证据（三条各 0.1 秒、各自一个失败面），合并只是让我少登记一次。改成机检"漏登记"这件事本身（见同日另一条）。
- 修正（同日，未合入前）：频率从每天改为**每周一**（`37 7 * * 1`）。理由不是省资源，是信号密度：本仓没有自动升级依赖的机器人，`minimumReleaseAge` 又挡着刚发布的版本，每天跑产生不了新信息，只会让唯一会读它的人学会静音它——而这条守卫的全部效力就建立在“有人读”上。何时改回每天的两个触发条件写在 `deps-audit.yml` 注释里，也记进 `docs/plan/master-plan.md` 的时机表。
- 后果：`pnpm audit --prod` 从 9 条降到 0 条；`check` 的守卫链多一环；锁文件与 `pnpm-workspace.yaml` 现在必须在同一提交里动。旧的 node-forge 豁免条目随代码一起消失——它引用的 `gondolin` 扩展从未 vendor 进来，属于**早就该失效的豁免**，而旧脚本只用 `::warning::` 提示，没人看。工作流与旧脚本已随本次一并删除（`check-gate-registration` 会拦住悬空的 `node scripts/...` 调用，所以残留引用不可能活过这个提交）。
