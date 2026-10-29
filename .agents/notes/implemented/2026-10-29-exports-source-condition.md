# 模块解析交给 exports 的 source 条件，删掉手写 paths

- 背景：`tsconfig.json` 有约 30 条手写的 `paths`，`vitest.base.ts` 有 19 条手写 alias，`check-entry-graphs.mjs` 还有一张手写的包表。三处都随包数量增长，且都不报错——加包忘了改，症状是"编辑器飘红但代码没错"。
- 决定：三层固定解析——pnpm 在 `node_modules` 建 symlink、每个包的 `exports` 每一条带 `"source"` 且在**对象第一位**、`tsconfig.json` 设 `customConditions: ["source"]`。`paths` 全删（连 `typebox` 那条也没有消费者）。新增 `check-workspace-resolution.mjs` 守住这三点，包括"`source` 必须排在第一位"。
- 被拒绝的替代方案：用 Project References 替代 paths。references 解决的是增量构建与构建顺序，它不参与模块解析；两者不冲突但也不互相替代。另一个替代是"生成 paths 的脚本"——那只是把"忘了改配置"变成"忘了跑脚本"，IDE 依然要等脚本。
- 后果：`ai` 原本没有任何 `source` 条件，是这次改造中唯一需要动 manifest 的包；补完之后 `node --conditions=source tests/smoke/persist-resume.ts` 在**删掉全部 dist** 的情况下仍 4/4 通过，这是"确实在跑源码"的证据。
