# NOTICE

This repository vendors source code from the open-source project **pi**
(`earendil-works/pi`), MIT licensed. The original copyright notice is kept in
[`LICENSE`](./LICENSE).

## Provenance

| Item | Value |
| --- | --- |
| Upstream snapshot | `DEVELOP/Project-main/TypeScript/pi-main` (source snapshot, no git history) |
| Snapshot date | 2026-10-29 |
| Package baseline version | `1.4.0` (all vendored packages) |
| License | MIT |

## Vendored packages

| Vendored path | Upstream package | Upstream path |
| --- | --- | --- |
| `packages/kernel/telemetry` | `@earendil-works/pi-telemetry` | `packages/telemetry` |
| `packages/kernel/ai` | `@earendil-works/pi-ai` | `packages/ai` |
| `packages/kernel/chord` | `@earendil-works/chord` | `packages/chord` |
| `packages/kernel/codemode` | `@earendil-works/pi-codemode` | `packages/codemode` |
| `packages/kernel/mcp` | `@earendil-works/pi-mcp` | `packages/mcp` |
| `packages/kernel/durable` | `@earendil-works/pi-durable` | `packages/durable` |

Vendored source is kept structurally identical inside each package: `exports`
maps, module sub-paths and test suites are unchanged. The packages live under
`packages/kernel/` (deviation D13); the only mechanical source change is the
package scope, renamed to `@naveti/*` (see `scripts/rename-scope.mjs` and
`docs/migration/rename-report.json`).

The maintained deviation list is [`docs/migration/deviations.md`](./docs/migration/deviations.md);
this file keeps licence, provenance and the original migration record.

## Not vendored

The following upstream packages are intentionally excluded, because they are
product-layer code rather than kernel:

- `packages/tui` — terminal UI
- `packages/coding-agent` — CLI product, tool surfaces, installers
- `packages/evals` — evaluation harness
- `packages/agent` — second (stateless) agent loop
- `packages/env` — SSH remote execution environment

## Local deviations from upstream

1. `packages/ai` — no script changes were needed. The snapshot's `generate-models`
   already points at `catalog/generate.ts` (the real generator, which fetches
   upstream catalogs). `src/providers/data/` is gitignored upstream and was
   absent from the snapshot, so it is generated once with
   `node catalog/generate.ts --strict`; `build` verifies it offline, and
   `build:catalog` refreshes it.
2. Root `package.json`, `tsconfig.json`, `biome.json`, `vitest.base.ts` and
   `scripts/check-entry-graphs.mjs` are trimmed to the six vendored packages.
3. Release, publish, installer and coding-agent tooling scripts from upstream
   are not included.
4. `packages/ai/test/codex-websocket-cached-probe.ts` is removed. It is a manual
   live probe (not part of the automated suite) that imports
   `../../coding-agent/src/core/model-runtime.ts`, a package that is not
   vendored here. No test referenced it.
5. `packages/ai/src/providers/data/*.json` is regenerated with
   `node catalog/generate.ts --strict` because the snapshot shipped without it
   while every `*.models.ts` imports it. Generated data tracks upstream model
   catalogs; see `KERNEL.md` §5 for the follow-up policy.
6. `packages/chord/test/boundary.test.ts` compares resolved paths with the
   platform separator instead of a hardcoded `/`, which rejected every relative
   import on Windows. The assertions are unchanged.
7. `packages/durable/test/env-node-conformance.test.ts` finds Git Bash through
   Program Files and then PATH, mirroring `getShellConfig`, instead of assuming
   `%ProgramFiles%\Git\bin\bash.exe`. The assertions are unchanged.
8. `.github/workflows` keeps upstream's files except the seven that need
   unvendored packages or scripts (`build-binaries`, `env`, `env-daemons`,
   `preview-packages`, `publish-model-catalog`, `nix`, `issue-analysis`). In
   `ci.yml` only the `coding-agent` matrix entry, the fd/ripgrep step, the
   `packages/env` daemon build, the preview-packaging steps and the
   mcp-conformance job were removed.
9. Root tooling added for this repository: `scripts/scope-rules.mjs`,
   `scripts/rename-scope.mjs`, `scripts/sync-upstream.mjs`,
   `scripts/run-tests.mjs`, plus `scripts/deps-audit.mjs`,
   `scripts/release-packages.mjs`, `scripts/package-workspaces.mjs` that the
   retained checks import. `tests/smoke/persist-resume.ts` is a local
   persistence check, not upstream code.
10. Biome re-sorted imports in 95 `durable` files because `@naveti/*` sorts
    differently from `@earendil-works/*`. No statement changed;
    `scripts/sync-upstream.mjs --full` prints the patches. One `chord` file,
    `src/host.ts`, was likewise re-wrapped (a message that fits 120 columns after
    the shorter scope); the statement is identical.
11. Package `README.md` / `CHANGELOG.md` / `docs/*.md` keep the upstream scope on
    purpose, so they still read `npm install @earendil-works/pi-*`. `rename-scope.mjs`
    skips `.md` to preserve the vendored provenance; install instructions for this
    repository live in the root `NOTICE.md` and `KERNEL.md`. Two package READMEs
    that named the old attribution constant were corrected to `NAVETI_ATTRIBUTION`
    (D11 addendum); no source file changed.

The attribution constant is `NAVETI_ATTRIBUTION`, and `DEFAULT_HARNESS_IDENTITY`
is `{ attribution: NAVETI_ATTRIBUTION }` (D11). `DEFAULT_AGENT_IDENTITY` is not
part of this tree. Product identity is supplied by the caller through the
`identity` option.
