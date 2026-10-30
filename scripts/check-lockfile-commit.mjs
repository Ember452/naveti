#!/usr/bin/env node
/**
 * The lockfile and the manifests must move together.
 *
 * Ported from upstream's `check-lockfile-commit.mjs`, rewritten for pnpm: upstream
 * reasoned about npm v3 lock entries, which this repository no longer produces.
 * The rule is stated in terms of what a reviewer cares about instead:
 *
 *   - a manifest's dependency sections changed, but `pnpm-lock.yaml` did not
 *     commit alongside it  -> the install is unreproducible for everyone else
 *   - `pnpm-lock.yaml` changed, but no manifest's dependency sections did
 *     -> either a transitive bump nobody asked for, or a hand-edited lockfile
 *
 * `pnpm-workspace.yaml` counts as a manifest for this purpose: its `overrides` block
 * decides resolved versions and its `packages` globs decide which directories are
 * importers, so a lockfile change caused by either must arrive in the same commit.
 * Without that link the guard rejects legitimate fixes and the escape hatch becomes
 * routine.
 *
 * A workspace package that appears or disappears is a dependency change too: it adds or
 * removes an `importers` entry, which is exactly what the lockfile records. Treating it
 * as "no manifest change" made every new package trip the reverse direction.
 *
 * Either direction is a red unless `NAVETI_ALLOW_LOCKFILE_CHANGE` is truthy, which
 * is the deliberate escape hatch for `pnpm update`.
 *
 * Outside a git work tree, or before the first commit, the check has nothing to
 * compare and says so instead of failing.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const LOCKFILE = "pnpm-lock.yaml";
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const ALLOW_ENV = "NAVETI_ALLOW_LOCKFILE_CHANGE";
const DEPENDENCY_SECTIONS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];

function git(args, options = {}) {
	return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
}

function tryGit(args) {
	try {
		return git(args);
	} catch {
		return undefined;
	}
}

function changedFiles() {
	// `git diff HEAD` misses a staged change that was reverted in the working tree.
	// The union of the index and the working tree is what the commit and the checkout
	// actually contain between them.
	const staged = tryGit(["diff", "--cached", "--name-only"]) ?? "";
	const unstaged = tryGit(["diff", "--name-only"]) ?? "";
	const untracked = tryGit(["ls-files", "--others", "--exclude-standard"]) ?? "";
	return new Set(
		[...staged.split("\n"), ...unstaged.split("\n"), ...untracked.split("\n")]
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.map((line) => line.split("\\").join("/")),
	);
}

/**
 * The version that matters is the one the commit would contain. When the index differs
 * from HEAD, that is the index; otherwise fall back to the working tree so unstaged
 * edits are still seen.
 */
function currentText(path, absolute) {
	const index = tryGit(["show", `:${path}`]);
	const head = tryGit(["show", `HEAD:${path}`]);
	if (index !== undefined && index !== head) return index;
	return existsSync(absolute) ? readFileSync(absolute, "utf8") : undefined;
}

function dependencySections(manifest) {
	if (!manifest) return {};
	const result = {};
	for (const section of DEPENDENCY_SECTIONS) {
		const value = manifest[section];
		if (value && typeof value === "object") result[section] = value;
	}
	return result;
}

function sameJson(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

/** A named top-level block of `pnpm-workspace.yaml`, empty when absent. */
function workspaceBlock(text, name) {
	const lines = text.split(/\r?\n/);
	const start = lines.findIndex((line) => line.trim() === `${name}:`);
	if (start === -1) return "";
	const block = [];
	for (const line of lines.slice(start + 1)) {
		if (line.trim() === "") continue;
		if (!/^[ \t]{2,}\S/.test(line)) break;
		block.push(line.trim());
	}
	return block.join("\n");
}

/** The `overrides:` block, which is version policy and therefore a dependency change. */
function overridesBlock(text) {
	return workspaceBlock(text, "overrides");
}

/** The `packages:` globs, which decide the lockfile's importers. */
function packagesBlock(text) {
	return workspaceBlock(text, "packages");
}

const allow = /^(1|true|yes)$/i.test(process.env[ALLOW_ENV] ?? "");

if (tryGit(["rev-parse", "--verify", "HEAD"]) === undefined) {
	console.log("Lockfile check skipped: no commit to compare against yet.");
	process.exit(0);
}

const changed = changedFiles();
const lockChanged = changed.has(LOCKFILE);

const manifestChanges = [];
for (const path of changed) {
	if (path === WORKSPACE_FILE) {
		const previousText = tryGit(["show", `HEAD:${path}`]) ?? "";
		const absolute = join(ROOT, path);
		const current = currentText(path, absolute) ?? "";
		for (const [name, read] of [
			["overrides", overridesBlock],
			["packages", packagesBlock],
		]) {
			if (read(previousText) !== read(current)) manifestChanges.push(`${path} (${name})`);
		}
		continue;
	}
	if (path !== "package.json" && !path.endsWith("/package.json")) continue;
	const absolute = join(ROOT, path);
	const currentTextValue = existsSync(absolute) ? currentText(path, absolute) : undefined;
	const previousText = tryGit(["show", `HEAD:${path}`]);
	// A workspace package that appears or disappears adds or removes a lockfile importer.
	if (previousText === undefined && currentTextValue !== undefined) {
		manifestChanges.push(`${path} (new)`);
		continue;
	}
	if (previousText !== undefined && currentTextValue === undefined) {
		manifestChanges.push(`${path} (deleted)`);
		continue;
	}
	if (currentTextValue === undefined) continue;
	const current = JSON.parse(currentTextValue);
	if (previousText === undefined) continue;
	const previous = JSON.parse(previousText);
	if (!sameJson(dependencySections(previous), dependencySections(current))) manifestChanges.push(path);
}

const failures = [];
if (manifestChanges.length > 0 && !lockChanged) {
	failures.push(
		`dependency sections changed in ${manifestChanges.join(", ")} but ${LOCKFILE} did not: run "pnpm install" and commit the lockfile`,
	);
}
if (lockChanged && manifestChanges.length === 0) {
	failures.push(
		`${LOCKFILE} changed without a dependency change in any package.json or in ${WORKSPACE_FILE} overrides: set ${ALLOW_ENV}=1 if this is an intentional resolution change`,
	);
}

if (failures.length > 0 && !allow) {
	for (const line of failures) console.error(line);
	console.error(`\n${failures.length} lockfile/manifest mismatch(es).`);
	process.exit(1);
}

if (failures.length > 0 && allow) {
	for (const line of failures) console.log(`${ALLOW_ENV} set, ignoring: ${line}`);
}

console.log("Lockfile and manifests are consistent.");
