# 项目 glob 命中普通文件会让整个测试起不来

- 背景：为了不再"指向虚空"，给 `packages/kernel/` 加了 `README.md`。根 `vitest.config.ts` 用 `projects: ["packages/kernel/*"]` 收集项目，vitest 把每个命中项都当项目位置，于是把这个文档也当项目——**全部六个项目的测试启动失败**。当时 `pnpm check` 全绿（64 项守卫测试通过），我按旧纪律宣布"完成"，是 `pnpm test:ci` 才暴露的。尾斜杠 `packages/kernel/*/` 试过，vitest 4 不认，仍然命中文件。
- 决定：
  1. glob 改为显式点名配置文件：`packages/kernel/*/vitest.config.ts`。它同时表达"每个包必须自带配置"，而 `run-tests.mjs` 的项目名来自各包 manifest，两边对得上。
  2. 新增 `check-vitest-projects`，只守一条不变量：项目 glob 只能命中配置文件或包目录；命中的目录必须自带 `vitest.config.ts`。它在 `check` 链与 `pre-commit` 里，成本约 0.1 秒。
  3. `AGENTS.md` §9 补上"`pnpm check` 绿不算绿"这条纪律，并把这次事故写成证据。
- 被拒绝的替代方案：
  - **顺手加"每个包目录都必须被收集"这条不变量**。写完就怀疑，于是实测：把 `mcp` 的 `vitest.config.ts` 改名后，`run-tests.mjs` 自己报 `FAIL mcp (exit 1)`——项目名来自 manifest，漏收会红。冗余检查删掉了，守卫的头部注释里写明"实测过，已由 runner 覆盖"。
  - **把 `README.md` 挪出 `packages/kernel/`**。躲开一次触发条件，glob 依然会把任何后来的普通文件当项目。
  - **不加守卫，只靠纪律**。纪律也补了，但静态门禁比 4.5 分钟的测试先给出答案，且这个失败模式在文档改动里会重演。
- 后果：`check` 与 `test:ci` 重新全绿（六项目 PASS）。真正的教训是那句纪律：**碰过配置、目录或依赖，宣布完成前必须跑全量**——上一轮我把 `check` 通过当成了完成。
