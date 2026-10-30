#!/usr/bin/env node
/**
 * Every kernel file that differs from the comitted baseline must be named in the
 * divergence ledger or the migration deviations.
 *
 * Why a committed baseline instead of diffing `.upstream/` directly: that
 * directory is gitignored, so CI and a fresh clone do not have it. A guard that
 * only runs on a machine which happened to run `sync-upstream.mjs` first is the
 * exact failure `check-gate-registration` exists to prevent — it exists, looks
 * fine, and never gates anything.
 *
 * The baseline is `scripts/kernel-baseline.json`: this tree's content hashes,
 * plus the two path sets that make the baseline self-explaining. It is generated,
 * never hand-edited:
 *
 *   node scripts/check-kernel-divergence.mjs --write
 *
 * Why not hash upstream and exempt the differences: `docs/migration/deviations.md`
 * D1 (scope rename), D10 (formatter re-sorted imports) and D11 (runtime identifier
 * rebrand) touch essentially every kernel file. A path-level ledger over that is
 * all-exempt or all-red — measured, it reported 253 "unrecorded" differences that
 * four whole-tree entries already explain. Path-level detection has no resolving
 * power during migration, and full power the moment migration ends. This baseline
 * is that moment, so the gaps it freezes were reviewed under D0-D18 in
 * `docs/migration/deviations.md`, and nothing after it is grandfathered.
 *
 * `--write` audits before it writes: every difference it is about to absorb must
 * already be named in a ledger, or it refuses. A baseline update that can absorb
 * an unnamed edit is a laundering path that needs no malice to walk through — edit
 * a kernel file, add an unrelated sentence to a ledger, re-baseline, done.
 *
 * `--write` also reports the tree-versus-upstream gap every run, and prints the
 * exact paths it absorbs, so a re-baseline is never silent even on a machine
 * without `.upstream/`. Pairing a baseline move with a ledger change in the same
 * *commit* is enforced by `.githooks/pre-commit`, not here: a working-tree check
 * cannot see a ledger that was staged and then reverted.
 *
 * Two path sets live beside the hashes:
 *
 *   upstreamOnly  present upstream, absent here. Without it these files are
 *                 invisible — the hash table only describes local files, so a
 *                 restored upstream file would read as a local addition.
 *   localOnly     present here, absent upstream. Purely evidence: their hashes
 *                 are already in the table, so deleting one is caught as
 *                 `removed`. Recorded so a reader can see what the baseline
 *                 contains instead of inferring it.
 *
 * Hashes are SHA-256 over LF-normalized bytes. `latin1` round-trips every byte,
 * so a binary file hashes consistently without being decoded as text; the CRLF
 * collapse keeps the comparison stable across `core.autocrlf` settings.
 *
 * A difference is recorded when either ledger contains a path that equals, or
 * glob-matches, the file. Ledger prose is a proxy: this guard proves a change
 * was *mentioned*, never that the mention is accurate or that the risk was
 * understood. The ledger diff is the review artifact, like `test-integrity.json`.
 *
 * Root is injectable through `NAVETI_CHECK_ROOT` so the red cases can point at a
 * fixture.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, matchesGlob, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCAL_PACKAGE_DIRS } from "./scope-rules.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.NAVETI_CHECK_ROOT ? resolve(process.env.NAVETI_CHECK_ROOT) : resolve(HERE, "..");
const BASELINE = join(ROOT, "scripts", "kernel-baseline.json");
const UPSTREAM = join(ROOT, ".upstream");
const PACKAGES = Object.keys(LOCAL_PACKAGE_DIRS);
const SKIP_DIRS = new Set(["node_modules", "dist", "lib", "coverage"]);
const LEDGERS = ["docs/kernel/divergence.md", "docs/migration/deviations.md"];
/**
 * Longest alternatives first, and a boundary assertion: `js` before `json` would
 * truncate `*.json` to `*.js`, and `ts` before `tsx` would truncate `.tsx` to
 * `.ts` — either one silently un-excuses the file it was written to excuse.
 */
const PATH_TOKEN = /[A-Za-z0-9_.*@/-]+\.(?:json|ya?ml|tsx?|mts|cts|mjs|cjs|js|md)(?![\w./-])/g;

const write = process.argv.includes("--write");

/** SHA-256 over LF-normalized bytes; latin1 keeps every byte addressable. */
function hashFile(path) {
	const bytes = readFileSync(path);
	return createHash("sha256").update(bytes.toString("latin1").replace(/\r\n/g, "\n"), "latin1").digest("hex");
}

/** Relative posix paths of every file under `directory`, skipping build output. */
function walk(directory, prefix = "") {
	const out = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			out.push(...walk(join(directory, entry.name), prefix ? posix.join(prefix, entry.name) : entry.name));
			continue;
		}
		if (entry.isFile()) out.push(prefix ? posix.join(prefix, entry.name) : entry.name);
	}
	return out;
}

