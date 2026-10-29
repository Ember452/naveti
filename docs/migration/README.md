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
| 1 | Scope renamed to `@naveti/*` (per-package counts in `diffs/upstream-diff-*.md`) | `scripts/rename-scope.mjs`, idempotent |
| 2 | `packages/ai/src/providers/data/*.json` generated | gitignored upstream and absent from the snapshot, but every `*.models.ts` imports it |
| 3 | `packages/ai/test/codex-websocket-cached-probe.ts` removed | manual live probe importing the unvendored `coding-agent`; no test referenced it |
| 4 | `packages/chord/test/boundary.test.ts` compares paths with `sep`; `packages/chord/src/host.ts` re-wrapped by biome | the check assumed `/` and rejected every relative import on Windows; the message fits 120 columns after the shorter scope |
| 5 | `packages/durable/test/env-node-conformance.test.ts` locates bash via PROGRAMFILES then PATH | it hardcoded `%ProgramFiles%\Git\bin\bash.exe`, breaking machines whose Git lives elsewhere |
| 6 | `.github/workflows` trimmed | removed `build-binaries`, `env`, `env-daemons`, `preview-packages`, `publish-model-catalog`, `nix`, `issue-analysis` (all depend on unvendored packages or scripts), and dropped the `coding-agent` matrix entry plus the mcp-conformance job |
| 7 | Root scripts added: `run-tests.mjs`, `sync-upstream.mjs`, `scope-rules.mjs`, `rename-scope.mjs`, `npm-audit.mjs`, `release-packages.mjs`, `package-workspaces.mjs`, `test:scripts`, `test:ci`, `rename:scope` | CI parity, upstream diffing, Windows test bootstrap |

Biome re-sorted imports in 95 `durable` files because the new scope changes
import order alphabetically. No statement changed; `node scripts/sync-upstream.mjs`
lists those files and `--full` prints the patches.

## Documentation branding

A one-off rewrite replaced the upstream scope and product name in Markdown only:
The upstream scope became `@naveti/*`, and standalone `pi`/`Pi` became
`naveti`/`Naveti`. No file under `packages/*/src` or `packages/*/test` was touched.

Deliberately kept:

- the `0.0.1` entry in every package `CHANGELOG.md` records that the kernel is
  vendored from the upstream snapshot; upstream release history is not reproduced here;
- `NOTICE.md`, `KERNEL.md`, `docs/migration/**` — provenance statements;
- the default gateway and default attribution hostnames hardcoded in
  `packages/ai/src` — technical facts, so the documentation does not spell them out;
- runtime identifiers (`pi.user`, `pi.assistant`, `pi.durable.submit`, ...) and the
  constant `PI_ATTRIBUTION` — data formats and code symbols.

Package `CHANGELOG.md` keeps the upstream scope and product name for the same
provenance reason. Use the root `NOTICE.md` / `KERNEL.md` for this repository's
package names.

## Verification

Measured gate results, per-package counts, known platform limits and the commands to
re-measure them all live in [`baseline.md`](./baseline.md). This file keeps only the
provenance record: duplicating the numbers here is how they drifted the first time.

## Commands

```bash
pnpm check                    # the CI gate, cross-platform
pnpm build                    # six packages, dependency order, no network access
pnpm build:catalog            # refresh the model catalog (network); review the diff
pnpm test:ci                  # gate: single process, hermetic environment, needs a build
pnpm test:ci:local            # same run, inherits the local environment
node scripts/rename-scope.mjs # re-apply the scope mapping; idempotent
node scripts/sync-upstream.mjs --from ../pi-main [pkg ...] [--full]
node --conditions=source tests/smoke/persist-resume.ts
```

