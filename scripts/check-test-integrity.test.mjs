import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-test-integrity.mjs", import.meta.url));

const twoTests = [
	'import { it } from "vitest";',
	'it("first", () => {});',
	'it("second", () => {});',
	"",
].join("\n");

const threeTests = [
	'import { it } from "vitest";',
	'it("first", () => {});',
	'it("second", () => {});',
	'it("third", () => {});',
	"",
].join("\n");

async function workspace(t, source = twoTests) {
	const root = await mkdtemp(join(tmpdir(), "pi-test-integrity-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	const directory = join(root, "packages", "example", "test");
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, "a.test.ts"), source);
	return { root, file: join(directory, "a.test.ts") };
}

function run(root, ...args) {
	return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
}

test("accepts a tree that matches its baseline", async (t) => {
	const { root } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /2 declarations/);
});

test("rejects a deleted test", async (t) => {
	const { root, file } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	await writeFile(file, 'import { it } from "vitest";\nit("first", () => {});\n');
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /tests 2 -> 1 \(a test disappeared\)/);
});

test("rejects a new .skip", async (t) => {
	const { root, file } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	await writeFile(file, `${twoTests}\nit.skip("third", () => {});\n`);
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /skips 0 -> 1 \(a test was hidden\)/);
});

test("rejects a new conditional skip", async (t) => {
	const { root, file } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	await writeFile(file, `${twoTests}\nit.skipIf(process.platform !== "linux")("third", () => {});\n`);
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /conditionalSkips 0 -> 1/);
});

test("rejects a runtime-skip wrapper", async (t) => {
	const { root, file } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	await writeFile(file, `${twoTests}\nitSymlinkFile("third", () => {});\n`);
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /helperSkips 0 -> 1/);
});

test("rejects .only without consulting the baseline", async (t) => {
	const { root, file } = await workspace(t);
	await writeFile(file, `${twoTests}\nit.only("third", () => {});\n`);
	const result = run(root, "--write");
	assert.equal(result.status, 0);
	const checked = run(root);
	assert.equal(checked.status, 1);
	assert.match(checked.stderr, /uses \.only/);
});

test("rejects describe.skip", async (t) => {
	const { root, file } = await workspace(t);
	const source = 'import { describe, it } from "vitest";\ndescribe.skip("block", () => {\n\tit("first", () => {});\n});\n';
	await writeFile(file, source);
	assert.equal(run(root, "--write").status, 0);
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /uses describe\.skip/);
});

test("accepts a new test file that the baseline never saw", async (t) => {
	const { root } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	const extra = join(root, "packages", "example", "test", "b.test.ts");
	await writeFile(extra, 'import { it } from "vitest";\nit("new", () => {});\n');
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});

test("rejects a test file deleted without updating the baseline", async (t) => {
	const { root, file } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	await unlink(file);
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /baseline entry has no file on disk/);
});

test("reports what changed when the baseline is regenerated", async (t) => {
	const { root, file } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	await writeFile(file, `${twoTests}\nit.skip("third", () => {});\n`);
	const result = run(root, "--write");
	assert.equal(result.status, 0);
	assert.match(result.stdout, /skips 0 -> 1/);
});

test("scans tests/ for .only", async (t) => {
	const { root } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	const directory = join(root, "tests", "golden");
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, "a.test.ts"), 'import { it } from "vitest";\nit.only("x", () => {});\n');
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /tests\/golden\/a\.test\.ts: uses \.only/);
});

test("requires a re-baseline when a loop becomes it.each", async (t) => {
	const { root, file } = await workspace(t);
	assert.equal(run(root, "--write").status, 0);
	await writeFile(file, 'import { it } from "vitest";\nit.each([[1], [2], [3]]) ("value %s", () => {});\n');
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /tests 2 -> 1 with a new \.each; run --write/);
	assert.equal(run(root, "--write").status, 0);
	const after = run(root);
	assert.equal(after.status, 0, after.stderr);
});

test("a new .each does not silence a larger deletion", async (t) => {
	const { root, file } = await workspace(t, threeTests);
	assert.equal(run(root, "--write").status, 0);
	await writeFile(file, 'import { it } from "vitest";\nit.each([[1]]) ("value %s", () => {});\n');
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /tests 3 -> 1 with a new \.each; run --write/);
});
