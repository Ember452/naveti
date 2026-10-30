# 内核分歧账本

记录**我们主动改过内核的哪些地方**。政策见 [`KERNEL.md`](../../KERNEL.md) §4，本文只负责记录。

基线：`pi 1.4.0` 源码快照，导入日 2026-10-29。
迁移期的偏离（作用域改名、生成数据、标识符改名、测试与工具修补）记在 [`docs/migration/deviations.md`](../migration/deviations.md)，本文不重复；本文只记**那之后持续发生的功能性改动**。

## 1. 规则

1. **追加，不改写历史。** 条目失效时标 `retired` 并写原因，不删。
2. **一个改动一条。** 同一次提交里改多个文件，写一条并列出文件即可。
3. **每条必须写"风险"。** 没有风险说明的条目不可审查。
4. **每条必须写"怎么兜住"。** 测试名或 gate 名。没有测试的改动等于没有改动。
5. 与基线 hash 不同的内核文件必须有条目，由 `check-kernel-divergence` 机检。
   基线的物证是 [`scripts/kernel-baseline.json`](../../scripts/kernel-baseline.json)（committed）：它记录**建立基线那一刻**这棵树的内容 hash，外加两组路径（上游有本地无、本地有上游无），让基线本身能解释自己。
   建立基线之前与 pi 的差异已在 [`docs/migration/deviations.md`](../migration/deviations.md) 的 D0–D18 里 review 过，本文不重复记账；**基线之后的每一处差异都算功能性改动，必须有条目。**
   刷新基线必须与本文（或 `deviations.md`）的改动在同一次提交里：`--write` 拒绝吸收没有账本命名的改动，pre-commit 拒绝只暂存基线、不暂存账本的提交。

## 2. 条目格式

```text
## K<n> — <一句话>

- 档位：A 加扩展点 / B 改语义 / C 结构手术（定义见 KERNEL.md §2）
- 文件：packages/kernel/<pkg>/src/...
- 改了什么：
- 为什么：指向具体功能或具体踩过的坑，不写"为了更好"
- 风险：能破坏什么（已存数据 / 语义 / 上游合并）
- 兜住：测试或 gate 名
- 上游状态：未变 / 已在上游 vX 包含 / 与上游冲突（说明如何处理）
```

## 3. 当前条目

**无。**

截至基线（2026-10-29 导入，2026-10-30 建立 hash 基线），`packages/kernel/` 全部内容与 `docs/migration/deviations.md` 记录的迁移期偏离一致，不存在功能性改动。

这不代表内核不会变。它只代表：**第一个功能性改动发生时，本文件才会出现第一条记录**，而那正是它存在的意义——让"第一个"有地方落，而不是落在某次提交的 diff 里。

## 4. 与上游的对照能力

本仓库与上游没有共同 git 历史（快照导入）。对照依赖两条腿：

1. `git remote add upstream <pi 仓库>` 并 fetch 版本 tag，之后可做文件级对照：
   `git diff upstream/v1.4.0 -- packages/kernel/durable`
2. `node scripts/sync-upstream.mjs --from ../pi-main --full`，生成规范化文本对照与 `docs/migration/diffs/upstream-diff-<date>.md`。它**不修改** `packages/`。

回补策略（`KERNEL.md` §5）：账本里从未偏离的文件 → 可整体替换为上游版本；有偏离的文件 → 三路合并并在本文记新条目。**不做半跟随**：`durable` 与 `chord` 必须成对处理。

`scripts/kernel-baseline.json` 存的是本地树的 hash，不含上游 hash——上游物证是可重建的 `.upstream/`（gitignored，用 `sync-upstream.mjs` 生成）。因此 `--write` 每次都会打印一份「本树与 pi 1.4.0 的差异规模」，并按路径列出**它即将吸收的那几条改动**，让重新基线这件事永远可见：差异的**语义**由 `deviations.md` 解释，差异的**规模**由这条输出可见。

`--write` 不吸收没有账本的改动：它先按旧基线算一次差异，任何一条没被本文或 `deviations.md` 命名，就拒绝写入。至于「同一次提交」——那由 `.githooks/pre-commit` 检查暂存区配对（基线在暂存区里时，账本也必须在），因为工作区干净与否看不见「暂存后又还原」这种情形。
