# packages/AGENTS.md

包级补充规则。根 `AGENTS.md` 仍然有效，本文只写它没写、或者在这里更容易踩的部分；两者冲突时以根文档为准并先报告。

## 一个包的最小形状

- `package.json` 的 `exports` 每条都是 `{ "source": ..., "types": ..., "import": ... }`，`source` 在第一位。没有 `main` 也能工作，但带上它便于工具识别。
- `README.md` 五行说清：拥有什么 / 可 import 什么 / 占哪些 seat / 依赖谁 / 删掉会怎样。删不掉或说不清的一行，通常是放错层。
- 只有 `test/` 里有测试时才需要 `vitest.config.ts`；它用根上的 `sharedTestConfig` 合并出本包的 `name`，不自己配路径或 alias。
- 不在包内放 `tsconfig.build.json`。发布产物由打包入口按 manifest 生成，包级构建配置是第二套真相。

## 边界的机检

- `check-package-layers` 读依赖段守方向；`check-entry-graphs` 要求产品层每个代码出口都有预算；`check-workspace-resolution` 要求 `workspace:*` 与 `source` 条件；`check-runtime-deps` 要求运行时依赖声明完整。
- 这些守卫拦的是"能跑但会腐化"的形态。被拦时改代码，不改守卫、不加白名单——白名单只给"内核已声明的 seam"这类真例外用，并且要在 `.agents/notes/` 写清为什么。

## 文档

- 包的契约与用法写包内 `README.md`；决定为什么这样定写 `.agents/notes/`；不要进 `docs/`——那里只放跨包的规则与描述，而且有文件数上限。
