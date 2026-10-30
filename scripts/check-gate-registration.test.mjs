import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-gate-registration.mjs", import.meta.url));

/**
 * A repository whose single guard is wired everywhere, then perturbed one
 * registration at a time. Each perturbation is a mistake that used to be silent.
 */
async function workspace(
	t,
	{ withTest = true, inChain = true, inDocs = true, chainExtra = "", retiresWhen = "the feature it guards is removed" } = {},
) {
	const root = await mkdtemp(join(tmpdir(), "naveti-gate-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	await mkdir(join(root, "scripts"), { recursive: true });
	await mkdir(join(root, "docs"), { recursive: true });
	const chain = [
		"node scripts/biome-check.mjs --write",
		inChain ? "node scripts/check-something.mjs" : "node scripts/noop.mjs",
		chainExtra,
	]
		.filter(Boolean)
		.join(" && ");
	await writeFile(
		join(root, "package.json"),
		JSON.stringify({ scripts: { check: chain, noop: "node scripts/noop.mjs" } }, null, 2),
	);
	await writeFile(join(root, "scripts/check-something.mjs"), "console.log('ok');\n");
	if (withTest) await writeFile(join(root, "scripts/check-something.test.mjs"), "// red cases\n");
	await writeFile(join(root, "scripts/noop.mjs"), "// exists\n");
	await writeFile(join(root, "scripts/biome-check.mjs"), "// exists\n");
	await writeFile(
		join(root, "docs/structure.md"),
		inDocs
			? "# guards\n\n| Guard | Judgement | Red case | Retires when |\n| --- | --- | --- | --- |\n" +
					`| \`check-something\` | does a thing | yes | ${retiresWhen} |\n`
			: "# guards\n\nnothing listed\n",
	);
	return root;
}

function run(root) {
	return spawnSync(process.execPath, [script], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, NAVETI_CHECK_ROOT: root },
	});
}

test("accepts a fully registered guard", async (t) => {
	const result = run(await workspace(t));
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /1 guard\(s\)/);
});

test("rejects a guard with no red case", async (t) => {
	const result = run(await workspace(t, { withTest: false }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /check-something: no check-something\.test\.mjs/);
});

test("rejects a guard that never runs", async (t) => {
	const result = run(await workspace(t, { inChain: false }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /not reachable from `pnpm run check`/);
});

test("rejects a guard missing from the inventory document", async (t) => {
	const result = run(await workspace(t, { inDocs: false }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /absent from docs\/structure\.md/);
});

test("rejects a guard whose row names no retirement condition", async (t) => {
	const result = run(await workspace(t, { retiresWhen: "" }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /states no retirement condition/);
});

test("rejects a chain step pointing at a file that is not there", async (t) => {
	const result = run(await workspace(t, { chainExtra: "node scripts/check-gone.mjs" }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /dangling wiring/);
});

test("follows an aliased `pnpm run` key into the chain", async (t) => {
	const root = await workspace(t, { inChain: false });
	const pkg = join(root, "package.json");
	const body = JSON.parse(readFileSync(pkg, "utf8"));
	body.scripts["check:something"] = "node scripts/check-something.mjs";
	body.scripts.check = "node scripts/biome-check.mjs && pnpm run check:something";
	await writeFile(pkg, JSON.stringify(body, null, 2));
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});
