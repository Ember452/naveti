# Deviations from upstream

Every difference between this repository and the `pi-main` snapshot. This file is
the maintained copy; the list in [`NOTICE.md`](../../NOTICE.md) is the original
migration record and is kept for provenance.

Rules for this file:

- Append, do not rewrite history. A deviation that stops applying is marked
  `retired` with the reason, not deleted.
- Every entry states what it can break. A deviation with no stated risk is not
  reviewable.
- New deviations go here and in the commit that introduces them. `KERNEL.md`
  section 2 still decides whether a change is allowed at all; this file only
  records what is already true.

## D0 — No semantic change to vendored source

The strongest invariant of this migration, stated once so that the entries below
are read in its context:

**No statement in any `packages/*/src` file changed meaning.** The only source
edits are the package scope rename, import re-ordering by the formatter, and one
re-wrapped string. Every entry below is either a rename, a generated artefact, a
test fix, or repository tooling.

If you accept only one sentence of this document, accept that one: it is what
makes a 247,000-line vendored tree reviewable.

## D1 — Scope renamed to `@naveti/*`

- **What:** every import specifier and `package.json` name, from
  `@earendil-works/pi-*` / `@earendil-works/chord` to `@naveti/*`.
- **Why:** the packages are published and consumed under this repository's scope.
- **Tooling:** `scripts/rename-scope.mjs`, rules in `scripts/scope-rules.mjs`,
  applied record in `rename-report.json`. Idempotent: re-running changes nothing.
- **Risk:** none at runtime; the scope is part of every import specifier, so a
  missed file fails at type-check or import resolution, not at runtime.
- **Not renamed:** `*.md` (package READMEs, CHANGELOGs, `docs/`) keep the upstream
  scope on purpose, so they still read `npm install @earendil-works/pi-*`. Install
  instructions for this repository live in `NOTICE.md` and `KERNEL.md`.

## D2 — Model catalogue data generated locally

- **What:** `packages/ai/src/providers/data/*.json` — 42 files, about 0.93 MB —
  is committed, but upstream gitignores it and the snapshot shipped without it,
  while every `*.models.ts` imports it.
- **Why:** without it `packages/ai` does not compile.
- **How:** `node catalog/generate.ts --strict` (package script
  `generate-models`), once at migration time; `npm run build` regenerates it,
  `build:offline` regenerates and then verifies without network.
- **Risk:** `npm run build` fetches upstream catalogues, so it needs network and
  can produce a diff unrelated to your work. Use `build:offline` when you do not
  intend to update the data. Treat the JSON as generated: never hand-edit it.
- **Addendum (2026-10-29):** `build` now runs `build:offline` and nothing else; the
  network refresh moved to an explicit `build:catalog`. The recorded risk was real
  and measured: two consecutive builds rewrote `openrouter.json` pricing and
  re-stamped `.manifest.json`, so the gate depended on the network and every build
  left tracked files dirty.

## D3 — One AI test file removed

- **What:** `packages/ai/test/codex-websocket-cached-probe.ts`.
- **Why:** it is a manual live probe, not part of the automated suite, and it
  imports `../../coding-agent/src/core/model-runtime.ts` — a package that is not
  vendored here. Nothing referenced it.
- **Risk:** none. The probe only ever ran by hand.
- **Addendum (2026-10-29):** two more files are absent versus upstream and were not
  recorded here: `ai/src/providers/radius.models.ts` and
  `ai/test/radius-thinking-replay-e2e.test.ts`. Radius became opt-in during
  migration: `providers.test.ts` asserts `builtinProviders()` does not contain
  `radius`, and the catalog only generates radius data when
  `NAVETI_RADIUS_GATEWAY` is configured, so neither the model data nor the end-to-end
  probe has anything to run against. Without this note, a future comparison against
  upstream reads as "two files were lost".

## D4 — Root configuration trimmed to six packages

- **What:** root `package.json`, `tsconfig.json`, `biome.json`, `vitest.base.ts`
  and `scripts/check-entry-graphs.mjs` describe six packages, not upstream's
  full set.
- **Why:** the other packages do not exist here.
- **Risk:** these files enumerate things per package (workspaces, `paths`,
  aliases, entry budgets). Adding a package means editing all of them. See
  `docs/structure.md` for the current list, and note that `biome.json` excludes
  `apps` (`"!!apps"`) — product-layer code is not covered by `npm run check`
  until that is changed.

## D5 — Release, publish and installer tooling excluded

- **What:** upstream's release, publish, installer and coding-agent tooling
  scripts are not included.
- **Why:** they target upstream's distribution, not this repository.
- **Risk:** nothing here can publish a package as-is. `scripts/release-packages.mjs`
  is retained only because `check-runtime-deps.mjs` imports it.

