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
// Windows does not carry the executable bit through the filesystem, so record it
// in the index where git can see it.
try {
	execFileSync("git", ["update-index", "--chmod=+x", `${HOOKS}/pre-commit`, `${HOOKS}/pre-push`], {
		cwd: ROOT,
		stdio: "ignore",
	});
} catch {
	// Not fatal: git for Windows runs hooks through sh once the shebang is present.
}

console.log(`core.hooksPath=${HOOKS}`);
console.log("pre-commit: biome + pinned deps + relative imports + entry graphs + workspace + lockfile + test inventory");
console.log("pre-push:   pnpm check (adds tsc and the guard red-case suites)");
console.log("Bypass a hook with --no-verify only when you can say why in the commit body.");
