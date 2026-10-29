# Upstream sync: how to run it

Operational runbook for `scripts/sync-upstream.mjs`. **Policy lives in
[`KERNEL.md`](../../KERNEL.md) section 3** — when you are allowed to take an
upstream change, and why "half following" is worse than freezing. This file only
covers how to get the comparison and what each kind of hit means.

## What the command does

It rebuilds a normalised copy of the upstream tree, applies the scope rename with
the same rules used at migration time (`scripts/scope-rules.mjs`), and writes a
per-file text comparison. **It modifies nothing under `packages/`.**

## Running it

```bash
# against the local snapshot (preferred: this is the 1.4.0 baseline)
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
script rebuilds it), but losing `../pi-main` means the `1.4.0` baseline is only
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
| A real source change nobody recorded | Either an unrecorded local edit (record it in `deviations.md`) or an upstream change (decide per `KERNEL.md` section 3). |
| Upstream changed an `entry` schema, task state machine, commit atomicity, policy/approval/audit semantics | Stop. `KERNEL.md` section 2 requires an ADR before this lands here. |

## The pairing rule

`durable` and `chord` share the entry schema, the delta encoding and the task
semantics. Taking one without the other produces a contract mismatch that is
harder to diagnose than never upgrading. `KERNEL.md` section 3 states the rule;
this is what it means in practice: **a sync is either a pair (or the whole set) or
nothing.**

## Not implemented: `--check`

There is no machine-enforced freeze today. The rule "only take what is listed in
`deviations.md`" is prose, and prose decays.

The cheap version, whenever it is worth 30 minutes: a `--check` flag that exits
non-zero when the report contains a `changed`/`added`/`removed` entry whose path
is not accounted for by a deviation. Every guard in `scripts/` already follows
this shape — one file, one exit code, one message — so it fits the existing
machinery rather than adding a second convention.

## A habit worth having

Run the comparison once a quarter and record only its shape ("12 files changed in
`ai`, all provider models"). It costs a minute and it answers the one question
this document cannot: **is upstream still moving?** If it is, freezing costs you
bug fixes you will eventually want. If it is dormant, freezing costs nothing.
