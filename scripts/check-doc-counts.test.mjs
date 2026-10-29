import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-doc-counts.mjs", import.meta.url));

async function workspace(t, files) {
	const root = await mkdtemp(join(tmpdir(), "pi-doc-counts-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	for (const [path, content] of Object.entries(files)) {
		const full = join(root, path);
		await mkdir(dirname(full), { recursive: true });
		await writeFile(full, content);
	}
	return root;
}

function run(root) {
	return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
}

test("accepts rule documents that name the command instead of the number", async (t) => {
	const root = await workspace(t, {
		"README.md": "# x\n\n一个功能一个包，删功能 = 删目录 + 一行登记。\n",
		"docs/structure.md": "清单用 `ls scripts/` 看，不在这里数个数。\n",
	});
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /no inventory counts/);
});

test("rejects an inventory count in a rule document", async (t) => {
	const root = await workspace(t, { "docs/structure.md": "现有五条守卫，覆盖依赖与图。\n" });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /docs\/structure\.md:1/);
});

test("rejects a counted noun phrase", async (t) => {
	const root = await workspace(t, { "docs/structure.md": "scripts/ 18 个脚本 + 6 个测试文件。\n" });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /18 个脚本/);
});

test("rejects the retired 待建 marker", async (t) => {
	const root = await workspace(t, { "docs/structure.md": "├── apps/ [待建] 组合根\n" });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /\[待建\]/);
});

test("leaves docs/migration alone: counting is its job", async (t) => {
	const root = await workspace(t, { "docs/migration/baseline.md": "现有 6 条门禁，18 个脚本，全绿。\n" });
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});

test("leaves decision notes alone: they record the past, which cannot drift", async (t) => {
	const root = await workspace(t, { ".agents/notes/implemented/x.md": "当时 64 项守卫测试全绿。\n" });
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});

test("still checks skills: they state rules", async (t) => {
	const root = await workspace(t, { ".agents/skills/x/SKILL.md": "现有七条守卫。\n" });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /\.agents\/skills\/x\/SKILL\.md:1/);
});
