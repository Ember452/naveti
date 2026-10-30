# AGENTS.md

agent 在本仓库必须遵守的硬约束。**规则只有这一份**；`CLAUDE.md` 只是指针。

上游 `pi` 有一份 140 行的同类文档，这里的规则是它的翻译加裁剪：路径改成 `packages/kernel/*`，包管理器改成 pnpm，删掉属于未 vendor 的 `coding-agent` 与 `tui` 的部分。

## 1. 交流方式

- 简短直接，不写填充语，不用 emoji。
- 用户提问时**先回答**，再动手改代码。
- 回应别人的分析时，**先明确说赞成还是反对**，再说你改了什么。
- 术语先定义再用；非平凡的设计按"问题 → 具体例子或短跟踪 → 方案"讲，并说明为什么它是必需的、哪些只是可选复杂度。
- 用具体行为和短例子，不用抽象汇总、密集术语或罗列改动清单。

## 2. 先读什么

按任务读最小集，读够用为止。**不要一次读完下面所有文档**：这些文档合计超过 70 KB。

| 你要做什么 | 最少读这些 |
| --- | --- |
| 修一个红的测试 | §9 命令 + `docs/migration/baseline.md` 里对应包那一段 |
| 加功能 | §3 + §4 + §5 + `docs/structure.md` §7 + `docs/kernel/seats.md` |
| 改内核 | §6 + `KERNEL.md` §2 + `docs/kernel/divergence.md`（涉及 seat 再加 `seats.md`） |
| 动跨包 / 装配 | 上面 + `docs/architecture.md` |
| 加顶层目录 / 改边界 | 上面 + `docs/structure.md` §15 + 在 `.agents/notes/` 写一条 |
| 改文档 | `docs/README.md` 的写文档规矩 |
| 加或改一条守卫 | `.agents/skills/add-a-guard/SKILL.md` + `docs/structure.md` §13 |
| 想把一件事推到将来 | `docs/plan/parked.md`：必须同时写下触发条件、`review_by` 日期、以及**当时依赖的前提** |
| 要做什么功能、为什么是它 | `docs/product.md`：首批功能表与「明确不做」 |
| 不知道去哪找 | `docs/README.md` 的路由表 |

下面这份是按“如果全错就全读”的顺序排的清单，只在任务真的跨多个层面时使用：

1. [`docs/README.md`](docs/README.md) —— 四类文档分别回答什么，先看它决定读哪一篇。面向读者的学习材料在 `docs/learn/`，非权威。
2. `docs/structure.md` —— 什么文件放哪、什么还不该建。
3. `KERNEL.md` —— 内核能不能改、按哪一档改。
4. `docs/kernel/seats.md` —— 扩展点清单（封闭枚举）。
5. `docs/kernel/divergence.md` —— 内核已被改过哪些地方。
6. `docs/migration/baseline.md` —— 什么算绿、哪些是平台限制。
7. `docs/architecture.md` —— 运行时怎么运转（改跨包的东西前读）。
8. `docs/plan/master-plan.md` —— 现在做到哪、下一步是什么。

不要凭记忆判断"这个文件该放哪"。文档与代码冲突时，先报告冲突，不要自行选一个。

## 3. 六类位置

| 你想加的东西 | 放哪 |
| --- | --- |
| 用户能看见、可开关的能力 | `packages/features/<id>/`（一个功能一个包） |
| 某个 seam 的另一种实现（换存储/换模型/换浏览器） | `packages/providers/<seam>-<impl>/` |
| 跨进程 wire 类型、自研 seam 声明 | `packages/contracts/src/<domain>.ts` |
| 平台的装配、路径、设置、transport、seat 表 | `packages/platform/host/` |
| 界面壳、slot、主题、atoms | `packages/platform/web/` |
| 启动、打包、进程管理 | `apps/<name>/`（源码约 200 行封顶，超过就是放错层） |
| 内核的运行机制 | `packages/kernel/*`，先看 `KERNEL.md` §2 定档 |

