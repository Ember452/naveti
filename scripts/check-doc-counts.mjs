#!/usr/bin/env node
/**
 * Rule documents must not carry inventory.
 *
 * This is deliberately narrow. It does not try to detect "any statement that could
 * go stale"; a prose linter with that ambition gets switched off the second it
 * complains about a sentence nobody can avoid writing. It matches the phrasings that
 * actually drifted here: counts of scripts, tests, guards and workflows, and the
 * leftover `[待建]` marker that `structure.md` §1 replaced with `[未建]`.
 *
 * `docs/migration/` is out of scope on purpose: baseline.md and deviations.md are
 * measurement documents, and counting is their job. So are `.agents/notes/`: a note
 * records what was true the moment it was written, which cannot drift — rewriting
 * history to satisfy a linter would destroy its only use. Skills stay in scope
 * because they state rules.
 *
 * The boundary is not symmetry with `check-doc-links`, which does scan notes: a count
 * in a record is a statement about the past and stays true, while a link is a pointer
 * that either resolves today or misleads the reader today.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRECTORIES = new Set(["node_modules", "dist", ".git", ".upstream", "coverage", "migration", "notes"]);
/**
 * The shapes that carried a stale number in the past. The numeral class excludes the
 * singular `一` and the pair `两` on purpose: `一个功能一个包` is the project's own slogan,
 * and `新增一条守卫` / `两条守卫补上...` are normal sentences rather than inventories. The
 * noun list stays narrow for the same reason: `2–4 个 seat` is a rule, not a count.
 */
const PATTERNS = [
	[/现有\s*[0-9一二三四五六七八九十]+\s*(个|条|张|项)/g, 'counts belong to `ls` / `git ls-files`, not to a rule document'],
	[/[0-9三四五六七八九十]+\s*(个|条|项)\s*(脚本|结构守卫|守卫|工作流|生成器|测试文件|写文档的规矩|规矩)/g, "inventory counts go stale; name the command that answers instead"],
	[/[0-9三四五六七八九十]+\s*篇/g, "document counts go stale; name the document instead"],
	[/[\[（(]待建[\]）)]/g, "this tree marks unbuilt paths `[未建]`（structure.md §1）"],
];

function collectMarkdown(directory, out) {
	if (!existsSync(directory)) return out;
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRECTORIES.has(entry.name)) continue;
			collectMarkdown(join(directory, entry.name), out);
			continue;
		}
		if (entry.name.endsWith(".md")) out.push(join(directory, entry.name));
	}
	return out;
}

const files = [
	...readdirSync(ROOT, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
		.map((entry) => join(ROOT, entry.name)),
	...collectMarkdown(join(ROOT, "docs"), []),
	...collectMarkdown(join(ROOT, ".agents"), []),
];

const failures = [];
for (const file of files) {
	const text = readFileSync(file, "utf8");
	const lines = text.split(/\r?\n/);
	lines.forEach((line, index) => {
		for (const [pattern, why] of PATTERNS) {
			pattern.lastIndex = 0;
			if (!pattern.test(line)) continue;
			failures.push(`${relative(ROOT, file).split("\\").join("/")}:${index + 1}: ${why}\n    ${line.trim()}`);
		}
	});
}

if (failures.length > 0) {
	for (const failure of failures) console.error(failure);
	console.error(`\n${failures.length} stale-count line(s) in rule documents.`);
	process.exit(1);
}

console.log(`Rule documents carry no inventory counts (${files.length} files).`);
