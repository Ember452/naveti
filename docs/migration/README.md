# Migration record

Vendored from the local `pi-main` snapshot on 2026-10-29. Baseline: all six
packages at `1.4.0`. See [`../../NOTICE.md`](../../NOTICE.md) for license and
provenance, and [`../../KERNEL.md`](../../KERNEL.md) for the change policy.

## Scope

| Vendored | Not vendored |
| --- | --- |
| `telemetry`, `ai`, `chord`, `codemode`, `mcp`, `durable` | `tui`, `coding-agent`, `evals`, `agent`, `env` |

Dependency closure is self-contained: `durable → chord + ai + codemode + telemetry`,
`chord → telemetry`, `ai → telemetry`; `codemode` and `mcp` have no internal
dependencies. No vendored source imports a package that was left out.

## Local deviations from upstream

| # | Change | Why |
| --- | --- | --- |
| 1 | Scope renamed to `@naveti/*` (per-package counts in `upstream-diff-*.md`) | `scripts/rename-scope.mjs`, idempotent |
| 2 | `packages/ai/src/providers/data/*.json` generated | gitignored upstream and absent from the snapshot, but every `*.models.ts` imports it |
| 3 | `packages/ai/test/codex-websocket-cached-probe.ts` removed | manual live probe importing the unvendored `coding-agent`; no test referenced it |
| 4 | `packages/chord/test/boundary.test.ts` compares paths with `sep`; `packages/chord/src/host.ts` re-wrapped by biome | the check assumed `/` and rejected every relative import on Windows; the message fits 120 columns after the shorter scope |
| 5 | `packages/durable/test/env-node-conformance.test.ts` locates bash via PROGRAMFILES then PATH | it hardcoded `%ProgramFiles%\Git\bin\bash.exe`, breaking machines whose Git lives elsewhere |
| 6 | `.github/workflows` trimmed | removed `build-binaries`, `env`, `env-daemons`, `preview-packages`, `publish-model-catalog`, `nix`, `issue-analysis` (all depend on unvendored packages or scripts), and dropped the `coding-agent` matrix entry plus the mcp-conformance job |
| 7 | Root scripts added: `run-tests.mjs`, `sync-upstream.mjs`, `scope-rules.mjs`, `rename-scope.mjs`, `npm-audit.mjs`, `release-packages.mjs`, `package-workspaces.mjs`, `test:scripts`, `test:ci`, `rename:scope` | CI parity, upstream diffing, Windows test bootstrap |

Biome re-sorted imports in 95 `durable` files because the new scope changes
import order alphabetically. No statement changed; `node scripts/sync-upstream.mjs`
lists those files and `--full` prints the patches.

Package `README.md` / `CHANGELOG.md` keep the upstream scope (`@earendil-works/pi-*`)
on purpose: `rename-scope.mjs` skips `.md` so vendored provenance stays readable.
Use the root `NOTICE.md` / `KERNEL.md` for this repository's package names.

## Verification (Windows, Node 24.14.1)

| Gate | Result |
| --- | --- |
| `npm run check` (biome + pinned-deps + runtime-deps + ts-imports + entry-graphs + `tsc --noEmit`) | PASS |
| `npm run build` (six packages, dependency order) | PASS |
| `telemetry` | 47/47 |
| `ai` | 1596 passed, 0 failed, 866 skipped (credential gated) |
| `codemode` | 223 passed, 3 skipped |
| `mcp` | 45 passed, 1 skipped |
| `chord` | 2434/2434 on the last run (one upstream 20ms test is timing-flaky) |
| `durable` | 1695/1707 |
| `tests/smoke/persist-resume.ts` | 4/4 PASS (submit+answer, reopen keeps transcript, resume+continue, interrupted run resumes) |

### Known platform limits (not migration defects)

1. **5 durable tests create file symlinks.** Windows returns `EPERM` without
   Developer Mode or elevation; this machine has neither. They pass on Linux,
   where upstream CI runs.
2. **`chord` `routines.test.ts` waits a fixed 20ms** for an async chain to
   converge; occasionally only 3 of 4 calls land. Flaky by construction
   (2 of 3 runs failed, 1 passed), independent of the rename.
3. **`chord` `table-migration.test.ts` spies the global `setTimeout`**, so
   parallel test files pollute each other. It passes with
   `--no-file-parallelism`, which `run-tests.mjs` uses for `chord`.
4. **`durable` heap tests sit just above the 5s default timeout** (one measured
   5024ms). `run-tests.mjs` passes `--testTimeout=60000`; the same file reports
   13/13 with the larger budget.

Upstream runs its whole suite on `ubuntu-latest` (`.github/workflows/ci.yml`),
which is why none of the above was caught there. The vendored `ci.yml` therefore
passes `--testTimeout=60000` to `durable` and `--no-file-parallelism` to `chord`,
so the Ubuntu run does not re-discover these two upstream weaknesses.

### Fixed during review

`run-tests.mjs` originally wrote `env.PATH` onto a spread copy of `process.env`.
Windows exposes the variable as `Path`, so the child process lost its inherited
PATH (System32 included) and 34 extra tests failed with `No bash shell found`
and `spawn powershell ENOENT`. It now mutates whichever key is actually present;
`durable` returns to 5 failures, all `EPERM` symlinks.

## Commands

```bash
npm run check                 # the CI gate, cross-platform
npm run build                 # all six packages, dependency order
npm test                      # every workspace with its own config
npm run test:ci               # Windows-friendly bootstrap (bash on PATH, longer timeout, chord serial)
node scripts/rename-scope.mjs # re-apply the scope mapping; idempotent
node scripts/sync-upstream.mjs --from ../pi-main [pkg ...] [--full]
node --conditions=source tests/smoke/persist-resume.ts
```
