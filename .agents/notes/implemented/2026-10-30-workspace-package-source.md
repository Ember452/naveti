# 工作区包成员只有一个派生源

- 背景：包成员曾硬编码在七处（`pnpm-workspace.yaml`、`vitest.config.ts`、`tsconfig.json`、`biome.json`、`run-tests.mjs`、`check-entry-graphs.mjs`、`ci.yml`）。P2 第一步建 `packages/contracts` 时，它会不是 workspace 成员、不被 tsc/biome 检查、不被测试收集，而 `pnpm check` 仍然全绿。
- 决定：新增 `findWorkspacePackages`：`packages/` 下含 `package.json` 的目录，深度 1 或 2，遇到第一个 manifest 就停。`pnpm-workspace.yaml` 用 `packages/*` + `packages/*/*`；tsconfig/biome/vitest 用同样两深度；`run-tests`、`check-entry-graphs` 从该函数派生；`check-vitest-projects` 要求含测试的包必须有配置且被收集。
- 被拒绝的替代方案：
  - **`packages/**` 一把梭。** `codemode/examples/cloudflare/*/src` 有 `src/` 但没有 `package.json`，`**` 会把它们拉进 tsc/biome。
  - **只改 `pnpm-workspace.yaml`。** 其余六处仍会漏，而漏检是静默的。
  - **读 `pnpm-workspace.yaml` 的 glob 再展开。** 多一个解析器；目录约定（深度 1/2 + `package.json`）与它等价，且能被单测覆盖。
- 后果：新增 `packages/<name>` 或 `packages/<group>/<name>` 不再需要改配置；`packages/features/*/README.md` 等由 `check-doc-links` 覆盖。代价是 `findPackageDirectories` 仍保留给需要递归的夹具，两个函数的分工必须记住。