## D6 — `chord` path comparison made platform-neutral

- **What:** `packages/chord/test/boundary.test.ts` compares resolved paths using
  the platform separator instead of a hardcoded `/`.
- **Why:** the original assertion rejected every relative import on Windows.
- **Risk:** the assertion is unchanged in substance; only the separator differs.
  On Linux the two spellings are identical.

## D7 — `durable` conformance test finds bash wherever it is installed

- **What:** `packages/durable/test/env-node-conformance.test.ts` locates Git Bash
  through `%ProgramFiles%` and then `PATH`, mirroring `getShellConfig`, instead of
  assuming `%ProgramFiles%\Git\bin\bash.exe`.
- **Why:** it broke on machines whose Git lives elsewhere.
- **Risk:** none. It is a test-only lookup, and the product path
  (`NodeExecutionEnv`) already searched `PATH`.

## D8 — CI workflows trimmed

- **What:** seven workflows that need unvendored packages or scripts are removed
  (`build-binaries`, `env`, `env-daemons`, `preview-packages`,
  `publish-model-catalog`, `nix`, `issue-analysis`). In `ci.yml` the
  `coding-agent` matrix entry, the fd/ripgrep step, the `packages/env` daemon
  build, the preview-packaging steps and the mcp-conformance job are removed.
- **Why:** they reference packages that are not vendored.
- **Risk:** CI coverage now matches this repository's packages but not its
  product layer. `apps/*` has no CI lane yet.

## D9 — Root tooling added for this repository

- **What:** `scripts/scope-rules.mjs`, `scripts/rename-scope.mjs`,
  `scripts/sync-upstream.mjs`, `scripts/run-tests.mjs`, plus the retained upstream
  scripts `npm-audit.mjs`, `release-packages.mjs`, `package-workspaces.mjs` that
  the kept checks import. `tests/smoke/persist-resume.ts` is local, not upstream.
- **Why:** scope renaming, upstream diffing, Windows test bootstrap.
- **Risk:** `run-tests.mjs` carries platform workarounds that upstream does not
  have (see `baseline.md`); it is the only supported way to run the whole suite
  on Windows.

## D10 — Formatter reordered imports across `durable`

- **What:** Biome re-sorted imports in 95 `durable` files and re-wrapped one
  message in `packages/chord/src/host.ts`.
- **Why:** the shorter scope changes alphabetical order; the message fits 120
  columns afterwards.
- **Risk:** this is the largest source-level diff in the migration and it is pure
  noise when reading a diff. `node scripts/sync-upstream.mjs --full` prints the
  patches if you need to confirm that a statement did not change.

## D11 — Runtime identifiers and identity rebranded to naveti

- **What:** every persisted kind and every telemetry name is `naveti.*` —
  `naveti.user`, `naveti.assistant`, `naveti.tool-result`, `naveti.system`,
  `naveti.reset`, `naveti.compaction`, `naveti.agent`, `naveti.provider`,
  `naveti.live`, `naveti.inbox`, `naveti.usage`, `naveti.generation`,
  `naveti.tool`, `naveti.durable.submit`, `naveti.durable.phase`. The attribution
  constant is `NAVETI_ATTRIBUTION`, and `DEFAULT_HARNESS_IDENTITY` is
  `{ attribution: NAVETI_ATTRIBUTION }`.
- **Why:** these had to be decided before the first session was ever written,
  because they are a persisted data format. A grep for `"pi.` across all six
  packages returns nothing.
- **Risk:** frozen from the first release onward. Renaming any of these kinds
  later makes existing storage unreadable and needs an explicit migration plus an
  ADR (`KERNEL.md` section 2). The converse is not a risk: an app that does not
  pass `HarnessOptions.identity` now attributes itself to naveti, not upstream, so
  `identity` is a branding choice rather than a correctness fix.
- **Correction:** an earlier version of this entry — and the closing note of the
  original `docs/migration/README.md` — claimed `pi.user` / `PI_ATTRIBUTION` were
  kept as-is. That described the snapshot, not this tree. Trust the grep, not the
  prose.

## D12 — Text files pinned to LF, tutorial test normalizes CRLF

- **What:** `.gitattributes` now sets `* text=auto eol=lf`; `chord`'s
  `test/tutorial.test.ts` reads `docs/tutorial.md` through `.replace(/\r\n/g, "\n")`.
- **Why:** this machine has `core.autocrlf=true` and the repository had no
  `.gitattributes`, so the working tree could hold CRLF for files whose stored blob
  is LF. `docs/tutorial.md` came back with 931 CR bytes, and the tutorial test —
  which matches code fences with `\n` — parsed zero examples and failed eight
  cases. The file was never modified; only the checkout differed.
