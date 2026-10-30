import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-entry-graphs.mjs", import.meta.url));

/**
 * Entry points are cost contracts, and a cost contract needs a case where the cost is
 * exceeded — otherwise the budget is decoration. `NAVETI_CHECK_ROOT` points the guard
 * at a fixture that mirrors the repo layout, because the budgets are written in
 * repo-relative paths.
 */
const SOURCES = {
	"packages/kernel/ai/src/models.ts": "export const models = 1;\n",
	"packages/kernel/ai/src/utils/x.ts": 'import "./a.ts";\nimport "./b.ts";\n',
	"packages/kernel/ai/src/utils/a.ts": "export const a = 1;\n",
	"packages/kernel/ai/src/utils/b.ts": "export const b = 1;\n",
	"packages/kernel/ai/src/utils/c.ts": "export const c = 1;\n",
	"packages/kernel/ai/src/providers/all.ts": "export const all = 1;\n",
	"packages/kernel/codemode/src/index.ts": "export const index = 1;\n",
	"packages/kernel/codemode/src/portable.ts": "export const portable = 1;\n",
	"packages/kernel/codemode/src/cloudflare.ts": "export const cloudflare = 1;\n",
	"packages/kernel/durable/src/index.ts": 'import "../../ai/src/models.ts";\n',
	"packages/kernel/durable/src/tools/index.ts": "export const tools = 1;\n",
	"packages/kernel/durable/src/images/node.ts": "export const image = 1;\n",
};

const BUDGETS = {
	"_comment": "fixture",
	"packages/kernel/ai": {
		"./models": {
			"maxFiles": 20,
			"forbid": ["providers/", "models.generated.ts", "index.ts", "utils/validation.ts", "utils/typebox-helpers.ts"],
			"allow": ["packages/kernel/telemetry/src/index.ts"],
		},
		"./utils/*": { "maxFiles": 3, "forbid": ["providers/", "api/", "index.ts"] },
	},
	"packages/kernel/codemode": {
		".": { "maxFiles": 12, "forbid": ["codemode/src/cloudflare.ts"] },
		"./portable": {
			"maxFiles": 8,
			"forbid": ["codemode/src/index.ts", "runtime/host.ts", "runtime/worker.ts", "codemode/src/wasm.ts"],
		},
		"./cloudflare": {
			"maxFiles": 9,
			"forbid": ["codemode/src/index.ts", "runtime/host.ts", "runtime/worker.ts", "codemode/src/wasm.ts"],
		},
	},
	"packages/kernel/durable": {
		".": {
			"maxFiles": 78,
			"forbid": [
				"packages/kernel/ai/src/index.ts",
				"packages/kernel/ai/src/utils/typebox-helpers.ts",
				"packages/kernel/durable/src/images/",
			],
		},
		"./tools": { "maxFiles": 17, "forbid": ["packages/kernel/durable/src/images/"] },
	},
};

const MANIFESTS = {
	"packages/kernel/ai/package.json": {
		name: "@naveti/ai",
		exports: { "./models": { import: "./dist/models.js" }, "./utils/*": { import: "./dist/utils/*.js" } },
	},
	"packages/kernel/codemode/package.json": {
		name: "@naveti/codemode",
		exports: {
			".": { import: "./dist/index.js" },
			"./portable": { import: "./dist/portable.js" },
			"./cloudflare": { import: "./dist/cloudflare.js" },
		},
	},
	"packages/kernel/durable/package.json": {
		name: "@naveti/durable",
		exports: { ".": { import: "./dist/index.js" }, "./tools": { import: "./dist/tools/index.js" } },
	},
};

