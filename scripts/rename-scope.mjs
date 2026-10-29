#!/usr/bin/env node
/**
 * Rewrites the upstream package scope to `@naveti/*` inside the vendored packages.
 *
 * Structural layout, module sub-paths and exports maps are untouched: only the
 * scope prefix changes. `.md` files are skipped on purpose so the vendored
 * README and CHANGELOG keep pointing at upstream.
 *
 * Idempotent: a second run reports 0 replacements.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REPLACEMENTS, renameScope } from "./scope-rules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = join(ROOT, "packages");
const REPORT = join(ROOT, "docs", "migration", "rename-report.json");

const EXTENSIONS = new Set([".ts", ".mts", ".js", ".mjs", ".json"]);
const SKIP_DIRS = new Set(["node_modules", "dist"]);

/** Root configs that alias workspace packages and therefore carry the same scope. */
const ROOT_TARGETS = ["tsconfig.json", "vitest.base.ts", "scripts/check-entry-graphs.mjs"];

async function walk(dir, out) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			await walk(join(dir, entry.name), out);
			continue;
		}
		if (!entry.isFile()) continue;
		const dot = entry.name.lastIndexOf(".");
		if (dot === -1) continue;
		if (!EXTENSIONS.has(entry.name.slice(dot))) continue;
		out.push(join(dir, entry.name));
	}
	return out;
}

const files = [...(await walk(PACKAGES, [])), ...ROOT_TARGETS.map((path) => resolve(ROOT, path))];
const renamed = {};
let grandTotal = 0;

for (const file of files) {
	const text = await readFile(file, "utf8");
	const { text: next, total } = renameScope(text);
	if (next === text) continue;
	await writeFile(file, next);
	renamed[relative(ROOT, file).split("\\").join("/")] = total;
	grandTotal += total;
}

await mkdir(dirname(REPORT), { recursive: true });
// A zero-replacement run only proves idempotency; keep the migration-time record.
if (grandTotal > 0) {
	const report = {
		generatedAt: new Date().toISOString(),
		replacements: REPLACEMENTS.map(([from, to]) => ({ from, to })),
		total: grandTotal,
		files: renamed,
	};
	await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(`renamed ${grandTotal} occurrences across ${Object.keys(renamed).length} files`);
for (const [file, count] of Object.entries(renamed).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
	console.log(`  ${String(count).padStart(4)}  ${file}`);
}
