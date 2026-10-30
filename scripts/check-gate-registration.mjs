#!/usr/bin/env node
/**
 * The guard inventory must be consistent with itself.
 *
 * Adding a guard means four registrations: the script, its red-case test, the
 * `check` chain (and the pre-commit hook), and the table in `docs/structure.md`.
 * Missing any one of them fails silently — the guard exists, looks fine, and never
 * runs, or runs with nothing but green cases. That is the exact failure mode this
 * repository has been fixing all week, so it gets fixed by a checker instead of by
 * remembering.
 *
 * Four registrations, and one statement about the guard's own lifetime:
 *
 *   1. every `scripts/check-*.mjs` has a sibling `.test.mjs`
 *   2. every guard is reachable from `scripts.check`, following `pnpm run <key>` one
 *      level deep, because several guards are wired through an aliased key
 *   3. every `check` chain step resolves to a real script file, so a renamed guard
 *      cannot leave a dangling invocation behind
 *   4. every guard is named in `docs/structure.md`, where the inventory lives
 *   5. every row there answers *when this guard should stop existing*. A guard
 *      that can never be retired only accumulates until people route around it,
 *      so the retirement condition is registration, not a later decision.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.env.NAVETI_CHECK_ROOT ? process.env.NAVETI_CHECK_ROOT : process.cwd();
const SCRIPTS = join(ROOT, "scripts");
const CHAIN_STEPS = 2;

const scriptFiles = () => {
	if (!existsSync(SCRIPTS)) return [];
	return readdirSync(SCRIPTS)
		.filter((name) => name.startsWith("check-") && name.endsWith(".mjs") && !name.endsWith(".test.mjs"))
		.map((name) => name.replace(/\.mjs$/, ""));
};

const packageJson = () => {
	try {
		return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
	} catch {
		return null;
	}
};

/** Expand `pnpm run <key>` references into the commands they execute. */
function expand(command, scripts, depth) {
	const run = /(?:^|&&\s*)pnpm run ([\w:.-]+)/g;
	let text = command;
	for (let level = 0; level < depth; level++) {
		let expanded = false;
		for (const match of text.matchAll(run)) {
			const target = scripts[match[1]];
			if (!target) continue;
			text = text.replace(match[0], target);
			expanded = true;
		}
		if (!expanded) break;
	}
	return text;
}

const guards = scriptFiles();
const pkg = packageJson();
const problems = [];
if (!pkg) {
	console.error("package.json is missing or unreadable at the repository root");
	process.exit(1);
}

const scripts = pkg.scripts ?? {};
const chain = expand(scripts.check ?? "", scripts, CHAIN_STEPS);

if (!scripts.check) {
	problems.push("package.json declares no `check` script, so nothing is gated");
}

/**
 * The retirement condition of a guard, read from the built-guards table.
 *
 * Rows are `| guard | judgement | red case | retires when |`. A row with fewer
 * than four cells has no condition, which is the failure this asserts against:
 * the guard arrived, and nothing says how it may ever leave.
 */
function retirementCondition(structure, guard) {
	const built = structure.includes("### 已建的")
		? structure.split("### 已建的")[1].split("### 未建的")[0]
		: structure;
	for (const line of built.split("\n")) {
		if (!line.trim().startsWith(`| \`${guard}\``)) continue;
		return line.split("|")[4]?.trim() ?? "";
	}
	return null;
}

for (const guard of guards) {
	if (!existsSync(join(SCRIPTS, `${guard}.test.mjs`))) {
		problems.push(`${guard}: no ${guard}.test.mjs — a guard without a red case is decoration`);
	}
	if (!chain.includes(`scripts/${guard}.mjs`)) {
		problems.push(`${guard}: not reachable from \`pnpm run check\`, so it never gates anything`);
	}
	const structure = existsSync(join(ROOT, "docs", "structure.md"))
		? readFileSync(join(ROOT, "docs", "structure.md"), "utf8")
		: "";
	const mentioned = structure.includes(guard);
	if (!mentioned) {
		problems.push(`${guard}: absent from docs/structure.md, so the inventory lies`);
		continue;
	}
	const retirement = retirementCondition(structure, guard);
	if (retirement === null) {
		problems.push(`${guard}: mentioned in docs/structure.md but has no row in the built-guards table`);
	} else if (retirement === "") {
		problems.push(`${guard}: its table row states no retirement condition, so it can only ever accrete`);
	}
}

// Every direct script invocation in the chain must point at a file that exists.
for (const match of chain.matchAll(/node\s+(scripts\/[\w.-]+\.mjs)/g)) {
	if (!existsSync(join(ROOT, match[1]))) {
		problems.push(`${match[1]}: invoked by the check chain but not present (dangling wiring)`);
	}
}

if (problems.length > 0) {
	for (const problem of problems) console.error(`gate registration: ${problem}`);
	console.error(`\n${problems.length} problem(s) across ${guards.length} guard(s).`);
	process.exit(1);
}

console.log(
	`${guards.length} guard(s) each have a red case, run in the check chain, appear in docs/structure.md, and name a retirement condition.`,
);
