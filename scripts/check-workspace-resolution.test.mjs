import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-workspace-resolution.mjs", import.meta.url));

const validTsconfig = { compilerOptions: { customConditions: ["source"] } };
const validManifest = {
	name: "@naveti/example",
	dependencies: { "@naveti/other": "workspace:*" },
	exports: {
		".": { source: "./src/index.ts", types: "./dist/index.d.ts", import: "./dist/index.js" },
		"./manifest": "./manifest.json",
	},
};

async function workspace(t, { tsconfig = validTsconfig, manifest = validManifest, vitestConfig } = {}) {
	const root = await mkdtemp(join(tmpdir(), "pi-workspace-resolution-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	await writeFile(join(root, "package.json"), JSON.stringify({ name: "root", private: true }));
	await writeFile(join(root, "tsconfig.json"), JSON.stringify(tsconfig));
	const pkg = join(root, "packages", "example");
	await mkdir(pkg, { recursive: true });
	await writeFile(join(pkg, "package.json"), JSON.stringify(manifest));
	if (vitestConfig !== undefined) await writeFile(join(pkg, "vitest.config.ts"), vitestConfig);
	return root;
}

function run(root) {
	return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
}

test("accepts a workspace that relies on exports plus the source condition", async (t) => {
	const root = await workspace(t);
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Workspace resolution is consistent/);
});

test("rejects an internal dependency pinned to a version instead of workspace:*", async (t) => {
	const root = await workspace(t, {
		manifest: { ...validManifest, dependencies: { "@naveti/other": "0.0.1" } },
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /dependencies\.@naveti\/other must be "workspace:\*", found "0\.0\.1"/);
});

test("rejects an export that resolves code without a source condition", async (t) => {
	const root = await workspace(t, {
		manifest: {
			...validManifest,
			exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } },
		},
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /declares no "source" condition/);
});

test("rejects a source condition declared after import", async (t) => {
	const root = await workspace(t, {
		manifest: {
			...validManifest,
			exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js", source: "./src/index.ts" } },
		},
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /declares "source" after "types"/);
});

test("rejects tsconfig paths", async (t) => {
	const root = await workspace(t, {
		tsconfig: { compilerOptions: { customConditions: ["source"], paths: { "@naveti/other": ["./packages/other/src"] } } },
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /paths\["@naveti\/other"\] is not allowed/);
});

test("rejects a tsconfig that does not opt into the source condition", async (t) => {
	const root = await workspace(t, { tsconfig: { compilerOptions: {} } });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /customConditions must include "source"/);
});

test("rejects a vitest config that re-introduces a workspace alias", async (t) => {
	const root = await workspace(t, {
		vitestConfig: [
			'import { defineConfig } from "vitest/config";',
			"export default defineConfig({",
			'\tresolve: { alias: [{ find: /^@naveti\\/other$/, replacement: "../other/src/index.ts" }] },',
			"});",
			"",
		].join("\n"),
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /declares a @naveti\/ alias/);
});