async function workspace(t, overrides = {}) {
	const root = await mkdtemp(join(tmpdir(), "pi-entry-graphs-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	const files = { ...MANIFESTS, ...SOURCES, "scripts/entry-budgets.json": BUDGETS, ...overrides };
	for (const [path, value] of Object.entries(files)) {
		const full = join(root, path);
		await mkdir(dirname(full), { recursive: true });
		await writeFile(full, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
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

test("accepts entries that stay inside their budget", async (t) => {
	const root = await workspace(t);
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /within budget/);
});

test("rejects an entry whose import graph grows past the budget", async (t) => {
	const root = await workspace(t, {
		// ./utils/x now reaches x + a + b + c = 4 files against a budget of 3.
		"packages/kernel/ai/src/utils/x.ts": 'import "./a.ts";\nimport "./b.ts";\nimport "./c.ts";\n',
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /utils\/x" reaches 4 files, budget 3/);
});

test("rejects an entry that reaches a forbidden module", async (t) => {
	const root = await workspace(t, {
		// The durable root entry must not pull in ai's root barrel.
		"packages/kernel/durable/src/index.ts": 'import "../../ai/src/index.ts";\n',
		"packages/kernel/ai/src/index.ts": "export const ai = 1;\n",
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /must not reach packages\/kernel\/ai\/src\/index\.ts/);
});

test("rejects a budget for an export the package no longer declares", async (t) => {
	const root = await workspace(t, {
		"packages/kernel/ai/package.json": {
			name: "@naveti/ai",
			exports: { "./utils/*": { import: "./dist/utils/*.js" } },
		},
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /declares no export "\.\/models" but a budget exists/);
});

// A product-layer entry nobody budgeted is the failure mode the facade exists to
// prevent: the facade can grow as wide as the barrel it replaced with no red case.
test("rejects a product-layer export with no budget", async (t) => {
	const root = await workspace(t, {
		"packages/contracts/package.json": {
			name: "@naveti/contracts",
			exports: { ".": { import: "./dist/index.js" }, "./package.json": "./package.json" },
		},
		"packages/contracts/src/index.ts": "export const chat = 1;\n",
	});
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /packages\/contracts export "\." has no entry in scripts\/entry-budgets\.json/);
	// A string export (a JSON file) is not code and needs no budget.
	assert.doesNotMatch(result.stderr, /"\.\/package\.json"/);
});

// The same rule for an app's entry: it is where a composition root could import the
// kernel directly without anyone measuring what that drags in.
test("rejects an app entry with no budget and accepts a covered one", async (t) => {
	const uncovered = await workspace(t, {
		"apps/server/package.json": { name: "@naveti/server", private: true, exports: { ".": { import: "./dist/main.js" } } },
		"apps/server/src/main.ts": "export const main = 1;\n",
	});
	const rejected = run(uncovered);
	assert.equal(rejected.status, 1);
	assert.match(rejected.stderr, /apps\/server export "\." has no entry in scripts\/entry-budgets\.json/);

	const covered = await workspace(t, {
		"apps/server/package.json": { name: "@naveti/server", private: true, exports: { ".": { import: "./dist/main.js" } } },
		"apps/server/src/main.ts": "export const main = 1;\n",
		"scripts/entry-budgets.json": { ...BUDGETS, "apps/server": { ".": { maxFiles: 3 } } },
	});
	const accepted = run(covered);
	assert.equal(accepted.status, 0, accepted.stderr);
});

test("--update rewrites kernel maxFiles and preserves forbid", async (t) => {
	const root = await workspace(t);
	const before = JSON.parse(readFileSync(join(root, "scripts/entry-budgets.json"), "utf8"));
	const result = spawnSync(process.execPath, [script, "--update"], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, NAVETI_CHECK_ROOT: root },
	});
	assert.equal(result.status, 0, result.stderr);
	const after = JSON.parse(readFileSync(join(root, "scripts/entry-budgets.json"), "utf8"));
	assert.equal(after["packages/kernel/ai"]["./utils/*"].maxFiles, 4);
	assert.deepEqual(after["packages/kernel/ai"]["./utils/*"].forbid, before["packages/kernel/ai"]["./utils/*"].forbid);
	assert.match(result.stdout, /maxFiles 3 -> 4/);
});

// A ceiling that follows the measurement records the present instead of constraining it:
// the next regression is measured, accepted, and written back. Product-layer widths are our
// decision, so `--update` reports them and leaves the number alone.
test("--update reports a product-layer measurement and leaves its ceiling alone", async (t) => {
	const root = await workspace(t, {
		"packages/contracts/package.json": {
			name: "@naveti/contracts",
			exports: { ".": { import: "./dist/index.js" } },
		},
		"packages/contracts/src/index.ts": 'import "./a.ts";\nimport "./b.ts";\n',
		"packages/contracts/src/a.ts": "export const a = 1;\n",
		"packages/contracts/src/b.ts": "export const b = 1;\n",
		"scripts/entry-budgets.json": {
			...BUDGETS,
			"packages/contracts": { ".": { maxFiles: 1 } },
		},
	});
	const result = spawnSync(process.execPath, [script, "--update"], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, NAVETI_CHECK_ROOT: root },
	});
	assert.equal(result.status, 0, result.stderr);
	const after = JSON.parse(readFileSync(join(root, "scripts/entry-budgets.json"), "utf8"));
	assert.equal(after["packages/contracts"]["."].maxFiles, 1, "the manual ceiling must not be rewritten");
	assert.match(result.stdout, /packages\/contracts \. measured 3 over its manual ceiling 1 \(not rewritten\)/);
});