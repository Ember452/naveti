import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SKIPPED_DIRECTORIES = new Set(["dist", "node_modules"]);
const WORKSPACE_DEPTH = 2;

/**
 * Recursively collect every directory with a package.json. Kept for fixtures that
 * intentionally exercise nested layouts; workspace membership uses
 * `findWorkspacePackages` so that examples and vendored sub-trees stay out.
 */
export function findPackageDirectories(root = "packages") {
	const packageDirectories = [];

	function visit(directory) {
		if (existsSync(join(directory, "package.json"))) {
			packageDirectories.push(directory);
		}

		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (!entry.isDirectory() || SKIPPED_DIRECTORIES.has(entry.name)) {
				continue;
			}
			visit(join(directory, entry.name));
		}
	}

	visit(root);
	return packageDirectories.sort();
}

/**
 * Workspace packages are directories with a package.json at depth 1 or 2 under
 * `packages/`: `packages/<name>` and `packages/<group>/<name>`. A package does not
 * contain nested packages, so the walk stops at the first manifest. This is the
 * single source used by tsconfig, biome, vitest, run-tests, entry-graphs and CI.
 */
export function findWorkspacePackages(root = "packages") {
	const packageDirectories = [];

	function visit(directory, depth) {
		if (depth > WORKSPACE_DEPTH) return;
		if (depth > 0 && existsSync(join(directory, "package.json"))) {
			packageDirectories.push(directory);
			return;
		}
		if (depth === WORKSPACE_DEPTH) return;

		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (!entry.isDirectory() || SKIPPED_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) {
				continue;
			}
			visit(join(directory, entry.name), depth + 1);
		}
	}

	visit(root, 0);
	return packageDirectories.sort();
}

export function readPackageManifest(directory) {
	return JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
}
