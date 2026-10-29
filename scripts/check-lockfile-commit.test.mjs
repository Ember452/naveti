import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-lockfile-commit.mjs", import.meta.url));

const baseManifest = {
	name: "example",
	private: true,
	dependencies: { left: "1.0.0" },
};
const baseLock = "lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      left:\n        specifier: 1.0.0\n";

function git(cwd, args) {
	return execFileSync(
		"git",
		["-c", "user.email=test@example.com", "-c", "user.name=test", "-c", "commit.gpgsign=false", ...args],
		{ cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
	);
}

async function repository(t, { manifest = baseManifest, lock = baseLock } = {}) {
	const root = await mkdtemp(join(tmpdir(), "pi-lockfile-commit-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	git(root, ["init", "--quiet"]);
	await writeFile(join(root, "package.json"), JSON.stringify(manifest, null, 2));
	await writeFile(join(root, "pnpm-lock.yaml"), lock);
	git(root, ["add", "-A"]);
	git(root, ["commit", "--quiet", "-m", "initial"]);
	return root;
}

function gitCommit(cwd, message) {
	git(cwd, ["add", "-A"]);
	git(cwd, ["commit", "--quiet", "-m", message]);
}

function run(root, env = {}) {
	return spawnSync(process.execPath, [script], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, NAVETI_ALLOW_LOCKFILE_CHANGE: "", ...env },
	});
}

test("accepts a repository whose manifests and lockfile are untouched", async (t) => {
	const root = await repository(t);
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Lockfile and manifests are consistent/);
});

test("rejects a dependency change with no lockfile change", async (t) => {
	const root = await repository(t);
	await writeFile(
		join(root, "package.json"),
		JSON.stringify({ ...baseManifest, dependencies: { left: "1.0.0", right: "2.0.0" } }, null, 2),
	);
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /dependency sections changed in package\.json but pnpm-lock\.yaml did not/);
});

test("rejects a lockfile change with no dependency change", async (t) => {
	const root = await repository(t);
	await writeFile(join(root, "pnpm-lock.yaml"), `${baseLock}      left@1.0.1: {}\n`);
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /changed without a dependency change/);
});

test("accepts a dependency change that also refreshes the lockfile", async (t) => {
	const root = await repository(t);
	await writeFile(
		join(root, "package.json"),
		JSON.stringify({ ...baseManifest, dependencies: { left: "1.0.0", right: "2.0.0" } }, null, 2),
	);
	await writeFile(join(root, "pnpm-lock.yaml"), `${baseLock}      right:\n        specifier: 2.0.0\n`);
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});

test("ignores script-only manifest edits", async (t) => {
	const root = await repository(t);
	await writeFile(join(root, "package.json"), JSON.stringify({ ...baseManifest, scripts: { test: "true" } }, null, 2));
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});

test("allows an intentional resolution change through the escape hatch", async (t) => {
	const root = await repository(t);
	await writeFile(join(root, "pnpm-lock.yaml"), `${baseLock}      left@1.0.1: {}\n`);
	const result = run(root, { NAVETI_ALLOW_LOCKFILE_CHANGE: "1" });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /NAVETI_ALLOW_LOCKFILE_CHANGE set, ignoring/);
});

test("counts a pnpm-workspace overrides change as a dependency change", async (t) => {
	const root = await repository(t);
	await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n\noverrides:\n  openai>undici: ^7.30.1\n");
	await writeFile(join(root, "pnpm-lock.yaml"), `${baseLock}      undici@7.30.1: {}\n`);
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /consistent/);
});

test("still rejects a lockfile change when overrides are untouched", async (t) => {
	const root = await repository(t);
	await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
	await gitCommit(root, "workspace file committed");
	await writeFile(join(root, "pnpm-lock.yaml"), `${baseLock}      left@1.0.2: {}\n`);
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /or in pnpm-workspace\.yaml overrides/);
});
