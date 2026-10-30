# 停放的点子（parked）

这里放**现在不做、将来某个条件成立时才值得判断**的东西。与 `master-plan.md` 的区别：plan 是"按顺序要做"，这里是"到点再决定要不要做"。

关键设计：**"将来有用"是一个猜测，而会过期的正是这个猜测。** 所以每条都必须写清它依赖的前提，到点时先用现实检验前提，再决定做还是作废。

## 约定

每条必须有四行，`check-parked-triggers` 会检查：

| 字段 | 含义 | 允许的写法 |
| --- | --- | --- |
| `条件：` | 什么现实出现就叫醒它 | `<glob> >= <n>`、`path_exists <路径>`、`仅复核` |
| `复核：` | 条件一直没成立时的兜底 | `review_by <YYYY-MM-DD>` |
| `前提：` | 今天认为"将来会需要"所依赖的那个判断 | 自由文本，但必须**可被现实推翻** |
| `判断依据：` | 到点时用什么标准决定 | 自由文本 |

到点就红。红了必须在**同一次改动**里三选一：

1. **做**——搬进 `master-plan.md` 并实现。
2. **改条件**——前提仍成立、只是时机未到，写下观察到的新事实再推后。
3. **作废**——前提被现实推翻，删掉本条并在 `.agents/notes/rejected/` 留一条理由。

没有第四种处理叫"留着以后再说"。`条件：仅复核` 是给"文件系统里没有任何可观测信号"的条目用的诚实写法——那种情况下不许编造代理指标，叫醒它的只有日期。

## 条目

### 按 diff 选最小证据集

- 来源：DeepSeek harness `dsh-pre-push-checks` 的方法（不借它的脚本，只借判据）
- 条件：`packages/*/*/package.json >= 15`
- 复核：`review_by 2027-06-01`
- 前提：包数变多之后，全量 `test:ci` 的固定成本会开始逼人绕门禁。
- 判断依据：到点先看两件事——`test:ci` 实际耗时是否已让人开始用 `--no-verify` 或只跑局部；以及车道划分是否已有可过滤的边界（`--project` 名字是否稳定）。两条都成立才做；若包到了 15 但耗时仍可接受，说明前提是错的，作废。

### 负控（negative control）作为测试设计规则

- 来源：DeepSeek harness `dsh-ci-test-reliability`
- 条件：`仅复核`
- 复核：`review_by 2027-06-01`
- 备注：原复核日期 2026-12-15；P2 结束前没有可操作信号，提前到期只会阻断无关提交。
- 前提：会出现第二批"异步或资源拥有型测试互相污染"的问题，因此需要把"每个检查都要配一个故意坏掉的输入"升级成对所有测试的硬规则。
- 判断依据：翻 `docs/migration/baseline.md` 的 flakiness 段——如果在 `chord/routines`、`table-migration` 之后又出现了新的同类修复，说明前提成立，写成硬规则；没有出现，说明那是两个孤立缺陷而不是模式，作废。现在没有可观测的信号能表达"又出现了一个"，所以只靠日期。

### 删东西的六问

- 来源：DeepSeek harness `dsh-find-simplifications`
- 条件：`path_exists packages/features`
- 复核：`review_by 2027-06-01`
- 前提：功能层出现后会发生"要不要删一个子系统/一片代码"的判断，而 `structure.md` §12 第 9 条只给了判据（删得掉），没给取证方法。
- 判断依据：第一次真要做减法时，检查 §12 那条判据是否已经足够指导行动。足够 → 作废（说明六问只是同一件事的另一种说法，加它是重复）；不够 → 把六问写进当时的 skill，而不是现在就抄进来。

### 技能暴露策略一致性守卫

- 来源：DeepSeek `verify-skill-invocation-metadata.ts`
- 条件：`path_exists .claude/skills`
- 复核：`review_by 2027-06-01`
- 前提：会出现第二处技能暴露面，两处需要对齐；只有一处时建守卫 = 无对齐对象的空转。
- 判断依据：第二处存在时，先确认它是否真的承载同一份技能（符号链接 = 同源，不需要守卫；复制 = 两处真相，必须守卫）。这条区分是 DeepSeek 那道守卫真正守的东西。

### 工作流 action 固定性守卫

- 来源：本轮一次真实失败的余波
- 条件：`path_exists .github/dependabot.yml`
- 复核：`review_by 2027-06-01`
- 前提：当机器人或第二个贡献者能改 `.github/workflows/` 时，“把 `uses:` 写成浮动 tag”才会成为常态风险；现在只有人手动改，而且现有工作流全部 pin 在 40 位 SHA 上。
- 判断依据：届时加一条 `check-action-pins`（每个 `uses:` 必须是 40 位十六进制 SHA）。**但它拦不住今天这种错**——今天错在一个存在但错误的 SHA，所以它的价值只在防浮动引用，不要拿它冒充“能防假 pin”。若届时仍无自动编辑者，作废本条。

### 从人工评审证据生成技能增量

