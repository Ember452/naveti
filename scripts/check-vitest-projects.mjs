#!/usr/bin/env node
/**
 * The root vitest config collects projects with a glob, and the failure mode is total:
 * vitest rejects any match that is not named like a config file, and it silently skips
 * a package whose config the glob does not reach.
 *
 * Both halves happened for real. Adding `packages/kernel/README.md` under the directory
 * glob `packages/kernel/*` refused to start all six projects, while `pnpm check` stayed
 * green because nothing else reads that file. A trailing slash does not help: vitest
 * still matches the file. The pattern now names the config file, and this guard holds
 * the invariant that the suite cannot report for itself: a project glob may only match
 * config files or package directories.
 *
 * It deliberately does NOT check "every package directory is collected". Measured on
 * this tree: removing a package's vitest.config.ts makes `run-tests.mjs` fail with
 * `FAIL mcp (exit 1)`, because the runner derives the project list from the manifests.
 * The hole is already covered, and a rule with no consumer is what this repository
 * spends its whole existence arguing against.
 */
import { existsSync, globSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const ROOT = process.env.NAVETI_CHECK_ROOT ? resolve(process.env.NAVETI_CHECK_ROOT) : process.cwd();
const CONFIG = join(ROOT, "vitest.config.ts");
const CONFIG_FILE = /^(?:vite|vitest)[^/]*\.config\.[cm]?[jt]s$/;

const patterns = (() => {
	if (!existsSync(CONFIG)) {
		console.error("Missing vitest.config.ts at the repository root");
		process.exit(1);
	}
	const match = /projects:\s*\[([^\]]*)\]/s.exec(readFileSync(CONFIG, "utf8"));
	if (!match) {
		console.error("vitest.config.ts declares no test.projects glob");
		process.exit(1);
	}
	return [...match[1].matchAll(/["']([^"']+)["']/g)].map((entry) => entry[1]);
})();

const failures = [];
let collected = 0;
let totalMatches = 0;

/** Normalize a path returned by glob or path.join to forward slashes. */
function posix(path) {
	return path.split(sep).join("/");
}

for (const pattern of patterns) {
	const matches = globSync(pattern, { cwd: ROOT });
	totalMatches += matches.length;
	if (matches.length === 0) {
		// A depth may legitimately have no package yet (depth 1 before the first
		// package under `packages/<name>` appears). Only the total has to be non-zero.
		console.log(`${pattern}: matched nothing; that depth has no package yet`);
		continue;
	}

	for (const match of matches) {
		const normalized = posix(match);
		const full = join(ROOT, match);
		const base = normalized.split("/").pop();
		if (statSync(full).isDirectory()) {
			if (!existsSync(join(full, "vitest.config.ts"))) {
				failures.push(`${normalized}: collected as a project but has no vitest.config.ts (its name would be missing)`);
				continue;
			}
			collected++;
			continue;
		}
		if (!CONFIG_FILE.test(base)) {
			failures.push(`${normalized}: a project glob may only match config files or directories; vitest refuses to start`);
			continue;
		}
		collected++;
	}
}

if (totalMatches === 0) {
	failures.push(`${patterns.join(", ")}: matched nothing, so no project runs`);
}

if (failures.length > 0) {
	for (const failure of failures) console.error(`vitest projects: ${failure}`);
	console.error(`\n${failures.length} problem(s) with the project glob.`);
	process.exit(1);
}

console.log(`Vitest collects ${collected} project(s) from ${patterns.length} glob(s).`);
