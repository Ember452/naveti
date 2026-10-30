# Baseline: 2026-10-29 (after P0)

What "green" means for this tree, so that a later failure can be classified as a
regression or as a known platform limit.

Measured on two platforms, in the same change:

- **Windows** — Node 24.14.1, pnpm 11.13.0, the gates below, run locally.
- **Ubuntu** — CI (`ubuntu-latest`, Node 22) on PR #3, the first run after the pnpm
  migration. See [Ubuntu (CI)](#ubuntu-ci).

The two do not report identical numbers; where they differ, the reason sits next to
the number rather than in someone's memory.

## Gates

| Gate | Result |
| --- | --- |
| `pnpm check` — biome (verify only), pinned deps, runtime dependency closure, TS relative imports, vitest projects, entry graphs, workspace resolution, lockfile/manifest parity, test inventory ratchet, doc links, doc counts, parked triggers, kernel divergence, gate registration, `test:scripts`, `tsc --noEmit` | PASS |
| `pnpm build` — six kernel packages in dependency order, no network | PASS |
| `node --conditions=source tests/smoke/persist-resume.ts` | 4/4 PASS |
| `pnpm test:ci` — one process, all projects, hermetic env | PASS, 6040 passed / 879 skipped |
| `node scripts/run-tests.mjs` — one process per package (fallback) | PASS, same counts |

`pnpm check` **verifies and never writes**: `biome-check.mjs` runs without `--write`, so a
formatting difference is reported and fails the gate. Use `pnpm check:fix` when you want
the files rewritten. CI and `.githooks/pre-commit` both run `check`, so a green local run
and a green CI run mean the same thing.

Re-verified 2026-10-30 on Windows after that change: the same counts (452 files, 6040
passed / 879 skipped), `pnpm build` and `pnpm check` both green. Nothing in this file
changed, which is the point — a gate that stops rewriting files must not move the numbers.

## Per package

| Package | Default suite |
| --- | --- |
| `telemetry` | 47 passed |
| `ai` | 1596 passed, 863 skipped (credential-gated) |
| `chord` | 2434 passed |
| `codemode` | 223 passed, 3 skipped |
| `mcp` | 45 passed, 1 skipped |
| `durable` | 1695 passed, 12 skipped |

`durable` has two further lanes that the gate does **not** run: `test:store`
(SQLite storage) and `test:workers` (workerd). See [Durable lanes](#durable-lanes).

## Ubuntu (CI)

Measured by `ci.yml` on PR #3, which is the Ubuntu baseline.

| Job | Covers | Result |
| --- | --- | --- |
| `build-check` | `pnpm install --frozen-lockfile` → `pnpm build` → `pnpm check` | PASS, 1m04s |
| `test (durable)` | `pnpm --filter @naveti/durable run test`: default suite, retention-off pass, `test:store`, `test:workers` | PASS, 3m17s |
| `test (other)` | the other five packages through their own `test` scripts, then `test:scripts` | PASS, 3m34s |

Two facts this run pins down, which were inferences before it:

- **The `store` lane is green on Ubuntu** (it runs inside `test (durable)`), so the
  `EBUSY` seen locally is a Windows host limit, not a defect in the code under test.
- **`allowBuilds` works on a clean runner**: no `--ignore-scripts`, no interactive
  approval, and `canvas` stays unbuilt without failing the install.

## Known limits and skips

1. **Five `durable` tests need symlink rights.** Windows returns `EPERM` for
   `symlink` without Developer Mode or elevation. They now run through
   `test/helpers/symlink-support.ts`, which probes file and directory links
   separately, and their names carry `(symlink unavailable)` when skipped. Before
   this they failed; `durable` went from 5 failed to 0 failed without changing a
   single assertion (deviation D14).
2. **`chord/docs/tutorial.md` may arrive with CRLF** from a checkout with
   `core.autocrlf=true`. `tutorial.test.ts` normalizes `\r\n` before matching code
   fences, and `.gitattributes` pins text to LF (deviation D12). Without either, the
   tutorial suite parses zero examples and fails eight cases while the file itself
   is untouched.
3. **`ai` and `chord` probe tests spawn a plain `node` child** that resolves
   workspace packages through `dist`, not through the `source` condition. Run
   `pnpm build` before `test:ci`; deleting `dist` makes those probes fail with
   `Cannot find module .../dist/index.js`.
4. **`pnpm test` (package scripts) is not the Windows gate.** The package scripts
   do not inject Git's `bin` directory, so the shell-conformance tests fail with
   `ENOENT ... bash.exe`; `scripts/run-tests.mjs` does the injection. Use the gate
   commands below. `durable`'s second pass (`vitest.retention0.config.ts`, retention
   window off) returns 1695 passed / 12 skipped when launched that way.
5. **`pnpm build` does not reach the network.** `ai` validates its model catalog
   (`check:model-data`) but does not regenerate it; `pnpm build:catalog` refreshes
   the catalog explicitly and its diff must be reviewed on its own. Before this,
   every build re-fetched OpenRouter and Vercel pricing and re-stamped
   `.manifest.json`, so `git status` was never clean after a build and an offline
   machine could not run the gate at all.
6. **`scripts/run-tests.mjs` requires a build for the packages it runs.** The `ai`
   and `chord` probe tests spawn a plain `node` child that resolves workspace
   packages through `dist`; a missing `dist` now fails with an instruction instead
   of a `Cannot find module`, and a stale one can no longer pass silently.

## Known flakiness and workarounds

1. **`chord` `routines.test.ts` waited a fixed 20 ms** for an async chain to
   converge; it was the one test that made the gate randomly red. It now polls
   until the call count reaches the expected value (`eventually`, 2 s ceiling), so
   a slow machine repeats the assertion instead of failing it. Replaced at the
   source: a longer sleep would have moved the same race, not removed it.
2. **`chord` `table-migration.test.ts` spies the global `setTimeout`**, so parallel
   test files pollute each other. The `chord` vitest project sets
   `fileParallelism: false`.
3. **`durable` heap tests sit just above the 5 s default timeout** (one measured
   5024 ms). Every project config sets `testTimeout: 60000`.

## Durable lanes

Recorded, not gated:

| Lane | Command | Result |
| --- | --- | --- |
| storage | `pnpm --filter @naveti/durable run test:store` | FAIL on this host: `EBUSY: resource busy or locked, unlink '...\session.sqlite'` and the `-wal` file during temp teardown. Windows keeps the handle until GC; not a regression of the code under test |
| workers | `pnpm --filter @naveti/durable run test:workers` | PASS, 33 passed in 2 files |

Both are green on Ubuntu inside `test (durable)` (see [Ubuntu (CI)](#ubuntu-ci)). The
storage failure is therefore Windows-only: the same code, the same assertions, a
different handle lifetime.

Naming trap: **CI does run both lanes** (they are inside `durable`'s `test` script,
which `test (durable)` calls), while the local gate `pnpm test:ci` does **not** — it
runs the default suite only. "Recorded, not gated" below describes the local gate; it
is not a statement about CI.

Both are documented rather than enforced because they widen the feedback loop far
beyond the default suite and `test:workers` depends on workerd behaviour on the
host platform. A red there is not a regression in the default gate.

## How to re-measure

```bash
pnpm install
pnpm build
pnpm check
node --conditions=source tests/smoke/persist-resume.ts
pnpm test:ci                            # hermetic, single process
node scripts/run-tests.mjs              # per-package fallback, same counts
```

Record a new baseline only when the numbers change for a reason you can state.
Overwriting this file with "all green" without that reason destroys its only use:
telling a regression from a platform limit.
