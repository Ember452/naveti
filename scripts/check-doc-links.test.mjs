import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-doc-links.mjs", import.meta.url));

async function workspace(t, docs) {
	const root = await mkdtemp(join(tmpdir(), "pi-doc-links-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	await writeFile(join(root, "README.md"), "# root\n");
	for (const [path, content] of Object.entries(docs)) {
		const full = join(root, path);
		await mkdir(join(full, ".."), { recursive: true });
		await writeFile(full, content);
	}
	return root;
}

function run(root) {
	return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
}

test("accepts links that resolve, anchors, externals and placeholders", async (t) => {
	const root = await workspace(t, {
		"docs/a.md": [
			"[root](../README.md)",
			"[sibling](./b.md)",
			"[fragment](./b.md#section)",
			"[anchor](#top)",
			"[external](https://example.com/x)",
			"[placeholder](./features/<id>.md)",
			"[glob](../packages/*/README.md)",
			"[dir](../docs)",
		].join("\n"),
		"docs/b.md": "# b\n",
	});
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /resolve across/);
});

test("rejects a link to a file that is not there", async (t) => {
	const root = await workspace(t, { "docs/a.md": "[gone](./missing.md)\n" });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /broken reference {2}docs\/a\.md:1 → \.\/missing\.md/);
});

test("rejects a relative link that escapes to a missing file", async (t) => {
	const root = await workspace(t, { "docs/kernel/a.md": "[policy](../KERNEL.md)\n" });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /docs\/kernel\/a\.md:1/);
});

test("checks .agents notes too", async (t) => {
	const root = await workspace(t, { ".agents/notes/x.md": "[nope](./nope.md)\n" });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /\.agents\/notes\/x\.md:1/);
});

test("accepts a root-absolute link when the file exists", async (t) => {
	const root = await workspace(t, { "docs/a.md": "[root](/README.md)\n" });
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});

test("rejects a dead path inside a kernel package README's code span", async (t) => {
	const root = await workspace(t, {
		"packages/kernel/ai/README.md": "Update `../coding-agent/` and `src/cli/args.ts`:\n",
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /packages\/kernel\/ai\/README\.md:1 → `\.\.\/coding-agent\/` \(code span\)/);
	assert.match(result.stderr, /`src\/cli\/args\.ts` \(code span\)/);
});

test("accepts bare file names and placeholders in a kernel README code span", async (t) => {
	const root = await workspace(t, {
		"packages/kernel/ai/README.md": [
			"#### 5. Tests (`test/`)",
			"- `stream.test.ts` - streaming",
			"- `src/api/<api-id>.ts` - new api",
		].join("\n"),
	});
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});

test("does not apply the code-span rule outside kernel package READMEs", async (t) => {
	const root = await workspace(t, { "docs/x.md": "See `../nowhere/` for details.\n" });
	assert.equal(run(root).status, 0, "plans and examples may name paths that do not exist yet");
});

test("checks a markdown link inside a kernel package README too", async (t) => {
	const root = await workspace(t, { "packages/kernel/ai/README.md": "[gone](./missing.md)\n" });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /packages\/kernel\/ai\/README\.md:1/);
});

test("checks feature and app READMEs", async (t) => {
	const root = await workspace(t, {
		"packages/features/x/README.md": "[gone](./missing.md)\n",
		"apps/server/README.md": "[gone](./missing.md)\n",
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /packages\/features\/x\/README\.md:1/);
	assert.match(result.stderr, /apps\/server\/README\.md:1/);
});
