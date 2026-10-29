import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-ts-relative-imports.mjs", import.meta.url));

/**
 * The guard walks `process.cwd()`, so a fixture is just a directory with `.ts` files.
 * One case per rule direction: a relative `.js` specifier must fail, and the same
 * import written with `.ts` must not.
 */
async function workspace(t, files) {
	const root = await mkdtemp(join(tmpdir(), "pi-relative-imports-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	for (const [path, content] of Object.entries(files)) {
		const full = join(root, path);
		await mkdir(join(full, ".."), { recursive: true });
		await writeFile(full, content);
	}
	return root;
}

function run(root) {
	return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
}

test("accepts .ts specifiers and bare package specifiers", async (t) => {
	const root = await workspace(t, {
		"a.ts": 'import "./b.ts";\nimport { x } from "@naveti/durable";\nexport type { T } from "./b.ts";\n',
		"b.ts": "export type T = 1;\nexport const x = 1;\n",
	});
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});

test("rejects a relative .js specifier in a static import", async (t) => {
	const root = await workspace(t, { "a.ts": 'import "./b.js";\n', "b.ts": "export {};\n" });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /a\.ts:1:\d+: \.\/b\.js/);
});

test("rejects relative .js in re-exports, dynamic imports and import types", async (t) => {
	const root = await workspace(t, {
		"a.ts": 'export * from "./b.js";\nconst c = await import("./c.js");\ntype D = import("./d.js").T;\n',
		"b.ts": "export {};\n",
		"c.ts": "export {};\n",
		"d.ts": "export type T = 1;\n",
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /a\.ts:1:\d+: \.\/b\.js/);
	assert.match(result.stderr, /a\.ts:2:\d+: \.\/c\.js/);
	assert.match(result.stderr, /a\.ts:3:\d+: \.\/d\.js/);
});

test("ignores bare specifiers that end in .js", async (t) => {
	const root = await workspace(t, { "a.ts": 'import "some-package/dist/index.js";\n' });
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});
