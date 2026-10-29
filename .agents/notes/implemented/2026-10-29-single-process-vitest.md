# 测试用根上单个 vitest 进程（projects），不再每包一个 runner

- 背景：旧做法是每包一次 `vitest`（`npm run test --workspaces`）。包数 N 就启动 N 次、N 份 transform 缓存，而"跑测试"是每天要做几十次的动作。
- 决定：根 `vitest.config.ts` 用 `test.projects: ["packages/kernel/*"]` 收集包，单进程调度、文件级并行；每个包的 `vitest.config.ts` 只写自己的 `name` 与特殊设置（`chord` 的 `fileParallelism: false`、`durable` 的 `setupFiles`），共享默认值来自 `vitest.base.ts` 的 `mergeConfig`。`run-tests.mjs` 保留逐包模式作回退。
- 被拒绝的替代方案：把测试集中到根 `tests/`。运行方式统一了，但"删包即删测试"这条会断——夹具与用例会留在根上变成孤儿。位置与运行是两件事，只改运行。
- 后果：`--project` 匹配的是 `package.json` 的 `name` 而不是目录名，写错会"跑 0 个用例且 exit 0"，所以 `run-tests.mjs` 做名字映射，并且必须核对 summary 的用例数。单进程 6040 passed / 879 skipped，与逐包模式逐项一致。
