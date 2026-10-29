#!/usr/bin/env node
/**
 * Produces a text-level comparison against upstream pi for the vendored packages.
 *
 * The vendored tree has no upstream git history, so "following upstream" is
 * always a manual read of a diff, never a rebase. This script normalizes an
 * upstream tree with the same scope mapping used for the migration, then diffs
 * it against `packages/`, so only real changes remain.
 *
 * Usage:
 *   node scripts/sync-upstream.mjs --from <pi checkout> [package ...]
 *   node scripts/sync-upstream.mjs [package ...]        # npm pack <upstream>@latest
 *
 * Add `--full` to include a unified patch for every changed file.
 *
 * Output: docs/migration/diffs/upstream-diff-<date>.md, plus the normalized tree under
 * .upstream/ for browsing. Nothing under packages/ is modified.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCAL_PACKAGE_DIRS, PACKAGES, renameScope } from "./scope-rules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UPSTREAM_DIR = join(ROOT, ".upstream");
const REPORT_DIR = join(ROOT, "docs", "migration", "diffs");
const SKIP_DIRS = new Set(["node_modules", "dist"]);
const TEXT_EXTENSIONS = new Set([".ts", ".mts", ".js", ".mjs", ".json"]);

function parseArguments(argv) {
	let from;
	let full = false;
	const packages = [];
	for (let index = 0; index < argv.length; index++) {
		const argument = argv[index];
		if (argument === "--from") {
			from = argv[++index];
			continue;
		}
		if (argument.startsWith("--from=")) {
			from = argument.slice("--from=".length);
			continue;
		}
		if (argument === "--full") {
			full = true;
			continue;
		}
		packages.push(argument);
	}
	return { from, full, packages: packages.length > 0 ? packages : Object.keys(PACKAGES) };
}

function walk(directory, out = []) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) walk(path, out);
			continue;
		}
		if (entry.isFile()) out.push(path);
	}
	return out;
}

/** Copies a tree and rewrites the package scope in code files. */
function normalize(source, destination) {
	cpSync(source, destination, { recursive: true });
	let replacements = 0;
	for (const file of walk(destination)) {
		const dot = file.lastIndexOf(".");
		if (dot === -1 || !TEXT_EXTENSIONS.has(file.slice(dot))) continue;
		const before = readFileSync(file, "utf8");
		const { text, total } = renameScope(before);
		if (text === before) continue;
		writeFileSync(file, text);
		replacements += total;
	}
	return replacements;
}

/** Unpacks the published tarball for one upstream package into `.upstream/<name>`. */
function packFromRegistry(localName) {
	const spec = `${PACKAGES[localName]}@latest`;
	const destination = join(UPSTREAM_DIR, "tarballs");
	mkdirSync(destination, { recursive: true });
	const packed = execFileSync("npm", ["pack", spec, "--pack-destination", destination], {
		encoding: "utf8",
		shell: true,
	}).trim();
	const tarball = join(destination, packed.split(/\r?\n/).pop());
	const extracted = join(UPSTREAM_DIR, localName);
	rmSync(extracted, { recursive: true, force: true });
	mkdirSync(extracted, { recursive: true });
	execFileSync("tar", ["-xzf", tarball, "-C", extracted, "--strip-components=1"], { shell: true });
	return extracted;
}

function listRelative(root) {
	if (!existsSync(root)) return [];
	return walk(root).map((path) => relative(root, path).split("\\").join("/"));
}

/** Added, removed and changed paths; build output never enters the comparison. */
function compareTrees(left, right) {
	const leftFiles = new Set(listRelative(left));
	const rightFiles = new Set(listRelative(right));
	const added = [...rightFiles].filter((path) => !leftFiles.has(path)).sort();
	const removed = [...leftFiles].filter((path) => !rightFiles.has(path)).sort();
	const changed = [];
	for (const path of rightFiles) {
		if (!leftFiles.has(path)) continue;
		const before = readFileSync(join(left, path));
		const after = readFileSync(join(right, path));
		if (!before.equals(after)) changed.push(path);
	}
	return { added, removed, changed: changed.sort() };
}

function filePatch(left, right, path) {
	try {
		return execFileSync("git", ["diff", "--no-index", "--", join(left, path), join(right, path)], {
			encoding: "utf8",
			maxBuffer: 16 * 1024 * 1024,
		});
	} catch (error) {
		return error.stdout?.toString() ?? "";
	}
}

const { from, full, packages } = parseArguments(process.argv.slice(2));
const unknown = packages.filter((name) => !(name in PACKAGES));
if (unknown.length > 0) {
	console.error(`Unknown package(s): ${unknown.join(", ")}. Known: ${Object.keys(PACKAGES).join(", ")}`);
	process.exit(2);
}

mkdirSync(UPSTREAM_DIR, { recursive: true });
mkdirSync(REPORT_DIR, { recursive: true });

const sections = [];
for (const name of packages) {
	const local = join(ROOT, "packages", LOCAL_PACKAGE_DIRS[name] ?? name);
	const source = from ? join(resolve(from), "packages", name) : packFromRegistry(name);
	if (!existsSync(source)) {
		sections.push(`## ${name}\n\nUpstream source not found at \`${source}\`.\n`);
		continue;
	}
	const normalized = join(UPSTREAM_DIR, `${name}-normalized`);
	rmSync(normalized, { recursive: true, force: true });
	const replacements = normalize(source, normalized);
	const { added, removed, changed } = compareTrees(normalized, local);
	console.log(`\n## ${name}: ${replacements} scope replacements`);
	console.log(`  added ${added.length}, removed ${removed.length}, changed ${changed.length}`);
	for (const path of changed) console.log(`    M ${path}`);
	for (const path of added) console.log(`    A ${path}`);
	for (const path of removed) console.log(`    D ${path}`);
	const patch = full ? changed.map((path) => filePatch(normalized, local, path)).join("\n") : "";
	sections.push(
		`## ${name}\n\nScope replacements applied to upstream tree: ${replacements}\n\n` +
			`Added locally (${added.length}):\n\n\`\`\`\n${added.join("\n") || "(none)"}\n\`\`\`\n\n` +
			`Upstream only (${removed.length}):\n\n\`\`\`\n${removed.join("\n") || "(none)"}\n\`\`\`\n\n` +
			`Changed (${changed.length}):\n\n\`\`\`\n${changed.join("\n") || "(none)"}\n\`\`\`\n` +
			(patch ? `\n\`\`\`diff\n${patch}\n\`\`\`\n` : ""),
	);
}

const today = new Date().toISOString().slice(0, 10);
const report = `# Upstream diff ${today}\n\nCompared against ${from ? `local checkout \`${from}\`` : "npm \`@latest\` tarballs"}.\nDifferences include the scope rename, regenerated \`src/providers/data\`, and any local fix.\n\n${sections.join("\n")}`;
const reportPath = join(REPORT_DIR, `upstream-diff-${today}.md`);
writeFileSync(reportPath, report);
console.log(`\nreport: ${relative(ROOT, reportPath)}`);
