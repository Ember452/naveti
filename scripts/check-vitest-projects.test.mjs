import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-vitest-projects.mjs", import.meta.url));

/** A root with one package directory and one plain file next to it. */
async function workspace(t, pattern) {
	const root = await mkdtemp(join(tmpdir(), "pi-vitest-projects-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	await writeConfig(root, pattern ? `projects: ["${pattern}"],` : "");
	await mkdir(join(root, "packages/kernel/telemetry"), { recursive: true });
	await writeFile(join(root, "packages/kernel/telemetry/vitest.config.ts"), "export default { name: 'telemetry' };\n");
	await writeFile(join(root, "packages/kernel/telemetry/package.json"), '{"name":"@naveti/telemetry"}\n');
	await writeFile(join(root, "packages/kernel/README.md"), "# kernel\n");
	return root;
}

function writeConfig(root, projectsLine) {
	return writeFile(join(root, "vitest.config.ts"), `export default {\n\ttest: {\n\t\t${projectsLine}\n\t},\n};\n`);
}

async function addTest(root, packagePath) {
	await mkdir(join(root, packagePath, "test"), { recursive: true });
	await writeFile(
		join(root, packagePath, "package.json"),
		JSON.stringify({ name: `@naveti/${packagePath.split("/").pop()}` }),
	);
	await writeFile(join(root, packagePath, "test/example.test.ts"), "test('x', () => {});\n");
}

function run(root) {
	return spawnSync(process.execPath, [script], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, NAVETI_CHECK_ROOT: root },
	});
}

test("accepts a glob that names the per-package config", async (t) => {
	const root = await workspace(t, "packages/kernel/*/vitest.config.ts");
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /collects 1 project/);
});

test("rejects a directory glob that also matches a plain file", async (t) => {
	// The real incident: `packages/kernel/*` collected README.md and vitest refused
	// to start every project, while `pnpm check` stayed green.
	const root = await workspace(t, "packages/kernel/*");
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /packages\/kernel\/README\.md/);
	assert.match(result.stderr, /vitest refuses to start/);
});

test("rejects a collected directory that ships no vitest config", async (t) => {
	const root = await workspace(t, "packages/kernel/*");
	await rm(join(root, "packages/kernel/telemetry/vitest.config.ts"));
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /has no vitest\.config\.ts/);
});

test("rejects a glob that matches nothing", async (t) => {
	const root = await workspace(t, "packages/products/*/vitest.config.ts");
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /matched nothing/);
});

test("rejects a root config with no projects declaration", async (t) => {
	const root = await workspace(t, undefined);
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /declares no test\.projects glob/);
});

test("rejects a package with tests but no vitest config", async (t) => {
	const root = await workspace(t, "packages/kernel/*/vitest.config.ts");
	await addTest(root, "packages/contracts");
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /packages\/contracts: has tests but no vitest\.config\.ts/);
});

test("rejects a package whose vitest config is not collected", async (t) => {
	const root = await workspace(t, "packages/kernel/*/vitest.config.ts");
	await addTest(root, "packages/contracts");
	await writeFile(join(root, "packages/contracts/vitest.config.ts"), "export default { name: 'contracts' };\n");
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /packages\/contracts: vitest\.config\.ts is not collected/);
});

test("accepts a depth-1 package that ships tests and a collected config", async (t) => {
	const root = await workspace(t, "packages/*/vitest.config.ts");
	await addTest(root, "packages/contracts");
	await writeFile(join(root, "packages/contracts/vitest.config.ts"), "export default { name: 'contracts' };\n");
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});