function hashes(directory) {
	const table = {};
	for (const rel of walk(directory).sort()) table[rel] = hashFile(join(directory, rel));
	return table;
}

function localHashes(pkg) {
	const directory = join(ROOT, "packages", LOCAL_PACKAGE_DIRS[pkg]);
	return existsSync(directory) ? hashes(directory) : {};
}

function upstreamHashes(pkg) {
	const directory = join(UPSTREAM, `${pkg}-normalized`);
	return existsSync(directory) ? hashes(directory) : undefined;
}

/** Paths named in either ledger, as written, for the matcher below. */
function ledgerTokens() {
	const text = LEDGERS.filter((rel) => existsSync(join(ROOT, ...rel.split("/"))))
		.map((rel) => readFileSync(join(ROOT, ...rel.split("/")), "utf8"))
		.join("\n");
	return text.match(PATH_TOKEN) ?? [];
}

/**
 * A ledger entry may spell the path with or without the `kernel/` segment, with
 * or without `packages/`, or as a bare package-relative path (migration entries
 * predate the grouping). Any of those spellings counts.
 */
function isRecorded(tokens, pkg, rel) {
	const variants = [
		`packages/${LOCAL_PACKAGE_DIRS[pkg]}/${rel}`,
		`packages/${pkg}/${rel}`,
		`${LOCAL_PACKAGE_DIRS[pkg]}/${rel}`,
		`${pkg}/${rel}`,
		rel,
	];
	return tokens.some((token) =>
		variants.some((variant) => variant === token || matchesGlob(variant, token) || matchesGlob(variant, `**/${token}`)),
	);
}

/**
 * Every file whose state differs from the recorded baseline.
 *
 * `restored` is kept separate from `added` on purpose: an upstream file that
 * reappears locally is the same path a deviation already says is *missing*, and
 * reporting it as a plain addition hides that the ledger's conclusion is now
 * stale.
 */
function differences(files, upstreamOnly) {
	const found = [];
	for (const pkg of PACKAGES) {
		const local = localHashes(pkg);
		const before = files[pkg] ?? {};
		const absentUpstream = new Set(upstreamOnly[pkg] ?? []);
		for (const rel of Object.keys(local)) {
			if (!(rel in before)) found.push({ pkg, rel, kind: absentUpstream.has(rel) ? "restored" : "added" });
			else if (local[rel] !== before[rel]) found.push({ pkg, rel, kind: "modified" });
		}
		for (const rel of Object.keys(before)) {
			if (!(rel in local)) found.push({ pkg, rel, kind: "removed" });
		}
	}
	return found;
}

function fail(lines) {
	for (const line of lines) console.error(line);
	process.exit(1);
}

function tryGit(args) {
	try {
		return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	} catch {
		return undefined;
	}
}

/**
 * A baseline move must arrive in the same *commit* as a ledger edit.
 *
 * `--write` can only see the working tree, so "ledger edited" and "ledger staged
 * then reverted" look identical to it. The index is what the commit will contain,
 * which is why this reads `diff --cached` rather than `diff HEAD` — the same
 * reasoning (and the same shape) as `check-lockfile-commit.mjs`.
 */
function stagedPairingProblem() {
	const staged = tryGit(["diff", "--cached", "--name-only"]);
	if (staged === undefined) return undefined; // not a git work tree: nothing to pair
	const files = staged
		.split("\n")
		.map((line) => line.trim().split("\\").join("/"))
		.filter(Boolean);
	const baselineRel = relative(ROOT, BASELINE).split("\\").join("/");
	if (!files.includes(baselineRel)) return undefined;
	if (files.some((file) => LEDGERS.includes(file))) return undefined;
	return (
		`${baselineRel} is staged without a staged ledger change: the baseline is about to move ` +
		`while ${LEDGERS.join(" and ")} stay put, so the commit contains no reviewable record of why.`
	);
}

