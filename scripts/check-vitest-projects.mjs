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
 * The guard also holds the second invariant: every workspace package that ships
 * tests must have a `vitest.config.ts`, and that config must be collected. An earlier
 * version claimed `run-tests.mjs` derived the project list from manifests; it did not
 * — the list was hardcoded. Now that the runner derives packages from disk and the
 * default run does not filter by name, this guard makes a missing config visible at
 * check time instead of at test time.
 */
import { existsSync, globSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { findWorkspacePackages } from "./package-workspaces.mjs";

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
const collectedConfigs = new Set();
const TEST_FILE = /\.(?:test|spec)\.(?:ts|tsx)$/;
const SKIPPED_TEST_DIRECTORIES = new Set(["dist", "node_modules"]);

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
			collectedConfigs.add(`${normalized}/vitest.config.ts`);
			collected++;
			continue;
		}
		if (!CONFIG_FILE.test(base)) {
			failures.push(`${normalized}: a project glob may only match config files or directories; vitest refuses to start`);
			continue;
		}
		collectedConfigs.add(normalized);
		collected++;
	}
}

function hasTests(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIPPED_TEST_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) continue;
			if (hasTests(join(directory, entry.name))) return true;
			continue;
		}
		if (TEST_FILE.test(entry.name)) return true;
	}
	return false;
}

for (const directory of findWorkspacePackages(join(ROOT, "packages"))) {
	if (!hasTests(directory)) continue;
	const name = relative(ROOT, directory).split(sep).join("/");
	if (!existsSync(join(directory, "vitest.config.ts"))) {
		failures.push(`${name}: has tests but no vitest.config.ts, so its tests never run`);
		continue;
	}
	if (!collectedConfigs.has(`${name}/vitest.config.ts`)) {
		failures.push(`${name}: vitest.config.ts is not collected by any projects glob`);
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
