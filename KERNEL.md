# KERNEL

`packages/kernel/` 是从 pi 1.4.0 派生的**自有内核**（来源见 [`NOTICE.md`](./NOTICE.md)）。
它不是"不可触碰的第三方依赖"，也不是"随时可以魔改的私有代码"：它是本项目的底层运行时，**允许改，但要按档位改、要留下记录**。

为什么放弃"冻结"：冻结只对"短期不动"成立。一旦确定将来要改内核，冻结就把改动变成没有落点的例外——最后以"偷偷打补丁"的形式发生在内核深处，既没有测试也没有记录。**能被改的边界，比宣布不变的边界更安全。**

## 1. 边界规则

- `packages/kernel/` 是内核；`packages/{contracts,platform,providers,features}` 与 `apps/*` 是产品层。**内核不得 import 产品层**。这条目前靠纪律：机检是 `check-package-layers`（`docs/structure.md` §13 未建表），建立时机是第一个产品层包（`packages/contracts`）出现时。在两侧目录都不存在时建它，是对空集的断言。
- 产品层访问内核只有一条路：`@naveti/host/extend/*` 门面。功能包连内核的包名都不该出现在 `dependencies` 里。
- 内核不承载产品语义：UI、命令、皮肤、安装器、发布流程都不进内核包。

## 2. 三档变更

任何内核改动先归到一档，再按该档的要求做。**跳档 = 失败。**

| 档 | 内容 | 门槛 |
| --- | --- | --- |
| **A 加扩展点** | 新 seat、新 hook、新 task、新 storage 后端、新 provider 目录数据、修 bug（带回归测试） | 直接改。补 conformance 测试，更新 `docs/kernel/seats.md`，在门面加对应子路径。**不需要 ADR** |
| **B 改语义** | entry schema、task 状态机、commit 原子性、policy / 审批 / 审计语义、持久化 kind | ADR（`.agents/notes/`）+ 数据迁移脚本 + 契约测试 + `tests/golden/` 更新，**同一次改动全绿**。破坏已存数据的兼容性时额外需要回滚说明 |
| **C 结构手术** | 拆包、换 DI、换 transport、换持久化格式、改包边界、运行期加载 | 先停功能开发，ADR，一次改完，禁止半跟。完成后同步更新 `tsconfig` / 守卫 / CI / `docs/structure.md` |

判据：**这次改动会不会改变已经写进存储的事实，或改变别人依赖的语义？** 会 → B；不会 → A。改动范围跨包且没有增量路径 → C。

## 3. 门面

`packages/platform/host/src/extend/` 是内核对产品层的唯一承诺面：

- 只导出被批准的 API，**禁止 `export *`**。
- 只在有真实消费者时加子路径（`/tools`、`/docs`、`/tasks`、`/hooks`、`/prompt`、`/wrap`、`/types`）。
- 门面可以适配（把内核两种类型拼成一个），不可以承载业务判断。

内核改动的传导面 = 门面。所以**改内核时先问：这个改动能不能只在门面这一层吸收？** 能，功能包一行不动。

门面当前尚未建立；建立时机是"第一个功能要落地"之前（`docs/structure.md` §15 P2）。在那之前，任何产品代码都不应该存在。

## 4. 分歧账本

位置：[`docs/kernel/divergence.md`](./docs/kernel/divergence.md)。每一条记录：档位、文件、改了什么、为什么、风险、用什么测试兜住、上游状态。

规则：

1. 与基线 hash 不同的内核文件，必须在账本里有条目（`check-kernel-divergence` 机检）。基线物证是 `scripts/kernel-baseline.json`：`--write` 拒绝吸收没有账本命名的改动，pre-commit 拒绝只有基线移动、没有账本变化的提交。
2. 条目**追加，不改写历史**；失效的标记 `retired` + 理由，不删。
3. 账本只记"我们改了什么"。来源与迁移期的偏离仍在 `docs/migration/deviations.md`：前者是持续记录，后者是迁移存证。

**这一条不阻止改内核，只要求"改了要说一声"。** 三个月后没人记得哪个文件被动过，账本就是唯一答案。

基线：`pi 1.4.0` 快照，2026-10-29 全绿。当前账本条目为"无"。

## 5. 上游回补

本仓库与上游**没有共同 git 历史**（快照导入）。因此：

1. 加一个上游 remote 并 fetch 版本 tag。即使历史无关，`git diff upstream/v1.4.0 -- packages/kernel/durable` 也能做**文件级**对照，比文本比对强一个量级。
2. 回补策略从"只摘取补丁"改为**"没改过的文件可整体替换，改过的走账本"**：账本说某文件从未偏离 → 直接取上游版本；账本说有偏离 → 三路合并并在账本记新条目。
3. `node scripts/sync-upstream.mjs` 保留，用于生成规范化对照与记录（`.upstream/` 缓存、`docs/migration/diffs/upstream-diff-<date>.md`）。它**不修改** `packages/`。

什么时候回补（任一）：

- 安全漏洞，或数据损坏类 bug（entry 丢失、commit 非原子、恢复后状态错乱）；
- 需要支持的 provider 新 API，或 MCP 协议新版本，现有代码撑不住；
- 上游的某个契约改进正好解掉当前正在踩的坑。

**禁止半跟随**：`durable` 与 `chord` 共享 entry schema、delta 编码与 task 语义，单独升级其中一个会造成契约错配，比完全不动更危险。要么不动，要么成对摘取并全绿。

## 6. 验收

任何内核改动的最低门槛：

```
pnpm check      # biome + 依赖钉版 + 运行时依赖闭包 + ts 相对导入 + 入口图 + 全部结构守卫（见 docs/structure.md §13）+ tsc --noEmit
pnpm test:ci    # 门禁测试：单进程 + 密封环境（先 pnpm build）
node --test scripts/*.test.mjs scripts/*.test.ts
```

不要用 `pnpm test`（逐包脚本）：它在 Windows 上不注入 Git 的 `bin`，shell 一致性用例会 `ENOENT bash.exe`。原因与对比见 `AGENTS.md` §9。

按档位追加：

| 档 | 追加验收 |
| --- | --- |
| A | 新增 seat 在 `docs/kernel/seats.md` 有行；门面有对应子路径；conformance 测试覆盖 |
| B | ADR 存在于 `.agents/notes/`；迁移脚本可重复执行；`tests/golden/` 与本改动同一提交；账本有条目 |
| C | 全仓配置同步（`tsconfig` / `vitest.base` / 守卫 / CI / `docs/structure.md`）；一次性全绿，不留中间态 |

迁移基线（2026-10-29）为全绿。修改内核后必须仍然全绿；红了先修，不加豁免、不注释断言。