新增顶层目录是结构变更，先写决策记录，不要直接建。

## 4. 依赖方向

- `kernel` 不 import 产品层；`contracts` 不 import `platform`/`features`；`platform` 不 import `features`。
- `feature` 不 import `@naveti/{ai,chord,codemode,durable,mcp,telemetry}`；只用 `@naveti/host/extend/*` 门面、`@naveti/contracts`、`@naveti/web`。
- 功能之间只允许 `@naveti/feature-<x>/contract`，且必须在 `package.json` 里声明依赖。
- `client` 面不 import `node:*`、不 import `platform/host`、不 import 同包 `src/host/**`。
- `platform/host` 不自己算数据目录；`dataDir` / `cacheDir` / `webAssetsDir` 由 `apps/*` 注入。
- 包之间不用相对路径跨界 import；一律走包名 + `exports`。
- **不为模块解析加 `tsconfig` 的 `paths` 或 vitest alias**：跨包依赖写 `workspace:*`，入口靠 `exports` 的 `source` 条件 + `customConditions`。

## 5. 加一个功能的固定流程

1. 建 `packages/features/<id>/`，包名 `@naveti/feature-<id>`，`exports` 三出口（`.` / `./client` / `./manifest`）。wire 契约住 `@naveti/contracts`，不在功能包里再写一份。**每个代码出口都要在 `scripts/entry-budgets.json` 里登记 `maxFiles`**（产品层没有自动补位，漏登记即红；数字是手工天花板，只降不跟涨）。
2. 写 `naveti.feature.json`：`id`、`contract`、`seats`、`requires`、`provides`。
3. 写 `README.md` 五行：拥有什么 / 可 import 什么 / 占哪些 seat / 依赖谁 / 删掉会怎样。
4. wire 契约先在 `@naveti/contracts` 定型（远程安全：无 `Date` 对象、无函数、id 为不透明值），功能包引用它。
5. `host/index.ts` 默认导出 `defineFeature(...)`，一个贡献点一个文件。
6. `client/index.ts` 只 `register(slots)`；壳文件里不出现功能 id。
7. 加 `test/host.spec.ts`（有界面再加 `client.spec.tsx`），夹具放包内 `test/fixtures/`。**有测试就必须有 `vitest.config.ts`**（三行：`mergeConfig(sharedTestConfig, defineConfig({ test: { name } }))`），否则根上的 `test.projects` glob 收不到它，`check-vitest-projects` 会报“测试永远不跑”。不要在里面配路径、alias 或第二个 runner。
8. **两份** `compose.ts` 各加一行（`apps/server/src/compose.ts` 宿主面、`apps/web/src/compose.ts` 客户端面），然后跑 `pnpm check && pnpm test:ci`。机检规则（`check-feature-registry`）：目录 ↔ manifest ↔ server 清单双向相等；有 `./client` 就在 web 清单里，没有就不能在；web 清单 ⊆ server 清单（可以有宿主面没界面，不能反过来）；`seats` 必在 `packages/platform/host/src/seats.ts` 的闭集里。

**自查判据：删掉这个功能时，`packages/platform/*` 与 `apps/*/src/main.*` 是否需要改？** 需要，说明放错了。删包、两份 compose 各删一行、两份 `package.json` 去掉依赖声明、重跑生成物（锁文件与 `test-integrity.json`），这是删一个功能的全部动作；平台代码不在其中。

## 6. 改内核的固定流程

1. 定档：A 加扩展点 / B 改语义 / C 结构手术（`KERNEL.md` §2）。不确定时按高一档处理。
2. 先问：能不能只在 `platform/host/src/extend/` 门面吸收？能就不进内核。
3. 改之前查 `docs/kernel/divergence.md`：这个文件是否已经偏离过。
4. 改完在同一次改动里补：conformance 测试、`docs/kernel/seats.md`（若新增 seat）、门面子路径、账本条目。
5. B 档必须额外有：ADR（`.agents/notes/`）、迁移脚本、`tests/golden/` 更新。
6. 全绿再提交。红了先修，不加豁免、不注释断言。

