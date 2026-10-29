import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./check-parked-triggers.mjs", import.meta.url));

const UNSET = Symbol("unset");

/** A complete entry, with any field replaceable or removable. */
function entry(overrides = {}) {
	const fields = {
		条件: "`packages/*/never/*/nothing` >= 99",
		复核: "`review_by 2099-01-01`",
		前提: "包多了才划算。",
		...overrides,
	};
	const lines = Object.entries(fields)
		.filter(([, value]) => value !== UNSET)
		.map(([key, value]) => `- ${key}：${value}`)
		.join("\n");
	return `- 判断依据：出现了就做。\n${lines}`;
}

async function workspace(t, bodies) {
	const root = await mkdtemp(join(tmpdir(), "pi-parked-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	await mkdir(join(root, "docs/plan"), { recursive: true });
	const body = Object.entries(bodies)
		.map(([title, text]) => `### ${title}\n\n${text}\n`)
		.join("\n");
	await writeFile(join(root, "docs/plan/parked.md"), `# parked\n\n## 条目\n\n${body}`);
	return root;
}

function run(root) {
	return spawnSync(process.execPath, [script], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, NAVETI_CHECK_ROOT: root },
	});
}

test("stays quiet while neither the condition nor the review date has arrived", async (t) => {
	const root = await workspace(t, { 按diff选车道: entry() });
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /1 parked idea\(s\) armed/);
});

test("accepts 仅复核 as the honest form of an unobservable trigger", async (t) => {
	const root = await workspace(t, { 负控规则: entry({ 条件: "仅复核" }) });
	const result = run(root);
	assert.equal(result.status, 0, result.stderr);
});

test("wakes up when a path appears, and names the premise to re-check", async (t) => {
	const root = await workspace(t, { 暴露一致性守卫: entry({ 条件: "`path_exists .claude/skills`" }) });
	await mkdir(join(root, ".claude/skills"), { recursive: true });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /\.claude\/skills 已存在/);
	assert.match(result.stderr, /当时写下的前提：包多了才划算/);
});

test("wakes up when a count reaches the threshold", async (t) => {
	const root = await workspace(t, { 最小证据集: entry({ 条件: "`packages/*/package.json` >= 2" }) });
	for (const name of ["alpha", "beta"]) {
		await mkdir(join(root, "packages", name), { recursive: true });
		await writeFile(join(root, "packages", name, "package.json"), `{"name":"@naveti/${name}"}\n`);
	}
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /当前命中 2 个（阈值 2）/);
});

test("wakes up at the review date even when the condition never fired", async (t) => {
	const root = await workspace(t, { 人工评审证据: entry({ 复核: "`review_by 2020-01-01`" }) });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /到期复核成立/);
	assert.match(result.stderr, /复核日期 2020-01-01 已到/);
});

test("rejects an entry with no premise, which cannot be falsified later", async (t) => {
	const root = await workspace(t, { 好主意: entry({ 前提: UNSET }) });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /缺少 前提/);
});

test("rejects an entry with no review date, which could live forever", async (t) => {
	const root = await workspace(t, { 好主意: entry({ 复核: UNSET }) });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /缺少 复核/);
});

test("rejects an entry with no condition at all", async (t) => {
	const root = await workspace(t, { 好主意: entry({ 条件: UNSET }) });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /缺少 条件/);
});

test("rejects a condition nothing can evaluate", async (t) => {
	const root = await workspace(t, { 好主意: entry({ 条件: "等有空的时候" }) });
	const result = run(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /无法判定/);
});
