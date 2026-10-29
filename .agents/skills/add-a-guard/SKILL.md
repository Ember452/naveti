---
name: add-a-guard
description: 在本仓库新增或修改一条守卫（scripts/check-*.mjs）。用于把一条会反复漂移的规则变成机检、并证明它真的会变红。当任务涉及"这条规矩应该变成红线"、或 structure.md §13 的未建表到了触发条件时使用。
---

# 加一条守卫

## 什么时候**不要**加

| 情况 | 原因 |
| --- | --- |
| 被检对象还不存在（例：没有 `packages/features/*` 时去写 `check-feature-registry`） | 对空集为真的守卫是装饰。§13 的未建表就是为这种情况留的 |
| 规矩是语义的、只能靠人判断 | 伪代码检查会制造假安全感，且很快被人关掉 |
| 同一条规矩已有守卫 | 一处权威。要改就改那条守卫 |

## 步骤

1. **先写下你希望它变红的那条命令。** 写不出可复现的红例，就先别写守卫。
2. `scripts/check-<name>.mjs`：头注释写**它拦什么失效** + **为什么这样判**（不写"本脚本用于检查 XX"）。
3. **根必须可注入**，否则无法用夹具测：
   - `process.cwd()`（`check-doc-links`、`check-doc-counts`、`check-test-integrity`、`check-lockfile-commit`、`check-ts-relative-imports`）；或
   - `NAVETI_CHECK_ROOT`（`check-entry-graphs`，它的预算表用仓库相对路径，所以夹具要镜像同样的路径）。
   把 `ROOT` 钉在脚本目录上一级的守卫，等于放弃红例。
4. `scripts/check-<name>.test.mjs`：至少**一条会红的断言** + 一条"合法输入不误红"。断言只依赖退出码与关键输出。
5. **平台中立**：不 shell out 到 `grep`/`sed`/`find`/`rg`；需要解析就 `JSON.parse` / TS Compiler API / import 图。临时目录用 `fs.mkdtemp(join(tmpdir(), ...))`。
6. 登记四处，少一处就是下一个漂移点：`package.json` 加 `check:<name>` 并接进 `check` 链 → `.githooks/pre-commit`（只放秒级检查）→ `docs/structure.md` §13 表 → §14 scripts 表。
7. 跑 `pnpm run check` 并贴完整输出；**故意注入一次违规，确认它拦住了**。

## 验收判据

守卫的价值 = 它能拦住的那次真实事故。头注释里要能指出是哪次事故（或哪条已经漂过的规则）催生了它。

## 出处

- `check-doc-links` 的由来与它第一次拦到的真错：`a28fb7f`、`ecf664b`。
- `check-test-integrity` 的基线与它的局限：`e727aee`、`docs/migration/baseline.md`。
- 两条守卫补上 root 注入与红例的完整过程：`scripts/check-entry-graphs.test.mjs`、`scripts/check-ts-relative-imports.test.mjs`。
- 纪律本身：`AGENTS.md` §14「守卫改动必须带反例测试」、`docs/structure.md` §13。

## 不要做

- **不要为了守卫改被测代码**，除非那条改动本身是规则（例：补依赖声明）。
- **不要在守卫里自动改仓库状态**（写基线文件、改配置）——把修复做成显式的 `--write` 命令。
- **不要把自由文本 reason 当审查物**；审查物只能是 diff（`test-integrity.json` 就是这个形状）。
