import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-client-face.mjs", import.meta.url));

/**
 * Each case is a way a browser build could reach something the browser does not have. The green case includes the
 * two imports that must stay allowed: a type-only `@naveti/host` (erased) and `@naveti/web` (the intended path).
 */
const MANIFEST = {
	name: "@naveti/feature-demo",
	private: true,
	exports: {
		".": { source: "./src/host/index.ts" },
		"./client": { source: "./src/client/index.ts" },
	},
};

const SOURCES = {
	"packages/features/demo/src/host/index.ts": "export const hostThing = 1;\n",
	"packages/features/demo/src/client/panel.tsx": 'import { useAsync } from "@naveti/web";\nexport const panel = useAsync;\n',
};

async function workspace(t, overrides = {}) {
	const root = await mkdtemp(join(tmpdir(), "naveti-client-face-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	const files = {
		"packages/features/demo/package.json": MANIFEST,
		"packages/features/demo/src/client/index.ts":
			'import type { Host } from "@naveti/host";\nimport { panel } from "./panel.tsx";\nexport const register = (host: Host) => [panel, host];\n',
		...SOURCES,
		...overrides,
	};
	for (const [path, value] of Object.entries(files)) {
		const full = join(root, path);
		await mkdir(dirname(full), { recursive: true });
		await writeFile(full, typeof value === "string" ? value : `${JSON.stringify(value, null, "\t")}\n`);
	}
	return root;
}

function run(root) {
	return spawnSync(process.execPath, [script], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, NAVETI_CHECK_ROOT: root },
	});
}

test("accepts a client that reaches only @naveti/web and its own files", async (t) => {
	const root = await workspace(t);
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /no Node builtins and no host code/);
});

test("rejects a client that imports a Node builtin", async (t) => {
	const root = await workspace(t, {
		"packages/features/demo/src/client/panel.tsx": 'import { readFile } from "node:fs";\nexport const panel = readFile;\n',
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /imports node:fs; a client face runs in a browser with no Node builtins/);
});

test("rejects a client that imports the host package", async (t) => {
	const root = await workspace(t, {
		"packages/features/demo/src/client/index.ts":
			'import { openHost } from "@naveti/host";\nexport const register = openHost;\n',
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /imports @naveti\/host; a client reaches the host only through a wire contract/);
});

test("rejects a client that imports its own host face", async (t) => {
	const root = await workspace(t, {
		"packages/features/demo/src/client/index.ts":
			'import { hostThing } from "../host/index.ts";\nexport const register = hostThing;\n',
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /a client face does not import its own host face/);
});

test("follows relative files inside the client face", async (t) => {
	const root = await workspace(t, {
		// The violation is one hop away: the walk has to follow it, not just read the entry file.
		"packages/features/demo/src/client/panel.tsx": 'import "../host/deep.ts";\nexport const panel = 1;\n',
		"packages/features/demo/src/host/deep.ts": "export const deep = 1;\n",
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /packages\/features\/demo\/src\/client\/panel\.tsx: imports \.\.\/host\/deep\.ts/);
});

test("skips a feature with no client face", async (t) => {
	const root = await workspace(t, {
		"packages/features/demo/package.json": {
			name: "@naveti/feature-demo",
			private: true,
			exports: { ".": { source: "./src/host/index.ts" } },
		},
	});
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /0 feature\(s\)/);
});
