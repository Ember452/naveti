import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-feature-registry.mjs", import.meta.url));

const SEATS = [
	'export const HOST_SEATS = ["tool", "section", "doc", "extension"] as const;',
	'export const CLIENT_SEATS = ["panel", "renderer"] as const;',
	"",
].join("\n");

const SERVER = 'export const compose = [{ id: "demo", host: () => import("@naveti/feature-demo") }];\n';
const WEB = 'export const compose = [{ id: "demo", client: () => import("@naveti/feature-demo/client") }];\n';

function manifest(overrides = {}) {
	return {
		id: "demo",
		contract: 1,
		seats: { host: ["doc"], client: ["panel"] },
		requires: [],
		provides: [],
		...overrides,
	};
}

function packageJson(withClientFace = true) {
	const exports = { ".": { source: "./src/host/index.ts" } };
	if (withClientFace) exports["./client"] = { source: "./src/client/index.ts" };
	return { name: "@naveti/feature-demo", private: true, exports };
}

/** The minimum a workspace needs for this guard: the seat declaration, one feature, two compose lists. */
async function workspace(t, files = {}) {
	const root = await mkdtemp(join(tmpdir(), "naveti-registry-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	const all = {
		"packages/platform/host/src/seats.ts": SEATS,
		"packages/features/demo/package.json": packageJson(),
		"packages/features/demo/naveti.feature.json": manifest(),
		"apps/server/src/compose.ts": SERVER,
		"apps/web/src/compose.ts": WEB,
		...files,
	};
	for (const [path, value] of Object.entries(all)) {
		if (value === undefined) continue;
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

test("accepts a feature that agrees with its manifest and both compose lists", async (t) => {
	const result = run(await workspace(t));
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Feature registry agrees/);
});

test("rejects a feature directory with no manifest", async (t) => {
	const result = run(await workspace(t, { "packages/features/demo/naveti.feature.json": undefined }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /no naveti\.feature\.json/);
});

test("rejects a manifest whose id does not match its directory", async (t) => {
	const result = run(await workspace(t, { "packages/features/demo/naveti.feature.json": manifest({ id: "chat" }) }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /id "chat" does not match the directory "demo"/);
});

test("rejects a seat outside the closed set", async (t) => {
	// The exact shape the docs got wrong: a feature claims `hook`, which the platform has no attach point for.
	const result = run(
		await workspace(t, {
			"packages/features/demo/naveti.feature.json": manifest({ seats: { host: ["doc", "hook"], client: ["panel"] } }),
		}),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /host seat "hook" is outside the closed set/);
});

test("rejects a feature nobody installs", async (t) => {
	const result = run(await workspace(t, { "apps/server/src/compose.ts": "export const compose = [];\n" }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /does not install "demo", but packages\/features\/demo exists/);
});

test("rejects a compose entry with no feature behind it", async (t) => {
	const result = run(
		await workspace(t, {
			"apps/server/src/compose.ts": `${SERVER.trimEnd().replace("]", ', { id: "memory", host: () => import("@naveti/feature-memory") }]')}\n`,
		}),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /lists "memory", which is not a feature directory/);
});

test("rejects a client face that is installed but never mounted", async (t) => {
	const result = run(await workspace(t, { "apps/web/src/compose.ts": "export const compose = [];\n" }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /omits "demo", which exports \.\/client/);
});

test("rejects a web entry whose feature has no client face", async (t) => {
	const result = run(await workspace(t, { "packages/features/demo/package.json": packageJson(false) }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /renders "demo", which exports no \.\/client/);
});

test("rejects a web entry the host does not install", async (t) => {
	// A UI for something the server never loads: the web list has to be a subset of the host list, not equal to it.
	const result = run(
		await workspace(t, {
			"packages/features/ghost/package.json": packageJson(),
			"packages/features/ghost/naveti.feature.json": manifest({ id: "ghost" }),
			"apps/server/src/compose.ts": SERVER,
			"apps/web/src/compose.ts": `${WEB.trimEnd().replace("]", ', { id: "ghost", client: () => import("@naveti/feature-ghost/client") }]')}\n`,
		}),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /renders "ghost", which the server does not install/);
});

test("rejects a requires naming a feature that is not installed", async (t) => {
	const result = run(
		await workspace(t, { "packages/features/demo/naveti.feature.json": manifest({ requires: ["memory"] }) }),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /requires "memory", which is not an installed feature/);
});

test("accepts a headless feature: host face only, no client entry", async (t) => {
	const result = run(
		await workspace(t, {
			"packages/features/ghost/package.json": packageJson(false),
			"packages/features/ghost/naveti.feature.json": manifest({ id: "ghost", seats: { host: ["doc"], client: [] } }),
			"apps/server/src/compose.ts": `${SERVER.trimEnd().replace("]", ', { id: "ghost", host: () => import("@naveti/feature-ghost") }]')}\n`,
		}),
	);
	assert.equal(result.status, 0, result.stderr);
});