function generate() {
	const previous = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null;
	const files = {};
	const upstreamOnly = {};
	const localOnly = {};
	const gap = [];

	for (const pkg of PACKAGES) {
		const local = localHashes(pkg);
		files[pkg] = local;
		const upstream = upstreamHashes(pkg);
		if (upstream === undefined) {
			// Without the cache the two sets cannot be recomputed. Keep what the
			// committed baseline already declares rather than silently emptying it.
			upstreamOnly[pkg] = previous?.upstreamOnly?.[pkg] ?? [];
			localOnly[pkg] = previous?.localOnly?.[pkg] ?? [];
			gap.push(`${pkg}: no .upstream/${pkg}-normalized, upstream gap not measured`);
			continue;
		}
		upstreamOnly[pkg] = Object.keys(upstream)
			.filter((rel) => !(rel in local))
			.sort();
		localOnly[pkg] = Object.keys(local)
			.filter((rel) => !(rel in upstream))
			.sort();
		let differing = 0;
		for (const rel of Object.keys(upstream)) {
			if (rel in local && local[rel] !== upstream[rel]) differing++;
		}
		gap.push(
			`${pkg}: ${differing} differing, ${localOnly[pkg].length} local-only, ${upstreamOnly[pkg].length} upstream-only`,
		);
	}

	// Audit before writing: an absorbed difference that no ledger names is an edit
	// laundered into the baseline.
	if (previous) {
		const pending = differences(previous.files ?? {}, previous.upstreamOnly ?? {});
		const tokens = ledgerTokens();
		const unrecorded = pending.filter((entry) => !isRecorded(tokens, entry.pkg, entry.rel));
		if (unrecorded.length > 0) {
			fail([
				"refusing to absorb unrecorded kernel changes into the baseline:",
				...unrecorded.map((entry) => `  ${entry.kind} ${entry.pkg}/${entry.rel}`),
				"",
				"Name each one in docs/kernel/divergence.md (tier, files, what, why, risk, guard, upstream",
				"state) or in docs/migration/deviations.md, then re-run --write. A baseline move that",
				"swallows an unnamed edit makes the next check pass over that edit forever.",
			]);
		}
		if (pending.length > 0) {
			console.log(`absorbing ${pending.length} recorded difference(s):`);
			for (const entry of pending) console.log(`  ${entry.kind} ${entry.pkg}/${entry.rel}`);
		}
	}

	const next = `${JSON.stringify(
		{
			_upstream: {
				version: "1.4.0",
				source: "@earendil-works/pi-* via npm",
				commit: null,
				note: "snapshot import; no shared git history, so no commit sha is recoverable. See docs/migration/upstream-sync.md.",
			},
			_migration: "Gaps here were reviewed under docs/migration/deviations.md D0-D18; every difference after this baseline is a functional change and needs a ledger entry.",
			_column: {
				files: "package -> relative path -> sha256 of this tree when the baseline was taken",
				upstreamOnly: "paths present in the normalized upstream tree and absent here (invisible to the hash table alone)",
				localOnly: "paths present here and absent upstream; evidence only, their hashes are already in files",
			},
			files,
			upstreamOnly,
			localOnly,
		},
		null,
		"\t",
	)}\n`;

	console.log(gap.join("\n"));

	if (next === (existsSync(BASELINE) ? readFileSync(BASELINE, "utf8") : "")) {
		console.log("kernel baseline unchanged; nothing to write");
		return;
	}

	mkdirSync(dirname(BASELINE), { recursive: true });
	writeFileSync(BASELINE, next);
	const total = PACKAGES.reduce((sum, pkg) => sum + Object.keys(files[pkg] ?? {}).length, 0);
	console.log(`kernel baseline written: ${total} file(s) across ${PACKAGES.length} package(s) -> ${relative(ROOT, BASELINE)}`);
}

if (write) generate();

if (!existsSync(BASELINE)) {
	fail([
		`${relative(ROOT, BASELINE)} is missing.`,
		"Generate it with `node scripts/check-kernel-divergence.mjs --write` (needs .upstream/ to record the gap).",
	]);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const problems = [];

// The path sets must describe the same package set as the hashes, or the JSON was
// hand-edited and no longer means what it says.
for (const pkg of PACKAGES) {
	for (const rel of baseline.localOnly?.[pkg] ?? []) {
		if (!(rel in (baseline.files?.[pkg] ?? {}))) {
			problems.push(`${pkg}: localOnly lists ${rel}, which the hash table does not contain`);
		}
	}
}

const found = differences(baseline.files ?? {}, baseline.upstreamOnly ?? {});
const tokens = ledgerTokens();
const unrecorded = found.filter((entry) => !isRecorded(tokens, entry.pkg, entry.rel));
const pairing = stagedPairingProblem();
if (pairing !== undefined) problems.push(pairing);

if (unrecorded.length > 0) {
	fail([
		...unrecorded.flatMap((entry) => [
			`${entry.pkg}: ${entry.rel} is ${entry.kind} versus the baseline and neither ledger names it.`,
			`  Record it in docs/kernel/divergence.md (tier, files, what, why, risk, guard, upstream state)`,
			`  or in docs/migration/deviations.md if the difference predates functional work.`,
		]),
		`\ncheck-kernel-divergence: ${unrecorded.length} unrecorded kernel difference(s) — a change without a ledger entry is a change nobody can review.`,
	]);
}

if (problems.length > 0) {
	fail([...problems, `\ncheck-kernel-divergence: ${problems.length} inconsistent baseline entr(y/ies).`]);
}

const byKind = (kind) => found.filter((entry) => entry.kind === kind).length;
console.log(
	`kernel divergence: ${found.length} recorded difference(s) ` +
		`(added ${byKind("added")}, modified ${byKind("modified")}, removed ${byKind("removed")}, restored ${byKind("restored")}); ` +
		"every one is named in a ledger.",
);
