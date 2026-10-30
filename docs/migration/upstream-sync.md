# Upstream sync: how to run it

Operational runbook for `scripts/sync-upstream.mjs`. **Policy lives in
[`KERNEL.md`](../../KERNEL.md) §5** — when you are allowed to take an
upstream change, and why "half following" is worse than freezing. This file only
covers how to get the comparison and what each kind of hit means.

## What the command does

It rebuilds a normalised copy of the upstream tree, applies the scope rename with
the same rules used at migration time (`scripts/scope-rules.mjs`), and writes a
per-file text comparison. **It modifies nothing under `packages/`.**

## Running it

```bash
# against the local snapshot of upstream 1.4.0 (preferred)
node scripts/sync-upstream.mjs --from ../pi-main

# one or more packages only
node scripts/sync-upstream.mjs --from ../pi-main durable chord

# print the actual patches for every changed file
node scripts/sync-upstream.mjs --from ../pi-main --full

# no --from: compares against the published npm tarball (@earendil-works/*@latest)
node scripts/sync-upstream.mjs
```

Without `--from` the comparison is against the **latest published release**, not
against `1.4.0`. That is a different question — useful for deciding whether to
take anything at all, useless for auditing what this repository changed.

## What it writes

| Path | Committed | Purpose |
| --- | --- | --- |
| `.upstream/<pkg>-normalized/` | no (gitignored) | the normalised upstream tree, for browsing and diffing by hand |
| `docs/migration/diffs/upstream-diff-<date>.md` | yes | the record of that comparison |

The `.upstream/` cache is **not in the repository**. Losing it costs nothing (the
script rebuilds it), but losing `../pi-main` means the `1.4.0` snapshot is only
reachable through npm, which serves `latest`.

## Reading the output

For each package it prints the number of scope replacements applied to the
upstream tree, then three lists: `added` (present here, absent upstream),
`removed` (present upstream, absent here), `changed`.

## Triage

| What you see | Verdict |
| --- | --- |
| Only `*.md` files differ | Expected. Package READMEs, CHANGELOGs and docs keep the upstream scope on purpose (`deviations.md` D1). Ignore. |
| Many `durable` files differ, import lines only | Expected. The formatter re-sorted imports after the shorter scope (`deviations.md` D10). Confirm with `--full`, then ignore. |
| `packages/ai/src/providers/data/*.json` differs | Generated. Regenerate, never hand-edit (`deviations.md` D2). |
| A real source change nobody recorded | Either an unrecorded local edit (record it in `deviations.md`) or an upstream change (decide per `KERNEL.md` §5). |
| Upstream changed an `entry` schema, task state machine, commit atomicity, policy/approval/audit semantics | Stop. `KERNEL.md` section 2 requires an ADR before this lands here. |

## The pairing rule

`durable` and `chord` share the entry schema, the delta encoding and the task
semantics. Taking one without the other produces a contract mismatch that is
harder to diagnose than never upgrading. `KERNEL.md` §5 states the rule;
this is what it means in practice: **a sync is either a pair (or the whole set) or
nothing.**

## The machine check

[`scripts/check-kernel-divergence.mjs`](../../scripts/check-kernel-divergence.mjs)
closes the gap this section used to describe. It does **not** compare against
`.upstream/`: that directory is gitignored, so neither CI nor a fresh clone has
it, and a guard that only runs where someone happened to sync is not a guard. It
compares against [`kernel-baseline.json`](../../scripts/kernel-baseline.json), a
committed table of this tree's hashes plus the two path sets (upstream-only,
local-only) that let the baseline explain itself.

`kernel-baseline.json` is **not** an upstream snapshot and holds no upstream
hashes. The upstream evidence is `.upstream/`, which is rebuildable; the baseline
records what *this* tree looked like when the gap was last reviewed.

What that means for this runbook: **after taking anything from upstream, the
baseline moves in the same change, and a ledger says why.**

1. `node scripts/sync-upstream.mjs --from ../pi-main` — produce the comparison.
2. Decide per [`KERNEL.md`](../../KERNEL.md) §5. Record what you took in
   [`deviations.md`](./deviations.md) (migration-era) or
   [`../kernel/divergence.md`](../kernel/divergence.md) (functional change).
3. `node scripts/check-kernel-divergence.mjs --write` — it refuses to absorb a
   difference no ledger names, and prints every path it absorbed.
4. `pnpm check` — the staged-pairing rule refuses a commit that moves the
   baseline while `divergence.md`/`deviations.md` stay put.

The rule still reads a ledger rather than the ledger's meaning: "named" is what
the guard proves, and the ledger diff is what a reviewer reads.

## A habit worth having

Run the comparison once a quarter and record only its shape ("12 files changed in
`ai`, all provider models"). It costs a minute and it answers the one question
this document cannot: **is upstream still moving?** If it is, freezing costs you
bug fixes you will eventually want. If it is dormant, freezing costs nothing.
