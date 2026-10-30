# check 只验证，不再顺手修

- 背景：`package.json` 的 `check` 首步是 `node scripts/biome-check.mjs --write`，而 `.github/workflows/ci.yml` 的 Check 步骤就是 `pnpm run check`，之后没有任何 `git diff --exit-code`。后果是格式违规在 CI 上被静默修好然后继续跑绿：主干永远干净，因为没有人有机会看见它脏。`docs/structure.md` §14 其实早已规定 pre-commit "不能用 `biome --write`"，`.githooks/pre-commit` 也确实调用的是不带 `--write` 的版本——所以规则是对的，只有 `check` 这一处漂了，两处行为不一致。
- 决定：把"验"和"修"分开。`pnpm check` 只验证（`biome-check.mjs` 不带参数，格式差异会计入失败）；新增 `pnpm check:fix` 先写盘再跑一遍完整的 `check`。pre-commit 与 CI 都走 `check`，行为一致。
- 被拒绝的替代方案：
  - **保留 `--write`，在 CI 的 Check 之后加一步 `git diff --exit-code`**：能兜住主干漂移，但没解决"本地跑 check 会改写工作区"这件事——一个声称在检查的命令顺手改文件，改完还报绿，这本身就是 gate 自我豁免的形状。
  - **让 `check` 完全不带格式化检查，只留 lint**：格式会彻底失去门禁，而 `check-doc-*` 与 `biome` 的写盘路径也会分叉。
- 后果：
  - 本地改完代码如果忘了格式化，`pnpm check` 会红一次，需要跑 `check:fix`。这是有意的摩擦：红的那一步告诉你"文件内容和你以为的不一样"。
  - `biome-check.mjs --write` 仍然是全仓唯一写盘入口，没有被复制成第二份逻辑。
  - CI 不需要额外步骤就能拦住格式漂移，因此不存在"CI 与本地跑的是两条不同命令"的第二种可能。
  - 重新考虑的条件：若出现只读环境（例如 Cursor/CI 的沙箱）无法写盘且必须靠 `--write` 才能过，那么该修的是格式化策略，而不是把 `--write` 放回 `check`。
