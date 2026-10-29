# 六个内核包收进 packages/kernel/

- 背景：六个内核包原本平铺在 `packages/<pkg>`，而产品层要按 `contracts` / `platform` / `providers` / `features` 分组。平铺会把两种形态混在同一层，workspace glob 也会把组目录本身当成成员。
- 决定：六个包移到 `packages/kernel/<pkg>`，`pnpm-workspace.yaml` 显式列 `packages/kernel/*`。上游快照仍是平铺的，因此只在本地侧加一层映射：`scripts/scope-rules.mjs` 的 `LOCAL_PACKAGE_DIRS`。
- 被拒绝的替代方案：保持平铺、产品层用前缀（`product-host` 等）。前缀能省一次搬迁，但组目录是"这一层是谁的"唯一可机检的表达，靠名字前缀只能靠约定。
- 后果：任何"上游路径 → 本地路径"的地方都要多一段；`sync-upstream.mjs` 的命令行参数仍用短名（`durable chord`），只有本地路径映射变了。搬迁本身零丢失：1312 个 rename、1240 个文件字节一致。