- 来源：DeepSeek `maintaining-dsh-code-review` 流水线（双 reviewer、采纳证据、漂移即拒绝）
- 条件：`仅复核`
- 复核：`review_by 2027-03-01`
- 前提：会出现**外生**评审证据（非作者提出、且最终代码采纳了的意见）；在那之前，唯一可得的代理是重复次数。
- 判断依据：查 `.github/` 之外的真实记录——是否出现过"别人提 → 代码采纳"的证据对。有 → 建最小版本（证据 → 候选 → 人工晋升），并保留"工具不许自动合并"这条；没有 → 作废，确认频次代理继续有效，并写进 `.agents/notes/rejected/`。

### 门面入口的认知面积预算

- 来源：本轮讨论——AI 一次只能同时持有内核的一小片，`entry-budgets.json` 的 `maxFiles` 同时也是"读懂这个入口要拖多少文件"
- 条件：`仅复核`
- 复核：`review_by 2027-03-01`
- 前提：把门面子路径从内核根 barrel 里脱出来（给内核加窄子路径）之后，`@naveti/host/extend/*` 的 `maxFiles` 会从今天的量级落到两位数，读者不再为一行 `defineTool` 打开整个 `types.ts`。
- 判断依据：P2 已实测并确认前提——`extend/tools` 等子路径与内核父入口同量级（证据见 `.agents/notes/implemented/2026-10-30-facade-width-measured.md`）；宽度来自 `export { … } from "@naveti/durable"` 这一行，**拆门面子路径无效**。补救搬进 P4，与 `check-kernel-facade` 同一轮：给内核加窄子路径，把每个门面子路径压到 12 以下；若届时已用别的方式收窄，作废本条并把结论写进 `structure.md` §6。

### seat 目录生成器

- 来源：DeepSeek `gen-tool-catalog.ts`——不读 AST，直接 boot 插件读运行时注册的 schema，再用 `--check` 保证提交物不腐化
- 条件：`path_exists packages/features`
- 复核：`review_by 2027-03-01`
- 前提：第一个功能落地后，`seats.md` 的表格回答不了"这个 seat 的字段有哪些"，于是 agent 会转而去读 `durable/src/harness/types.ts` 那一级的源文件。
- 判断依据：第一个功能写完时看实际发生了什么。若确有人/AI 读了内核源并读错，就做 `gen-seat-catalog.mjs`：boot 一个最小 Harness，导出每个 seat 的真实签名与字段，`--check` 校验提交物。若 `seats.md` 加一段字段清单就够用，作废——生成器的维护成本高于它省下的阅读。

### 测试价值门槛

- 来源：cindy-main `engineering-conventions.md` §3.2 的四问模板与 `check:test-hygiene`
- 条件：`packages/features/*/package.json >= 3`
- 复核：`review_by 2027-06-01`
- 前提：自有测试超过移植测试的量级之前，"这个测试保护什么"只能靠人问；到第三个功能时，agent 写的测试会开始出现"和实现同构、改实现就跟着改"的形态。
- 判断依据：逐个翻那几个功能的 `test/`，找"删掉被测实现后仍然会绿"的用例。找到 → 把四问写成 PR 模板并加一条测试卫生守卫；找不到 → 说明移植来的测试风格已经被继承，作废。

### 棘轮基线（存量冻结、新增阻断）

- 来源：ZCode-main `architecture-policy.yaml` + `.architecture-baseline.json`（存量违规进 baseline，新违规阻断，CI 不得自刷）
- 条件：`仅复核`
- 复核：`review_by 2027-06-01`
- 前提：会出现"改一处、多个模块红"的阶段，那时需要冻结存量而不是逐个修。
- 判断依据：没有可观测信号能表达"开始改不动了"（想拿"一次改动触及的包数"当代理，但单包功能期它恒为 1，是假精确）。到点只看一件事：`baseline.md` 的已知限制段是否开始出现"因为改动面太大所以没做"。有 → 做；没有 → 作废，说明门面与账本已经把改动半径控住了。

### root 层的上游对比

- 来源：`deviations.md` D15 自己写下的缺口——`sync-upstream.mjs` 只迭代 `packages/*`，root 文件、root `scripts/`、`.github/` 都在比较范围外
- 条件：`仅复核`
- 复核：`review_by 2027-03-01`
- 前提：上游对 root 配置的修复（`.gitattributes` 规则、hook 清单、workflow 的 pin）不会通过 `packages/` 对比浮现。
- 判断依据：下一次取上游快照时手工跑一次 root 对比。若发现至少一处漏掉的 root 变更，就把 root 对比做成脚本，而不是靠"记得"；一处都没有 → 作废，说明上游很少动 root。

### "文档提到的机制必须存在"

- 来源：本轮的真事故——`KERNEL.md` 写着"内核不得 import 产品层（CI 拦截）"，而对应守卫并不存在；`divergence.md` 同样写着"脚本待建，当前靠纪律"
- 条件：`仅复核`
- 复核：`review_by 2027-03-01`
- 前提：规则文档会继续引用尚未实现的机检，而 `check-doc-links` 只验证路径、`check-doc-counts` 只挡数量断言，两者都看不见"承诺了一个不存在的守卫"。
- 判断依据：把 `docs/` 与根 `*.md` 里出现的 `check-*.mjs` 名字与 `ls scripts/check-*.mjs` 对一遍。再出现一处"文档说有、实际没有" → 在 `check-gate-registration` 里加反向断言（文档提到的 `check-<name>` 必须在磁盘上，或在 `structure.md` 的未建表里）；没有 → 作废，说明这次是人为疏漏而不是模式。

