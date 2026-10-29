import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";
import { findPackageDirectories, findWorkspacePackages } from "./package-workspaces.mjs";

async function workspace(t) {
	const root = await mkdtemp(join(tmpdir(), "naveti-packages-"));
	t.after(() => rm(root, { recursive: true, force: true }));

	const write = async (path, manifest) => {
		await mkdir(join(root, path), { recursive: true });
		await writeFile(join(root, path, "package.json"), JSON.stringify(manifest));
	};

	await write("packages/kernel/one", { name: "@naveti/one" });
	await write("packages/contracts", { name: "@naveti/contracts" });
	await write("packages/kernel/codemode/examples/agent", { name: "example-agent" });
	return root;
}

function relativeDirectories(root, directories) {
	return directories.map((directory) => relative(root, directory).split("\\").join("/"));
}

test("findWorkspacePackages includes depth 1 and 2 but not deeper examples", async (t) => {
	const root = await workspace(t);
	assert.deepEqual(relativeDirectories(root, findWorkspacePackages(join(root, "packages"))), [
		"packages/contracts",
		"packages/kernel/one",
	]);
});

test("findWorkspacePackages stops at the first manifest", async (t) => {
	const root = await workspace(t);
	await mkdir(join(root, "packages/kernel/one/nested"), { recursive: true });
	await writeFile(join(root, "packages/kernel/one/nested/package.json"), "{}");

	assert.deepEqual(relativeDirectories(root, findWorkspacePackages(join(root, "packages"))), [
		"packages/contracts",
		"packages/kernel/one",
	]);
});

test("findPackageDirectories remains recursive for fixture layouts", async (t) => {
	const root = await workspace(t);
	assert.deepEqual(relativeDirectories(root, findPackageDirectories(join(root, "packages"))), [
		"packages/contracts",
		"packages/kernel/codemode/examples/agent",
		"packages/kernel/one",
	]);
});
