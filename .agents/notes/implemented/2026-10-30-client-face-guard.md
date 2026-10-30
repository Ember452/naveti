# client 面的红线变成机检：check-client-face

- 背景：`structure.md` §5 第 5 条与 §12 第 5 条都写着"client 面不 import `node:*` / `platform/host` / 同包 host 面"，但 P2 让 chat 有了 `src/client` 之后，没有任何东西拦这件事。更糟的是 `apps/web/tsconfig.json` 带 `types: ["node"]`——因为 client 面经 `@naveti/web` 摸到的 workspace 包是按 Node 类型标注的——所以 `import "node:fs"` 在 client 文件里**能通过类型检查、能构建**，只在用户浏览器里炸。这是"文档说有、实际没有"的又一次实例，和 `KERNEL.md` 那句"CI 拦截"同形。
- 决定：新增 `scripts/check-client-face.mjs`，从每个功能 `./client` 出口的 `source` 出发走**值**导入图（`import type` 被抹掉，不算），命中 `node:*`、`@naveti/host*`、同包 `src/host/**` 即红。六条用例：node 内置、host 包、同包 host 面、一跳远（证明它真的走图而不是只读入口）、type-only 的 host 导入必须放行、没有 client 面的功能跳过。进 `check` 链与 pre-commit；`structure.md` §13 从"未建"移到"已建"并填退役条件。
- 被拒绝的替代方案：
  - **从 client 的 tsconfig 里去掉 `node` 类型**：那会让 `@naveti/web` 与 chord 的那些 Node 标注的声明一起报错，等于为了让红线成立而拆掉类型覆盖；而且类型可见性与运行时可达性是两件事，混在一起会得到一个"编译不过"而不是"越界被抓"的信号。
  - **ESLint/Biome 的 `no-restricted-imports`**：规则住在配置里，改配置比改代码方便；而且它只能看 import 语句，看不见"通过一个相对文件绕过去"的那一跳。
  - **等 P4 再建**：`structure.md` 的触发条件是"第一个带界面的功能出现"，P2 已成立；`master-plan` 把它放进 P4 是排期错误，已在本轮修正。
- 后果：`master-plan` P4 不再列 `check-client-face`；它的退役条件是"client 面成为独立构建目标、天然不解析 node 后"。新功能只要导出 `./client` 就自动被检查，不需要登记。
