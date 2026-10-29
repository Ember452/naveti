# 守卫清单必须自己检查自己有没有漏登记

- 背景：这一周每次加守卫都要登记四处——脚本、红例、`package.json` 的 `check` 链（外加 `pre-commit`）、`docs/structure.md` 的表。而每一处都真的漏过：`check-doc-links` 建好却没接进链；`check-ts-relative-imports` 与 `check-entry-graphs` 长期没有红例；`§14` 的表漏行。每种漏都是静默的——守卫存在、看起来正常、就是不跑。`.agents/skills/add-a-guard/SKILL.md` 把"登记四处"写成步骤，但**写在文档里的步骤正是最容易被跳过的那类规则**。
- 决定：`scripts/check-gate-registration.mjs` 机检四条断言：
  1. 每条 `scripts/check-*.mjs` 有同名 `.test.mjs`；
  2. 每条在 `check` 链里可达——跟着 `pnpm run <key>` 展开两层，因为好几条是通过别名键接进去的（`check:ts-imports` → `check-ts-relative-imports.mjs`）；
  3. 链里 `node scripts/x.mjs` 指向的文件必须存在（改名不能留下悬空调用）；
  4. 每条出现在 `docs/structure.md`（清单的权威在那）。
  进 `check` 链与 `pre-commit`。
- 被拒绝的替代方案：
  - **把三条文档守卫（links / counts / parked）合并成一条 `check-docs-consistency`。** 我先做了，又撤了：三条各 0.1 秒、各守一个不同的失败面，合并的唯一收益是"少登记两次"——而那正是这条新守卫要机检的东西，用合并去解决登记负担等于把问题藏起来。**用一个检查去消灭漏登记，而不是减少要登记的东西。**
  - **只写进 skill 的步骤里，不加机检。** 就是我之前的做法，同一个星期内失效三次。
  - **让守卫扫散文里的数量词。** 第一版就把项目口号"一个功能一个包"判红了（见 `2026-10-29-guard-red-cases-and-add-a-guard-skill.md` 同批的 `check-doc-counts`）。
- 后果：
  - 自举验证过：新守卫第一次跑真实仓库时，报的正是**它自己**缺的两处登记（不在链里、不在文档里）。它证明自己抓得住这类错。
  - 加守卫的成本从"记得四处"变成"少任何一处立刻红"。代价是 `pre-commit` 又多一条（总计约 6 秒）。
  - 它不检查"红例是否真的能红"——那需要变异测试，成本高一个量级，目前由"必须证明会变红"这条纪律 + reviewer 承担。
