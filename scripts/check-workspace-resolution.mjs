#!/usr/bin/env node
/**
 * Workspace resolution is a property of configuration, so it is checked, not generated.
 *
 * Generating `tsconfig` paths and vitest aliases makes "does the editor resolve
 * this" depend on having run a script. Instead the tree relies on three fixed
 * layers — pnpm's `node_modules` links, each package's `exports` map, and the
 * `source` condition — and this guard keeps those three honest:
 *
 *   1. Internal `@naveti/*` dependencies are `workspace:*`, never a version range.
 *   2. Every `exports` entry that resolves to code also declares `source`, and
 *      declares it first (conditions match in declaration order; a `source` after
 *      `import` never wins).
 *   3. `tsconfig.json` opts into the `source` condition and carries no `paths`.
 *   4. No vitest config re-introduces `@naveti/*` aliases.
 *
 * Run from the repository root. Exit 1 with one line per violation.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findWorkspacePackages } from "./package-workspaces.mjs";

const ROOT = process.cwd();
const INTERNAL_SCOPE = "@naveti/";
const DEPENDENCY_SECTIONS = ["dependencies", "devDependencies", "peerDependencies"];
/** `paths` is not a resolution mechanism here; an empty allowlist is the rule. */
const PATHS_ALLOWLIST = new Set([]);

const failures = [];
function fail(file, reason) {
	failures.push(`${file}: ${reason}`);
}

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function relative(path) {
	return path.slice(ROOT.length + 1).split("\\").join("/");
}

function checkInternalDependencies(directory, manifest) {
	for (const section of DEPENDENCY_SECTIONS) {
		for (const [name, specifier] of Object.entries(manifest[section] ?? {})) {
			if (!name.startsWith(INTERNAL_SCOPE)) continue;
			if (specifier === "workspace:*") continue;
			fail(relative(join(directory, "package.json")), `${section}.${name} must be "workspace:*", found "${specifier}"`);
		}
	}
}

function checkExports(directory, manifest) {
	const exportsField = manifest.exports;
	if (!exportsField || typeof exportsField !== "object") return;
	for (const [entry, value] of Object.entries(exportsField)) {
		if (!value || typeof value !== "object") continue;
		const keys = Object.keys(value);
		if (!keys.includes("types") && !keys.includes("import")) continue;
		if (!keys.includes("source")) {
			fail(relative(join(directory, "package.json")), `exports["${entry}"] resolves code but declares no "source" condition`);
			continue;
		}
		if (keys[0] !== "source") {
			fail(
				relative(join(directory, "package.json")),
				`exports["${entry}"] declares "source" after "${keys[0]}"; conditions match in order, so it never wins`,
			);
		}
	}
}

function checkRootTsconfig() {
	const path = join(ROOT, "tsconfig.json");
	if (!existsSync(path)) {
		fail("tsconfig.json", "missing");
		return;
	}
	const config = readJson(path);
	const options = config.compilerOptions ?? {};
	const conditions = options.customConditions ?? [];
	if (!Array.isArray(conditions) || !conditions.includes("source")) {
		fail("tsconfig.json", 'compilerOptions.customConditions must include "source"');
	}
	for (const key of Object.keys(options.paths ?? {})) {
		if (PATHS_ALLOWLIST.has(key)) continue;
		fail("tsconfig.json", `compilerOptions.paths["${key}"] is not allowed; module resolution comes from exports plus the source condition`);
	}
}

function collectVitestConfigs(directory, out) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		// `.upstream` is a gitignored mirror of upstream sources, and `test-workers`
		// is a separate workerd lane with its own resolution needs.
		if (entry.name === "node_modules" || entry.name === "dist") continue;
		if (entry.name === "test-workers" || entry.name.startsWith(".")) continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			collectVitestConfigs(path, out);
			continue;
		}
		if (/^vitest.*\.config\.ts$/.test(entry.name)) out.push(path);
	}
	return out;
}

function checkVitestConfigs(configs) {
	for (const path of configs) {
		const text = readFileSync(path, "utf8");
		if (/alias\s*:/i.test(text) && /@naveti/i.test(text)) {
			fail(relative(path), `declares a ${INTERNAL_SCOPE} alias; the source condition already resolves workspace packages`);
		}
	}
}

const packages = findWorkspacePackages(join(ROOT, "packages"));
for (const directory of packages) {
	const manifestPath = join(directory, "package.json");
	if (!existsSync(manifestPath)) continue;
	const manifest = readJson(manifestPath);
	checkInternalDependencies(directory, manifest);
	checkExports(directory, manifest);
}

checkRootTsconfig();
checkVitestConfigs(collectVitestConfigs(ROOT, []));

if (failures.length > 0) {
	for (const line of failures) console.error(line);
	console.error(`\n${failures.length} workspace-resolution violation(s).`);
	process.exit(1);
}

console.log(`Workspace resolution is consistent across ${packages.length} package(s).`);
