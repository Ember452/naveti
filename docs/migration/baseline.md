# Baseline: 2026-10-29 (after P0)

What "green" means for this tree, so that a later failure can be classified as a
regression or as a known platform limit.

Measured on Windows with Node 24.14.1 and pnpm 11.13.0. CI runs `ubuntu-latest`
with Node 22 and has **not** been re-measured since the pnpm migration; treat the
first green CI run as the Ubuntu baseline and record it here.

## Gates

| Gate | Result |
| --- | --- |
| `pnpm check` — biome, pinned deps, runtime deps, TS relative imports, entry graphs, workspace resolution, lockfile/manifest parity, test inventory ratchet, `test:scripts`, `tsc --noEmit` | PASS |
| `pnpm build` — six kernel packages in dependency order, no network | PASS |
| `node --conditions=source tests/smoke/persist-resume.ts` | 4/4 PASS |
| `pnpm test:ci` — one process, all projects, hermetic env | PASS, 6040 passed / 879 skipped |
| `node scripts/run-tests.mjs` — one process per package (fallback) | PASS, same counts |

`pnpm check` runs `biome-check.mjs --write` first, so it **rewrites files**. It is a
fixer plus a verifier. CI running it means formatting differences are fixed rather
than reported.

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