- **Risk:** the normalize call is a no-op on LF checkouts, so behaviour is
  identical on Linux. The attribute can cause a one-time renormalization diff on
  the next checkout of an affected file.
- **Evidence:** `chord` returned 2434/2434 after the fix, matching `baseline.md`.

## D13 — Kernel packages grouped under `packages/kernel/`, pnpm

- **What:** the six vendored packages moved from `packages/<name>` to
  `packages/kernel/<name>`; the workspace manager changed from npm to
  pnpm@11.13.0 with isolated `node_modules`, `workspace:*` internal dependencies
  and `allowBuilds` in `pnpm-workspace.yaml`. Root configs (`tsconfig.json`,
  `biome.json`, `check-entry-graphs.mjs`, `run-tests.mjs`, `scope-rules.mjs`,
  `sync-upstream.mjs`, `ci.yml`, package `tsconfig.build.json` extends depth) were
  updated to match.
- **Why:** the product layer needs `packages/{contracts,platform,providers,features}`
  beside the kernel without the workspace glob degenerating, and the tree has to
  survive dozens of feature packages.
- **Risk:** upstream snapshots are flat, so every path that maps upstream to local
  needs the extra segment. `scripts/scope-rules.mjs` now exports
  `LOCAL_PACKAGE_DIRS` for that mapping; CLI arguments to `sync-upstream.mjs` still
  use short names.
- **Also:** `@smithy/types` was added to `packages/kernel/ai` devDependencies. Under
  npm it resolved through hoisting; isolated `node_modules` exposed the undeclared
  import.

## D14 — Five durable symlink tests skip when the host cannot create links

- **What:** `test/helpers/symlink-support.ts` probes file and directory symlink
  creation separately and caches the result; `env-node.test.ts` (2 cases) and
  `tools.test.ts` (3 cases) now run through `itSymlinkFile` / `itSymlinkDir`.
- **Why:** Windows returns `EPERM` for `symlink` without Developer Mode or
  elevation. These five tests created links only as a precondition, so the failure
  said nothing about the code under test.
- **Risk:** on a host without symlink rights, five cases are skipped instead of
  failing. The skip is visible in the test name as `(symlink unavailable)`, so a
  Linux run that loses coverage is distinguishable from a Windows host limit.
- **Evidence:** `durable` moved from 1695 passed / 5 failed to 1695 passed /
  12 skipped (7 pre-existing + these 5), 0 failed.

## D15 — Root-level reconciliation with the pi snapshot

- **What:** every root entry and every file under `scripts/` was compared against
  `../pi-main`. Three classes came out of it.
- **Missing and now restored:**
  - `.gitattributes` — see D12; its absence is what produced CRLF in the working
    tree and the eight tutorial failures.
  - `AGENTS.md` — upstream had one; the vendored tree did not. The current file is
    written for this repository, so it is a replacement rather than a copy.
  - `test.sh` semantics — upstream runs the suite inside `env -i` with a throwaway
    HOME/TMP, no API keys, no user git/npm config, and `TZ=UTC LANG=C`. Ported as
    `scripts/hermetic-env.mjs` and reachable through `run-tests.mjs --hermetic`.
    Without it, credential-gated skips depend on whose shell started the run.
  - `scripts/check-lockfile-commit.mjs` — ported, not copied: upstream reasons over
    npm v3 lock entries. The pnpm version compares each changed `package.json`'s
    dependency sections against `HEAD` and requires `pnpm-lock.yaml` to move with
    them, with `NAVETI_ALLOW_LOCKFILE_CHANGE` as the escape hatch.
- **Deliberately dropped, for the record:** release/pack/preview tooling (24 files,
  npm `pack:true` based); `scripts/issues/**` (21 files, needs the removed
  `issue-analysis.yml`); coding-agent smoke entries (7 files, package not vendored);
  stats and transcript analysis (7 files, not gates); model-catalog comparison tools
  (5 files, superseded by `scripts/model-catalog-protocol.ts`); `nix/` `flake.*`
  `.pi/` `CONTRIBUTING.md` `SECURITY.md` `pi-test.*` `auto-pi.sh` (environment or
  product-specific).
- **Why it happened:** `sync-upstream.mjs` iterates `packages/*` only. Root files,
  root `scripts/`, and `.github/` sit outside every comparison it performs, so a
  dropped root file is invisible to the mechanism that is supposed to notice.
- **Risk:** an upstream fix to a root config (a workflows guard, a hook list, a
  `.gitattributes` rule) will never surface. Re-run the root comparison by hand
  when taking a new snapshot; `packages/` parity does not imply repository parity.