## 7. 代码质量

- 大范围改动前**整文件读完**；不要靠搜索片段改你没看全的文件。
- 不用 `any`，除非确实无法表达。
- 只有一个调用点的单行 helper 内联掉。
- 外部 API 的类型去 `node_modules` 里查，不要猜。
- **不用内联 import**（`await import()`、`import("pkg").Type`）；一律顶层 import。
- 不为了让类型错误消失而降级或删除代码；升级依赖。
- 只用**可擦除 TypeScript 语法**（`erasableSyntaxOnly: true`）：不要 `enum`、`namespace`/`module`、参数属性、`import =`、`export =`。字段显式声明 + 构造函数赋值。
- 删除看起来有意的代码前先问用户。
- 用户没要求就不做向后兼容。
- 不硬编码单点检查（例如按键判断）；加进默认表，保持可配置。
- **永不手改** `packages/kernel/ai/src/providers/data/*`。改 `packages/kernel/ai/catalog/` 后跑 `pnpm build:catalog` 重新生成；那份 diff 单独成一个提交。

### 注释

通用规则；内核文件的文件头与导出 doc 另见 §8。

- 注释解释**为什么**（成本、竞态、已定规则、踩过的坑），不解释"下一行做了什么"。名字与类型已经说清的，不写注释。
- 文件头一行说清这个文件负责什么；模块不变量与失败模式写在这里，不写变更历史（"改成…""以前是…"）。历史在 git 与 `.agents/notes/`。
- 不留被注释掉的代码，不写没有触发条件的 `TODO` / `FIXME`：要么现在做，要么写进 `docs/plan/parked.md`。
- 注释必须与代码在同一次改动里更新。**过时的注释比没有注释更坏**，尤其是"这里绝不会…"这类断言。
- 代码与注释用英文（见 `CONTRIBUTING.md`）；面向使用者的文档用中文。
- 守卫脚本头注释写"它拦什么失效 + 为什么这样判"，不写"本脚本用于检查 XX"（见 `.agents/skills/add-a-guard/SKILL.md`）。
- 测试注释写"这条用例守什么"（bug 或规则依据），不写"测试 XX 能工作"。

## 8. 内核代码风格

修改 `packages/kernel/{chord,durable}` 时生效：

- 一文件一概念，文件名就是概念名；文件头注释的要求见 §7 的「注释」。顺序：imports → 导出类型 → 公共入口 → 按使用顺序排列的 helper；常量放在第一个使用者上方。按概念拆文件，不按行数拆（单概念 1000 行以内可以很长）。
- 每个导出有一行 doc，说明它做什么或保证什么；行内注释遵循 §7 的「注释」。
- 函数单一职责（约 40 行需要理由）；不用布尔开关参数来切换行为，改两个函数或用 tagged value；同样的几行不要写两遍。
- 参数顺序：必填 → `context`/`ctx` → 可选。上下文永远必填，只有错误上报路径可以省。
- 状态与结果一律 tagged union；cast 只在 TypeScript 无法表达已定不变量时使用，并附一行理由。
- 热路径不做没人要求的 walk / copy / compile / 每次调用分配；缓存用按所有者做键的 `WeakMap`，每个缓存配一条 GC 测试；不要模块级强引用缓存。
- 测试：一源文件一个测试文件，一个机制一个 `describe`；缓存必须有 GC 测试；只有内部实现的用例没有价值。
- 报告前：把自己的改动当陌生人从头读一遍，每个文件要能独立看懂。

## 9. 命令

