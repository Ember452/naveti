#!/usr/bin/env node
/**
 * Red cases for `check-kernel-divergence`.
 *
 * Two kinds of case live here. The behavioral ones (modify / add / remove /
 * restore) prove the guard refuses a kernel change no ledger names. The ledger
 * ones exist because the guard reads prose: an extension alternation that put
 * `js` before `json` silently truncated `*.json` to `*.js`, which un-excused the
 * generated provider catalogue the ledger already described. A guard that cannot
 * match the entry it was written for is green and broken at the same time, so
 * `.json` and `.tsx` are pinned both ways: matching, and *not* over-matching
 * (`.ts` must not excuse `.tsx`).
 *
 * `--write` has its own pair: it must refuse to absorb an edit no ledger names,
 * and it must absorb one that both ledgers were told about, ending green.
 *
 * Fixtures are built under `mkdtemp` and pointed at with `NAVETI_CHECK_ROOT`.
 * Hashes are computed the same way the guard does — LF-normalized, latin1
 * round-trip — so a formatting difference cannot masquerade as a pass.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "check-kernel-divergence.mjs");

/** Same digest the guard uses, so a pass here means a pass there. */
function sha(text) {
	return createHash("sha256").update(text.replace(/\r\n/g, "\n"), "latin1").digest("hex");
}

/** A throwaway tree containing only what the guard reads. */
function fixture({ baseline, files = {}, divergence = "", deviations = "" }) {
	const root = mkdtempSync(join(tmpdir(), "naveti-divergence-"));
	mkdirSync(join(root, "scripts"), { recursive: true });
	mkdirSync(join(root, "docs", "kernel"), { recursive: true });
	mkdirSync(join(root, "docs", "migration"), { recursive: true });
	if (baseline) writeFileSync(join(root, "scripts", "kernel-baseline.json"), JSON.stringify(baseline));
	for (const [rel, content] of Object.entries(files)) {
		const absolute = join(root, "packages", "kernel", "durable", ...rel.split("/"));
		mkdirSync(dirname(absolute), { recursive: true });
		writeFileSync(absolute, content);
	}
	writeFileSync(join(root, "docs", "kernel", "divergence.md"), divergence);
	writeFileSync(join(root, "docs", "migration", "deviations.md"), deviations);
	return root;
}

function run(root, args = []) {
	try {
		const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
			cwd: root,
			env: { ...process.env, NAVETI_CHECK_ROOT: root },
			encoding: "utf8",
			stdio: "pipe",
		});
		return { code: 0, stdout, stderr: "" };
	} catch (error) {
		return { code: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
	}
}

const baselineOf = (text) => ({ files: { durable: { "src/a.ts": sha(text) } } });

