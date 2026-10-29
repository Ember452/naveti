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
 * decides resolved versions, so a lockfile change caused by an override must arrive in
 * the same commit as the override. Without that link the guard rejects legitimate
 * security fixes and the escape hatch becomes routine.
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
	const tracked = tryGit(["diff", "--name-only", "HEAD"]) ?? "";
	const untracked = tryGit(["ls-files", "--others", "--exclude-standard"]) ?? "";
	return new Set(
		[...tracked.split("\n"), ...untracked.split("\n")]
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.map((line) => line.split("\\").join("/")),
	);
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

/** The `overrides:` block, which is version policy and therefore a dependency change. */
function overridesBlock(text) {
	const lines = text.split(/\r?\n/);
	const start = lines.findIndex((line) => line.trim() === "overrides:");
	if (start === -1) return "";
	const block = [];
	for (const line of lines.slice(start + 1)) {
		if (line.trim() === "") continue;
		if (!/^[ \t]{2,}\S/.test(line)) break;
		block.push(line.trim());
	}
	return block.join("\n");
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
		const previous = overridesBlock(tryGit(["show", `HEAD:${path}`]) ?? "");
		const absolute = join(ROOT, path);
		const current = existsSync(absolute) ? overridesBlock(readFileSync(absolute, "utf8")) : "";
		if (previous !== current) manifestChanges.push(`${path} (overrides)`);
		continue;
	}
	if (path !== "package.json" && !path.endsWith("/package.json")) continue;
	const absolute = join(ROOT, path);
	if (!existsSync(absolute)) continue; // deleted manifest: nothing to resolve
	const current = JSON.parse(readFileSync(absolute, "utf8"));
	const previousText = tryGit(["show", `HEAD:${path}`]);
	if (previousText === undefined) continue; // new manifest
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
