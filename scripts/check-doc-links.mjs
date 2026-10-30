#!/usr/bin/env node
/**
 * A link is a promise that a file is where the reader will look for it.
 *
 * For most markdown this guard checks only links, not paths written in prose or in
 * code spans. Prose mentions future or example paths on purpose
 * (`packages/features/<id>/`, `docs/kernel/*`), and a checker that reds on those would
 * be turned off within a day. Links have no such excuse: they are either resolvable
 * or broken.
 *
 * Kernel package READMEs are the exception, and they need both halves. Their prose is
 * not descriptive, it is operational: "update this file" is an instruction, so a path
 * that no longer exists sends the reader to a directory that is not there. Measured
 * once: `packages/kernel/ai/README.md` told provider authors to edit `../coding-agent/`,
 * `src/cli/args.ts` and `docs/providers.md` — none of those exist here — and nothing
 * noticed, because the vendored readmes were outside every check.
 *
 * So the code-span rule covers a kernel package README only, and even there it is
 * narrow: cross-package references and multi-segment file paths, never a bare file name
 * (those are meaningful under a heading such as "Tests (test/)"), and never a
 * placeholder, glob, or code fragment.
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
const CODE_SPAN = /`([^`\n]+)`/g;
const KERNEL_PACKAGE_README = /^packages\/kernel\/[^/]+\/README\.md$/;
/** Placeholders, templates, globs, table pipes and code fragments are not paths. */
const NOT_A_PATH = /[${}()<>[\]*\\|]/;

/**
 * Only markdown this repository owns. Kernel package READMEs are vendored upstream
 * text that receives deliberate, logged edits (`deviations.md`), so they are in scope;
 * upstream's own placeholder links are filtered by the rules below, not by exclusion.
 */
function ownedMarkdown() {
	const files = readdirSync(ROOT, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
		.map((entry) => join(ROOT, entry.name));
	for (const directory of ["docs", ".agents", "packages/features", "packages/contracts", "packages/platform", "packages/providers", "apps"]) {
		collectMarkdown(join(ROOT, ...directory.split("/")), files);
	}
	const kernelPackage = join(ROOT, "packages", "kernel");
	if (!existsSync(kernelPackage)) return files;
	const kernelReadme = join(kernelPackage, "README.md");
	if (existsSync(kernelReadme)) files.push(kernelReadme);
	for (const entry of readdirSync(kernelPackage, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const readme = join(kernelPackage, entry.name, "README.md");
		if (existsSync(readme)) files.push(readme);
	}
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

/** Reported line of a match, 1-based. */
function lineOf(text, index) {
	return text.slice(0, index ?? 0).split("\n").length;
}

/**
 * Fenced blocks are examples, not promises: a changelog template contains
 * `([#PR](link))`, where `link` is a placeholder the author replaces. Blanking the
 * fenced lines keeps every reported line number unchanged.
 */
function outsideFences(text) {
	const kept = [];
	let fenced = false;
	for (const line of text.split("\n")) {
		if (/^\s*(```|~~~)/.test(line)) {
			fenced = !fenced;
			kept.push("");
			continue;
		}
		kept.push(fenced ? "" : line);
	}
	return kept.join("\n");
}

for (const file of files) {
	const text = readFileSync(file, "utf8");
	const scannable = outsideFences(text);
	const rel = relative(ROOT, file).split("\\").join("/");
	for (const match of scannable.matchAll(LINK)) {
		const target = match[1];
		if (!target || EXTERNAL.test(target)) continue;
		// Anchors, template placeholders, and globs are not promises about a path.
		if (target.startsWith("#")) continue;
		if (/[<>*{}]/.test(target)) continue;
		const path = target.split("#")[0];
		if (path === "") continue;
		const resolved = path.startsWith("/") ? join(ROOT, path) : resolve(dirname(file), path);
		if (existsSync(resolved)) continue;
		failures.push(`${rel}:${lineOf(scannable, match.index)} → ${target}`);
	}

	if (!KERNEL_PACKAGE_README.test(rel)) continue;
	for (const match of scannable.matchAll(CODE_SPAN)) {
		const target = match[1].trim();
		if (!target || target.startsWith("@") || target.startsWith("/")) continue;
		if (NOT_A_PATH.test(target)) continue;
		// A readme in a package refers either into its own tree or to a sibling package.
		const crossesPackage = target.startsWith("../");
		const multiSegment = target.includes("/") && /\.(ts|tsx|md|json)$/.test(target);
		if (!crossesPackage && !multiSegment) continue;
		const path = target.split("#")[0];
		// Package-relative first, then repository-relative: both spellings occur in these
		// readmes, and only a path that resolves under neither is broken.
		if (existsSync(resolve(dirname(file), path)) || existsSync(join(ROOT, ...path.split("/")))) continue;
		failures.push(`${rel}:${lineOf(scannable, match.index)} → \`${target}\` (code span)`);
	}
}

if (failures.length > 0) {
	for (const line of failures) console.error(`broken reference  ${line}`);
	console.error(`\n${failures.length} broken path reference(s).`);
	process.exit(1);
}

console.log(`Markdown links and kernel README paths resolve across ${files.length} file(s).`);