/** Runs `fn` against a fresh fixture and always cleans up. */
function withFixture(options, fn) {
	const root = fixture(options);
	try {
		return fn(root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

/** Stages paths in a throwaway repository so the pairing rule has an index to read. */
function stage(root, ...paths) {
	execFileSync("git", ["init", "--quiet"], { cwd: root, stdio: "ignore" });
	execFileSync("git", ["add", "--", ...paths], { cwd: root, stdio: "ignore" });
}

test("a tree that matches the baseline passes", () => {
	withFixture({ baseline: baselineOf("const a = 1;\n"), files: { "src/a.ts": "const a = 1;\n" } }, (root) => {
		const result = run(root);
		assert.equal(result.code, 0, result.stderr);
		assert.match(result.stdout, /0 recorded difference/);
	});
});

test("a CRLF checkout of unchanged content is not a divergence", () => {
	withFixture({ baseline: baselineOf("const a = 1;\n"), files: { "src/a.ts": "const a = 1;\r\n" } }, (root) => {
		assert.equal(run(root).code, 0, "the LF collapse must absorb a core.autocrlf checkout");
	});
});

test("a modified kernel file with no ledger entry fails, naming the file", () => {
	withFixture({ baseline: baselineOf("const a = 1;\n"), files: { "src/a.ts": "const a = 2;\n" } }, (root) => {
		const result = run(root);
		assert.equal(result.code, 1, "an unrecorded edit must gate");
		assert.match(result.stderr, /src\/a\.ts is modified/);
		assert.match(result.stderr, /unrecorded kernel difference/);
	});
});

test("the same edit passes once a ledger names it", () => {
	withFixture(
		{
			baseline: baselineOf("const a = 1;\n"),
			files: { "src/a.ts": "const a = 2;\n" },
			divergence: "## K1 — example\n\n- 文件：`packages/kernel/durable/src/a.ts`\n",
		},
		(root) => {
			const result = run(root);
			assert.equal(result.code, 0, result.stderr);
			assert.match(result.stdout, /1 recorded difference/);
		},
	);
});

test("a package-relative ledger path also records the file", () => {
	withFixture(
		{
			baseline: baselineOf("const a = 1;\n"),
			files: { "src/a.ts": "const a = 2;\n" },
			deviations: "- **What:** `durable/src/a.ts` was adjusted during migration.\n",
		},
		(root) => {
			assert.equal(run(root).code, 0, "migration entries predate the kernel/ grouping");
		},
	);
});

test("a ledger glob excuses every generated file it matches", () => {
	withFixture(
		{
			baseline: { files: { durable: { "data/a.json": sha('{"a":1}') } } },
			files: { "data/a.json": '{"a":2}' },
			deviations: "- **What:** `packages/kernel/durable/data/*.json` is generated.\n",
		},
		(root) => {
			assert.equal(run(root).code, 0, "a `*.json` glob must match a .json file, not be truncated to *.js");
		},
	);
});

test("a .tsx ledger entry excuses the .tsx file it names", () => {
	withFixture(
		{
			baseline: { files: { durable: { "client/Panel.tsx": sha("const a = 1;") } } },
			files: { "client/Panel.tsx": "const a = 2;" },
			divergence: "- 文件：`packages/kernel/durable/client/Panel.tsx`\n",
		},
		(root) => {
			assert.equal(run(root).code, 0, "a .tsx path must not be truncated to .ts");
		},
	);
});

test("a .ts entry does not excuse a .tsx file", () => {
	withFixture(
		{
			baseline: { files: { durable: { "x/Panel.tsx": sha("a") } } },
			files: { "x/Panel.tsx": "b" },
			divergence: "- 文件：`packages/kernel/durable/x/Panel.ts`\n",
		},
		(root) => {
			assert.equal(run(root).code, 1, "the boundary assertion must keep .ts from matching .tsx");
		},
	);
});

test("a new kernel file with no ledger entry fails as added", () => {
	withFixture(
		{
			baseline: baselineOf("const a = 1;\n"),
			files: { "src/a.ts": "const a = 1;\n", "src/b.ts": "export const b = 1;\n" },
		},
		(root) => {
			const result = run(root);
			assert.equal(result.code, 1);
			assert.match(result.stderr, /src\/b\.ts is added/);
		},
	);
});

test("an upstream file that reappears fails as restored, not as added", () => {
	withFixture(
		{
			baseline: { files: { durable: {} }, upstreamOnly: { durable: ["src/radius.ts"] } },
			files: { "src/radius.ts": "export const radius = 1;\n" },
		},
		(root) => {
			const result = run(root);
			assert.equal(result.code, 1);
			assert.match(result.stderr, /src\/radius\.ts is restored/);
		},
	);
});

test("a deleted kernel file with no ledger entry fails as removed", () => {
	withFixture(
		{
			baseline: { files: { durable: { "src/a.ts": sha("x"), "src/gone.ts": sha("y") } } },
			files: { "src/a.ts": "x" },
		},
		(root) => {
			const result = run(root);
			assert.equal(result.code, 1);
			assert.match(result.stderr, /src\/gone\.ts is removed/);
		},
	);
});

test("a localOnly entry the hash table does not contain fails as inconsistent", () => {
	withFixture(
		{
			baseline: { files: { durable: {} }, localOnly: { durable: ["src/ghost.ts"] } },
			files: {},
		},
		(root) => {
			const result = run(root);
			assert.equal(result.code, 1);
			assert.match(result.stderr, /localOnly lists src\/ghost\.ts/);
		},
	);
});

test("a missing baseline fails with the regeneration command", () => {
	withFixture({ files: {} }, (root) => {
		const result = run(root);
		assert.equal(result.code, 1);
		assert.match(result.stderr, /--write/);
	});
});

test("--write refuses to absorb an edit no ledger names", () => {
	withFixture({ baseline: baselineOf("const a = 1;\n"), files: { "src/a.ts": "const a = 2;\n" } }, (root) => {
		const result = run(root, ["--write"]);
		assert.equal(result.code, 1, "an unaudited re-baseline must not be possible");
		assert.match(result.stderr, /refusing to absorb unrecorded kernel changes/);
		assert.match(result.stderr, /modified durable\/src\/a\.ts/);
		assert.equal(
			readFileSync(join(root, "scripts", "kernel-baseline.json"), "utf8"),
			JSON.stringify(baselineOf("const a = 1;\n")),
			"the baseline must be left untouched when the audit fails",
		);
	});
});

test("a staged baseline without a staged ledger fails the pairing rule", () => {
	withFixture({ baseline: baselineOf("const a = 1;\n"), files: { "src/a.ts": "const a = 1;\n" } }, (root) => {
		stage(root, "scripts/kernel-baseline.json");
		const result = run(root);
		assert.equal(result.code, 1, "a baseline move with no staged ledger record must not commit");
		assert.match(result.stderr, /staged without a staged ledger change/);
	});
});

test("a staged baseline paired with a staged ledger passes", () => {
	withFixture({ baseline: baselineOf("const a = 1;\n"), files: { "src/a.ts": "const a = 1;\n" } }, (root) => {
		stage(root, "scripts/kernel-baseline.json", "docs/kernel/divergence.md");
		assert.equal(run(root).code, 0, "the pair is staged, so the move is reviewable");
	});
});

test("--write absorbs an edit both ledgers were told about, then passes", () => {
	withFixture(
		{
			baseline: baselineOf("const a = 1;\n"),
			files: { "src/a.ts": "const a = 2;\n" },
			divergence: "## K1 — example\n\n- 文件：`packages/kernel/durable/src/a.ts`\n",
		},
		(root) => {
			const absorb = run(root, ["--write"]);
			assert.equal(absorb.code, 0, absorb.stderr);
			assert.match(absorb.stdout, /absorbing 1 recorded difference/);
			assert.match(absorb.stdout, /modified durable\/src\/a\.ts/);

			const after = run(root);
			assert.equal(after.code, 0, "the absorbed edit is now the baseline, so the check passes");
			assert.match(after.stdout, /0 recorded difference/);
		},
	);
});