```bash
pnpm check          # biome + 依赖钉版 + 运行时依赖闭包 + 相对导入 + 入口图 + 工作区解析 + 锁文件一致性 + 测试清单棘轮 + 守卫红例 + tsc
pnpm build          # 六包构建，不联网；模型目录只校验不刷新
pnpm build:catalog  # 显式刷新模型目录（联网），它的 diff 必须单独提交并说明
pnpm test:ci        # 门禁：单进程 projects + 密封环境（无 API key、临时 HOME、TZ/LANG 固定）
pnpm test:ci:local  # 同上但继承本机环境，只在需要带凭证调试时用
pnpm smoke          # 持久化与恢复冒烟，CI 的 test-ci 也跑
pnpm hooks:install  # 一次性把 core.hooksPath 指到 .githooks
```

- 改代码后跑 `pnpm check`，**贴完整输出**，不截尾；错误、警告全部修完再提交。
- 需要 `dist` 时（导入构建产物、`durable` 的 workerd 套件）才跑 `pnpm build`；**永不拿它做类型检查**。
- 默认**不要跑** `pnpm test`：逐包脚本不是 Windows 门禁（不注入 Git `bin`，shell 一致性用例会 `ENOENT bash.exe`），用户没要求就别跑。
- 不直接跑全量 vitest。跑单个文件在包目录里：
  `node ../../../node_modules/vitest/vitest.mjs --run test/x.test.ts`
- 新增或修改测试文件，必须自己跑通再报。
- **`pnpm check` 绿不算绿。** 改动碰过配置、目录或依赖时，宣布完成前必须跑 `pnpm test:ci`。证据：往 `packages/kernel/` 里放一个 `README.md`，根配置的项目 glob 把它也当项目收集，六个项目的测试全部起不来，而 `check` 全绿——“静态没报错”不等于“测试还能跑”。
- 改了测试清单（增删用例、加 skip、删测试文件）→ 跑 `pnpm run test-integrity:write`，并让 `scripts/test-integrity.json` 的 diff 出现在同一个提交里。
- 临时脚本写到 `.verify-tmp/`（gitignored），用完删掉；不要把多行脚本塞进一条命令里。
- 提交前钩子会跑静态检查；推送前钩子会跑 `pnpm check`。绕过（`--no-verify`）必须在提交正文里说明理由。
- 除用户明确要求，**不要 commit**。

## 10. 依赖与安装安全

- 依赖与锁文件的改动当作需要 review 的代码；直接依赖钉死精确版本（`check-pinned-deps` 会拦浮动范围）。
- 本地 `pnpm install`；干净环境与 CI 用 `pnpm install --frozen-lockfile`。
- `allowBuilds` 是显式清单。新增一条需要一次有意的决定，不要为了装上去随手加。
- 依赖段变了，`pnpm-lock.yaml` 必须在同一提交里更新；只想动锁文件（例如 `pnpm update`）时设 `NAVETI_ALLOW_LOCKFILE_CHANGE=1` 并说明。
- 升级依赖后跑 `pnpm check && pnpm test:ci`。

## 11. Git

- 只提交**本次会话自己改的**文件；用显式路径，不用 `git add -A` / `git add .`。
- 提交前跑 `git status`，确认暂存范围就是你要的那些。
- 消息格式：`type(scope): 摘要`，正文写**为什么**（成本、踩过的坑、被拒绝的方案），不只写做了什么。
- 禁用：`git reset --hard`、`git checkout .`、`git clean -fd`、`git stash`、`git commit --no-verify`（除非用户要求）。
- 冲突只解决自己改的文件；冲突在别人的文件里就停下来问。不做 force push。
- 用户要求才 commit / push。

## 12. Issue 与 PR

- 评审 PR 时不要切分支（`gh pr checkout`、`git switch`）；用 `gh pr view`、`gh pr diff`、`git show <ref>:<path>` 看内容。
- 评论写到临时文件，用 `gh issue comment --body-file` / `gh pr comment --body-file` 发，不要多行 `--body`。
- 提交关闭 issue 时用 `closes #N`；多个 issue 要逐个重复关键字。
- PR 的绿灯是三个 job：`build-check`、`test (durable)`、`test (other)`。

## 13. Changelog

