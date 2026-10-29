#!/usr/bin/env node
/**
 * A link is a promise that a file is where the reader will look for it.
 *
 * This guard checks only markdown links, not paths written in prose or in code
 * spans. Prose mentions future or example paths on purpose (`packages/features/<id>/`,
 * `docs/kernel/*`), and a checker that reds on those would be turned off within a
 * day. Links have no such excuse: they are either resolvable or broken.
 *
 * The repository earned this guard the hard way: moving generated diffs into
 * `docs/migration/diffs/` left four references pointing at the old location, and
 * nothing noticed until a reader followed one.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRECTORIES = new Set(["node_modules", "dist", ".git", ".upstream", "coverage"]);
const LINK = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Only markdown this repository owns. Vendor package READMEs keep upstream text
 * (including upstream's own placeholder links) and editing them would add noise to
 * every upstream comparison for no reader benefit.
 */
function ownedMarkdown() {
	const files = readdirSync(ROOT, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
		.map((entry) => join(ROOT, entry.name));
	for (const directory of ["docs", ".agents"]) collectMarkdown(join(ROOT, directory), files);
	const kernelReadme = join(ROOT, "packages", "kernel", "README.md");
	if (existsSync(kernelReadme)) files.push(kernelReadme);
	return files;
}

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

const failures = [];
const files = ownedMarkdown();

for (const file of files) {
	const text = readFileSync(file, "utf8");
	for (const match of text.matchAll(LINK)) {
		const target = match[1];
		if (!target || EXTERNAL.test(target)) continue;
		// Anchors, template placeholders, and globs are not promises about a path.
		if (target.startsWith("#")) continue;
		if (/[<>*{}]/.test(target)) continue;
		const path = target.split("#")[0];
		if (path === "") continue;
		const resolved = path.startsWith("/") ? join(ROOT, path) : resolve(dirname(file), path);
		if (existsSync(resolved)) continue;
		const line = text.slice(0, match.index ?? 0).split("\n").length;
		failures.push(`${relative(ROOT, file).split("\\").join("/")}:${line} → ${target}`);
	}
}

if (failures.length > 0) {
	for (const line of failures) console.error(`broken link  ${line}`);
	console.error(`\n${failures.length} broken markdown link(s).`);
	process.exit(1);
}

console.log(`Markdown links resolve across ${files.length} file(s).`);
