import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./deps-audit.mjs", import.meta.url));

const advisory = ({ id = "GHSA-test-0001", severity = "high", module = "widget", dev = false } = {}) => ({
	[id]: {
		id: 1,
		github_advisory_id: id,
		module_name: module,
		severity,
		title: `${module} does a bad thing`,
		vulnerable_versions: "<2.0.0",
		patched_versions: ">=2.0.0",
		url: `https://github.com/advisories/${id}`,
		findings: [{ version: "1.0.0", dev, optional: false, bundled: false, paths: ["root>widget"] }],
	},
});

async function run(t, advisories, accept) {
	const dir = await mkdtemp(join(tmpdir(), "naveti-audit-"));
	t.after(() => rm(dir, { recursive: true, force: true }));
	const report = join(dir, "report.json");
	await writeFile(
		report,
		JSON.stringify({
			advisories,
			metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 }, totalDependencies: 10 },
		}),
	);
	const acceptFile = join(dir, "accept.json");
	await writeFile(acceptFile, JSON.stringify(accept ?? {}));
	return spawnSync(process.execPath, [script], {
		cwd: dir,
		encoding: "utf8",
		env: { ...process.env, NAVETI_AUDIT_REPORT: report, NAVETI_AUDIT_ACCEPT: acceptFile },
	});
}

test("passes when nothing is reported", async (t) => {
	const result = await run(t, {});
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /No unaccepted advisories/);
});

test("fails on an unaccepted high advisory and shows how it is reached", async (t) => {
	const result = await run(t, advisory());
	assert.equal(result.status, 1);
	assert.match(result.stderr, /widget <2\.0\.0 \[high\]/);
	assert.match(result.stderr, /reached via: root > widget/);
	assert.match(result.stderr, /fixed in: >=2\.0\.0/);
});

test("accepts an advisory only when the named package matches", async (t) => {
	const accepted = await run(t, advisory(), { "GHSA-test-0001": { package: "widget", reason: "unused code path" } });
	assert.equal(accepted.status, 0, accepted.stderr);
	assert.match(accepted.stdout, /accepted GHSA-test-0001 \(widget\)/);

	const mismatched = await run(t, advisory(), { "GHSA-test-0001": { package: "other", reason: "wrong package named" } });
	assert.equal(mismatched.status, 1);
});

test("warns about an acceptance that no longer matches anything", async (t) => {
	const result = await run(t, {}, { "GHSA-gone-0001": { package: "widget", reason: "fixed long ago" } });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stderr, /stale acceptance GHSA-gone-0001/);
});

test("ignores severities below the audit level", async (t) => {
	const result = await run(t, advisory({ severity: "low" }));
	assert.equal(result.status, 0, result.stderr);
});

test("fails loudly on a report it cannot read", async (t) => {
	const dir = await mkdtemp(join(tmpdir(), "naveti-audit-"));
	t.after(() => rm(dir, { recursive: true, force: true }));
	const report = join(dir, "report.json");
	await writeFile(report, "not json");
	const result = spawnSync(process.execPath, [script], {
		cwd: dir,
		encoding: "utf8",
		env: { ...process.env, NAVETI_AUDIT_REPORT: report, NAVETI_AUDIT_ACCEPT: join(dir, "missing.json") },
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /did not produce a JSON report/);
});
