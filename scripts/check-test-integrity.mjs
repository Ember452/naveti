#!/usr/bin/env node
/**
 * Tests may not quietly shrink.
 *
 * The gate can be made green three ways that no other check notices: deleting a
 * test, adding `.skip`, or hiding a test behind a condition that is never true on
 * the machine running it. This guard freezes the inventory of every test file in
 * `scripts/test-integrity.json` and refuses to let the inventory regress.
 *
 * Rules that need no baseline:
 *   - `.only` is an error. It silently stops every other test in the run.
 *   - `describe.skip(` is an error. It removes a whole block at once.
 *
 * Ratchet against the committed baseline, per file:
 *   - `tests` may not decrease            (a deleted test, or a loop/each rewrite)
 *   - `skips` may not increase            (`.skip(`)
 *   - `conditionalSkips` may not increase (`.skipIf(` — legitimate, but must be reviewed)
 *   - `helperSkips` may not increase      (`itSymlinkFile`-style wrappers that decide at runtime)
 *   - a baseline entry may not disappear  (deleting a test file must be visible)
 *
 * New files never fail: their counters can only go up. To record an intentional
 * change, run `node scripts/check-test-integrity.mjs --write`; the JSON diff is the
 * review artifact — `skips 2 -> 5` in one file is exactly what a reviewer needs to
 * see, which a hand-tuned per-file cap cannot express.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const BASELINE = join(ROOT, "scripts", "test-integrity.json");
const SCAN_ROOTS = ["packages"];
const SKIP_DIRECTORIES = new Set(["node_modules", "dist", ".upstream"]);
const TEST_FILE = /\.(?:test|spec)\.(?:ts|tsx)$/;

const DECLARATION = /^[ \t]*(?:it|test)(?:\.\w+)*\s*\(/gm;
const HARD_SKIP = /\b(?:it|test)\.skip\s*\(/g;
const CONDITIONAL_SKIP = /\b(?:it|test)\.skipIf\s*\(/g;
/** Wrappers that skip at runtime, so a text scan cannot see the decision. */
const HELPER_SKIP = /\bitSymlink(?:File|Dir)\s*\(/g;
const TODO = /\b(?:it|test)\.todo\s*\(/g;
const ONLY = /\b(?:it|test|describe)\.only\s*\(/;
const DESCRIBE_SKIP = /\bdescribe\.skip\s*\(/;

function count(text, pattern) {
	return (text.match(pattern) ?? []).length;
}

function collectTestFiles(directory, out) {
	if (!existsSync(directory)) return out;
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			if (SKIP_DIRECTORIES.has(entry.name)) continue;
			collectTestFiles(path, out);
			continue;
		}
		if (TEST_FILE.test(entry.name)) out.push(path);
	}
	return out;
}

function inventory() {
	const files = {};
	const paths = [];
	for (const root of SCAN_ROOTS) collectTestFiles(join(ROOT, root), paths);
	for (const path of paths.sort()) {
		const text = readFileSync(path, "utf8");
		files[relative(ROOT, path).split("\\").join("/")] = {
			tests: count(text, DECLARATION),
			skips: count(text, HARD_SKIP),
			conditionalSkips: count(text, CONDITIONAL_SKIP),
			helperSkips: count(text, HELPER_SKIP),
			todos: count(text, TODO),
		};
	}
	return files;
}

const COUNTERS = ["tests", "skips", "conditionalSkips", "helperSkips", "todos"];
const write = process.argv.includes("--write");
const current = inventory();

if (write) {
	const previous = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : { files: {} };
	const changes = [];
	for (const [file, counters] of Object.entries(current)) {
		const before = previous.files?.[file];
		for (const counter of COUNTERS) {
			const from = before?.[counter] ?? 0;
			const to = counters[counter];
			if (from !== to) changes.push(`  ${file}: ${counter} ${from} -> ${to}`);
		}
	}
	for (const file of Object.keys(previous.files ?? {})) {
		if (!current[file]) changes.push(`  ${file}: removed`);
	}
	mkdirSync(dirname(BASELINE), { recursive: true });
	writeFileSync(BASELINE, `${JSON.stringify({ files: current }, null, "\t")}\n`);
	const total = Object.values(current).reduce((sum, counters) => sum + counters.tests, 0);
	console.log(`Wrote ${relative(ROOT, BASELINE)} for ${Object.keys(current).length} test files (${total} declarations).`);
	if (changes.length > 0) {
		console.log("Changes since the previous baseline:");
		for (const line of changes) console.log(line);
	}
	process.exit(0);
}

const failures = [];
for (const file of Object.keys(current)) {
	const text = readFileSync(join(ROOT, file), "utf8");
	if (ONLY.test(text)) failures.push(`${file}: uses .only, which silently skips every other test in the run`);
	if (DESCRIBE_SKIP.test(text)) failures.push(`${file}: uses describe.skip, which removes a whole block at once`);
}

if (!existsSync(BASELINE)) {
	console.error(`Missing ${relative(ROOT, BASELINE)}. Run: node scripts/check-test-integrity.mjs --write`);
	process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8")).files ?? {};
for (const [file, before] of Object.entries(baseline)) {
	if (!current[file]) {
		failures.push(`${file}: baseline entry has no file on disk; run --write if the deletion is intentional`);
		continue;
	}
	const after = current[file];
	// Tests may grow; skips may shrink. Only the wrong direction fails.
	if (after.tests < before.tests) {
		failures.push(`${file}: tests ${before.tests} -> ${after.tests} (a test disappeared)`);
	}
	for (const counter of ["skips", "conditionalSkips", "helperSkips", "todos"]) {
		if (after[counter] > before[counter]) {
			failures.push(`${file}: ${counter} ${before[counter]} -> ${after[counter]} (a test was hidden)`);
		}
	}
}

if (failures.length > 0) {
	for (const line of failures) console.error(line);
	console.error(
		`\n${failures.length} test-integrity violation(s). If the change is intentional, run "node scripts/check-test-integrity.mjs --write" and review the JSON diff.`,
	);
	process.exit(1);
}

const totals = Object.values(current).reduce(
	(sum, counters) => ({
		tests: sum.tests + counters.tests,
		skips: sum.skips + counters.skips,
		conditionalSkips: sum.conditionalSkips + counters.conditionalSkips,
		helperSkips: sum.helperSkips + counters.helperSkips,
		todos: sum.todos + counters.todos,
	}),
	{ tests: 0, skips: 0, conditionalSkips: 0, helperSkips: 0, todos: 0 },
);
console.log(
	`Test inventory is intact: ${Object.keys(current).length} files, ${totals.tests} declarations, ` +
		`${totals.skips} skips, ${totals.conditionalSkips} conditional skips, ${totals.helperSkips} helper skips, ${totals.todos} todos.`,
);
