#!/usr/bin/env node
/**
 * Points this clone at `.githooks/`.
 *
 * Deliberately not a `postinstall`: silently changing someone's commit behaviour is
 * the kind of side effect that makes a repository hostile. Run it once, or don't.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS = ".githooks";

if (!existsSync(join(ROOT, HOOKS, "pre-commit"))) {
	console.error(`Missing ${HOOKS}/pre-commit; the checkout may be partial.`);
	process.exit(1);
}

execFileSync("git", ["config", "core.hooksPath", HOOKS], { cwd: ROOT, stdio: "inherit" });

// Git only records the executable bit in the index, and only for tracked files. An
// untracked hook stays 100644 and would silently not run on Linux or macOS, where
// the bit is honoured.
let tracked = "";
try {
	tracked = execFileSync("git", ["ls-files", `${HOOKS}/pre-commit`], { cwd: ROOT, encoding: "utf8" }).trim();
} catch {
	tracked = "";
}

if (!tracked) {
	console.warn(`Note: ${HOOKS}/pre-commit is untracked, so its executable bit is not recorded yet.`);
	console.warn("Hooks still run locally, but a fresh clone on Linux or macOS would see mode 100644 and skip them.");
	console.warn(`After adding them, run: git update-index --chmod=+x ${HOOKS}/pre-commit ${HOOKS}/pre-push`);
} else {
	try {
		execFileSync("git", ["update-index", "--chmod=+x", `${HOOKS}/pre-commit`, `${HOOKS}/pre-push`], {
			cwd: ROOT,
			stdio: "ignore",
		});
	} catch {
		console.warn(`Could not record the executable bit for ${HOOKS}/*; run git update-index --chmod=+x manually.`);
	}
}

console.log(`core.hooksPath=${HOOKS}`);
console.log("pre-commit: biome + pinned deps + relative imports + entry graphs + workspace + lockfile + test inventory");
console.log("pre-push:   pnpm check (adds tsc and the guard red-case suites)");
console.log("Bypass a hook with --no-verify only when you can say why in the commit body.");