- 位置：`packages/kernel/*/CHANGELOG.md`。
- 新条目一律进 `## [Unreleased]` 的 `### Breaking Changes` / `### Added` / `### Changed` / `### Fixed` / `### Removed`；先读全文再追加，不要新建重复小节。
- 已发布的版本段落（如 `## [0.12.2]`）不可修改。
- 目标分支不是 `main` 时不写 changelog。

## 14. 禁止事项

- 不新建与 `packages/` 并列的第三种顶层目录。
- 不在功能包内深引内核 `src/*`。
- 不在壳文件（`app-frame.tsx`、`sidebar.tsx`、`chat-view.tsx`）里写功能 id 或功能分支。
- 不用 `localStorage` 存功能状态（只允许纯视图偏好）；功能状态住 durable doc。
- 不复制文档正文到另一份文档；引用写"见 X"。
- 不用 `.only`、不用 `describe.skip`、不为变绿删测试或弱化断言。
- 不提交 `dist/`、`.upstream/`、`.verify-tmp/`、本地日志、`.env*`。

## 15. 文档纪律

- 推迟不等于删除：写进 `docs/plan/parked.md`，并留下三件事——触发条件、复核日期、当时依赖的前提。**前提必须写成可被现实推翻的句子**；到点时先检验前提，再决定做/改条件/作废，“以后再讲”不算一个选项。`check-parked-triggers` 会拦住缺字段与已到期的条目。

- 一个事实只有一处权威，权威分工见 `docs/structure.md` §17。
- 改了边界、改了内核语义、新增 seat、新增守卫、新增根配置 → 在 `.agents/notes/<state>/<date>-<slug>.md` 记一条（背景 / 决定 / 被拒绝的替代方案 / 后果）。
- 普通功能设计不进 notes，写功能 README。
- 代码与文档在同一次改动里更新，不"以后再补"。

## 16. 完成前自检与报告

写完不等于做完。宣布完成前按顺序过一遍：

1. **回读实际代码与测试**，不凭文档或记忆判断现状；文档与代码冲突时先报告冲突（§2）。
2. **把 diff 当陌生人的代码读一遍**，每个文件要能独立看懂（§8）。
3. **按风险匹配验证**，不按改动行数：
   - 只改文档 → `pnpm check`（doc-links / doc-counts / parked 都在链上）。
   - 改配置、目录、依赖、测试清单 → `pnpm check && pnpm test:ci`。
   - 改内核 → `pnpm check && pnpm test:ci`，并按 `KERNEL.md` §6 追加档位验收。
   - 碰过 `vitest.config.ts`、`tsconfig`、`exports`、`pnpm-workspace.yaml` → 必须跑 `pnpm test:ci`：`pnpm check` 绿不代表测试还能启动（§9）。
4. **报告分四块**：已验证（贴命令与结果）/ 未验证及原因 / 风险 / 需要用户决定的事项。不把"静态检查通过"写成"测试通过"。
5. **测试价值门槛**：新增测试必须证明一个新的可观察差异（结果、错误、权限、持久化、协议或时序）；没有新差异就不加。不为覆盖率或测试数量加测试，不复制常量、JSX、CSS 或源码字面量做断言；同一机制的用例并入已有文件。

## 17. 安全底线

- 用户凭证、令牌、授权文件与密钥**不得**写入仓库或任何会被 git 跟踪的路径；测试夹具用假值。
- 未经用户明确授权，不执行删除数据、覆盖用户改动、`push`、发布、合并等难以恢复的操作（§11）。
- 触及内核语义（entry schema、task 状态机、commit 原子性）、持久化格式、权限边界、transport 协议前，先按 `KERNEL.md` §2 定档，并在动手前说明风险。
- 不为了让门禁变绿而跳过、删除或弱化测试与守卫（§14）；红了先修。
- 发现任务会改到用户已有但未提交的文件时，先停下来问，不覆盖。

## 18. 用户优先

用户的指令与本文冲突时，先请求显式确认再执行；不要默默覆盖规则。
