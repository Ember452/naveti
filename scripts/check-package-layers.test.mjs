import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-package-layers.mjs", import.meta.url));

/**
 * Each case below is one direction structure.md §5 states. Without a red case a direction is
 * a sentence, and the failure it prevents (a feature reaching into the kernel) passes a type
 * check and a build.
 */
const MANIFESTS = {
	"packages/kernel/chord/package.json": { name: "@naveti/chord", dependencies: { "@naveti/telemetry": "workspace:*" } },
	"packages/kernel/telemetry/package.json": { name: "@naveti/telemetry" },
	"packages/kernel/durable/package.json": { name: "@naveti/durable", dependencies: { "@naveti/chord": "workspace:*" } },
	"packages/contracts/package.json": { name: "@naveti/contracts", dependencies: { "@naveti/chord": "workspace:*" } },
	"packages/platform/host/package.json": {
		name: "@naveti/host",
		dependencies: { "@naveti/chord": "workspace:*", "@naveti/contracts": "workspace:*" },
	},
	"packages/platform/web/package.json": { name: "@naveti/web", peerDependencies: { "@naveti/contracts": "workspace:*" } },
	"packages/features/chat/package.json": {
		name: "@naveti/feature-chat",
		dependencies: { "@naveti/contracts": "workspace:*" },
		peerDependencies: { "@naveti/host": "workspace:*", "@naveti/web": "workspace:*" },
	},
	"apps/server/package.json": {
		name: "@naveti/server",
		dependencies: { "@naveti/host": "workspace:*", "@naveti/feature-chat": "workspace:*" },
	},
};

async function workspace(t, overrides = {}) {
	const root = await mkdtemp(join(tmpdir(), "naveti-package-layers-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	for (const [path, value] of Object.entries({ ...MANIFESTS, ...overrides })) {
		const full = join(root, path);
		await mkdir(dirname(full), { recursive: true });
		await writeFile(full, `${JSON.stringify(value, null, "\t")}\n`);
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

test("accepts the documented directions", async (t) => {
	const root = await workspace(t);
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /point the documented way/);
});

test("rejects a kernel package that depends on the product layer", async (t) => {
	const root = await workspace(t, {
		"packages/kernel/chord/package.json": { name: "@naveti/chord", dependencies: { "@naveti/contracts": "workspace:*" } },
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /packages\/kernel\/chord\/package\.json: dependencies\.@naveti\/contracts is contracts-layer/);
});

test("rejects a feature that depends on a kernel package", async (t) => {
	const root = await workspace(t, {
		"packages/features/chat/package.json": {
			name: "@naveti/feature-chat",
			dependencies: { "@naveti/durable": "workspace:*" },
		},
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /a feature reaches the kernel only through @naveti\/host\/extend/);
});

test("rejects a contract that depends on the platform", async (t) => {
	const root = await workspace(t, {
		"packages/contracts/package.json": { name: "@naveti/contracts", dependencies: { "@naveti/host": "workspace:*" } },
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /a contract may depend only on the kernel's declaration layer/);
});

test("rejects the platform depending on a feature", async (t) => {
	const root = await workspace(t, {
		"packages/platform/host/package.json": {
			name: "@naveti/host",
			peerDependencies: { "@naveti/feature-chat": "workspace:*" },
		},
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /the platform does not import features/);
});

test("an app may depend on anything it composes", async (t) => {
	const root = await workspace(t, {
		"apps/server/package.json": {
			name: "@naveti/server",
			dependencies: { "@naveti/host": "workspace:*", "@naveti/durable": "workspace:*", "@naveti/feature-chat": "workspace:*" },
		},
	});
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});
