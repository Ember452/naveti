# 依赖方向从纪律变成机检：check-package-layers

- 背景：`structure.md` §5 与 `AGENTS.md` §4 都写了依赖方向，`KERNEL.md` §1 甚至写过"CI 拦截"，而那条守卫并不存在（`parked.md` 把它记成一次真事故）。P2 建出第一个产品层包（`packages/contracts`），触发条件成立。一个功能包在 `dependencies` 里写一个 `@naveti/durable` 不会让任何检查变红：import 能解析、构建能过，代价一年后以"内核重构要动四十个功能"的形式出现。
- 决定：新增 `scripts/check-package-layers.mjs`，只读 manifest，守四个方向——kernel 只依赖 kernel；contracts 只依赖内核的声明层（白名单，现为 `@naveti/chord`）；platform 不依赖 feature/app；feature 不依赖任何内核包（三个依赖段都查）。带六条用例，其中四条是各自方向的红例；进 `check` 链与 `.githooks/pre-commit`；`structure.md` §13 从"未建"移到"已建"并填退役条件，§14 脚本表加行；`KERNEL.md` §1 的"目前靠纪律"改回真话。
- 被拒绝的替代方案：
  - **把"client 面不依赖 host 包"并进来**：那一条是 import 图性质，manifest 看不见（feature 的 peer 里本来就允许 host）；它归 `check-client-face`，触发条件是第一个带界面的功能。把两件事塞进一条守卫，会让退役条件也混在一起。
  - **同时要求 kernel 包的入口有预算**：那要一次给 chord/mcp/telemetry 三家补条目，与本改动无关，属于典型的"顺手扩大改动面"。
  - **只靠 lint 的 `no-restricted-imports`**：lint 住在每个包自己的配置或根配置里，改配置比改代码方便；而且它只能看 import，看不见 `peerDependencies` 里的一行。
- 后果：新加一个包如果落在 `packages/{contracts,platform,providers,features}` 或 `apps/` 以外，这条守卫不会给它归类（`layerOf` 返回 undefined），也就不会替它判方向——这是故意的：不为不存在的布局发明规则。真出现新布局时，改守卫与 `structure.md` 同一次提交。
