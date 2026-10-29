# AGENTS.md

agent 在本仓库必须遵守的硬约束。**规则只有这一份**；`CLAUDE.md` 只是指针。

## 1. 先读什么

按顺序，读够用为止：

1. `docs/structure.md`——仓库里有什么、什么该放哪、什么不该建。
2. `KERNEL.md`——内核能不能改、按哪一档改。
3. `docs/kernel/seats.md`——扩展点清单（封闭枚举）。
4. `docs/kernel/divergence.md`——内核已被改过哪些地方。
5. `docs/migration/baseline.md`——什么算绿。

不要凭记忆判断"这个文件该放哪"，读文档。文档与代码冲突时，先报告冲突，不要自行选一个。

## 2. 六类位置，别放错

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

## 3. 依赖方向（违反即红，别绕过）

- `kernel` 不 import 产品层。
- `feature` 不 import `@naveti/{ai,chord,codemode,durable,mcp,telemetry}`；**只用 `@naveti/host/extend/*` 门面、`@naveti/contracts`、`@naveti/web`**。
- 功能之间只允许 `@naveti/feature-<x>/contract`，且必须在 `package.json` 里声明依赖。
- `client` 面不 import `node:*`、不 import `platform/host`、不 import 同包 `src/host/**`。
- `platform/host` 不自己算数据目录；`dataDir` / `cacheDir` / `webAssetsDir` 由 `apps/*` 注入。
- 包之间不用相对路径跨界 import；一律走包名 + `exports`。
- **不为模块解析加 `tsconfig` 的 `paths` 或 vitest alias**：跨包依赖写 `workspace:*`，入口靠 `exports` 的 `source` 条件 + `customConditions`。白名单（`typebox` 这类 node_modules 重定向）之外新增一条要走决策记录。

## 4. 加一个功能的固定流程

1. 建 `packages/features/<id>/`，包名 `@naveti/feature-<id>`，`exports` 四出口（`.` / `./contract` / `./client` / `./manifest`）。
2. 写 `naveti.feature.json`：`id`、`contract`、`seats`、`requires`、`provides`。
3. 写 `README.md` 五行：拥有什么 / 可 import 什么 / 占哪些 seat / 依赖谁 / 删掉会怎样。
4. `contract.ts` 先定型（远程安全：无 `Date` 对象、无函数、id 为不透明字符串）。
5. `host/index.ts` 默认导出 `defineFeature(...)`，一个贡献点一个文件。
6. `client/index.ts` 只 `register(slots)`；壳文件里不出现功能 id。
7. 加 `test/host.spec.ts`（有界面再加 `client.spec.tsx`），夹具放包内 `test/fixtures/`。不要给包单独配 runner——根上 `test.projects` 统一调度。
8. `compose.ts` 加一行，然后跑 `pnpm check && pnpm test`。

**自查判据：删掉这个功能，是否只需删包 + 删 `compose.ts` 一行？** 需要动别处，说明放错了。

## 5. 改内核的固定流程

1. 定档：A 加扩展点 / B 改语义 / C 结构手术（`KERNEL.md` §2）。不确定时按高一档处理。
2. 先问：能不能只在 `platform/host/src/extend/` 门面吸收？能就不进内核。
3. 改之前查 `docs/kernel/divergence.md`：这个文件是否已经偏离过。
4. 改完在同一次改动里补：conformance 测试、`docs/kernel/seats.md`（若新增 seat）、门面子路径、账本条目。
5. B 档必须额外有：ADR（`.agents/notes/`）、迁移脚本、`tests/golden/` 更新。
6. 全绿再提交。红了先修，不加豁免、不注释断言。

## 6. 禁止事项

- 不新建与 `packages/` 并列的第三种顶层目录。
- 不在功能包内深引内核 `src/*`。
- 不在壳文件（`app-frame.tsx`、`sidebar.tsx`、`chat-view.tsx`）里写功能 id 或功能分支。
- 不用 `localStorage` 存功能状态（只允许纯视图偏好）；功能状态住 durable doc。
- 不复制文档正文到另一份文档；引用写"见 X"。
- 不为了让测试变绿而跳过、弱化断言或加例外；Windows 上无法建符号链接的测试用 `skipIf`，不用永久 `skip`。
- 不用 `.only`、不用 `describe.skip`、不为变绿删测试。确实需要新增 skip 时，只能跑 `pnpm run test-integrity:write` 并让 `scripts/test-integrity.json` 的 diff 出现在同一个提交里（`helperSkips 2 -> 5` 就是给审查者看的东西）。删测试文件同理：基线必须同步。
- 不提交 `dist/`、`.upstream/`、本地日志。

## 7. 验收命令

```bash
pnpm check          # biome + 依赖钉版 + 运行时依赖闭包 + ts 相对导入 + 入口图 + 工作区解析 + 锁文件一致性 + 测试清单棘轮 + 守卫红例 + tsc --noEmit
pnpm build          # 六包构建，不联网；模型目录只校验不刷新
pnpm build:catalog  # 显式刷新模型目录（联网），它的 diff 必须单独提交并说明原因
pnpm test:ci        # 门禁：单进程 projects + 密封环境（无 API key、临时 HOME、TZ/LANG 固定）
pnpm test:ci:local  # 同上但继承本机环境，只在需要带凭证调试时用
```

`pnpm test`（逐包脚本）**不是** Windows 门禁：它不注入 Git 的 `bin`，shell 一致性用例会 `ENOENT bash.exe`。判断“绿”只认 `pnpm check` 与 `pnpm test:ci`，且必须看 summary 的用例数，不接受“0 个用例 exit 0”。

只跑改动相关的测试不算完成；提交前跑全量。守卫改动必须带**反例测试**（证明它会变红）。

## 8. 文档纪律

- 一个事实只有一处权威，权威分工见 `docs/structure.md` §17。
- 改了边界、改了内核语义、新增 seat、新增守卫 → 在 `.agents/notes/<state>/<date>-<slug>.md` 记一条（背景 / 决定 / 被拒绝的替代方案 / 后果）。
- 普通功能设计不进 notes，写功能 README。
- 代码与文档在同一次改动里更新，不"以后再补"。
