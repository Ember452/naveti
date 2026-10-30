#!/usr/bin/env node
/**
 * A feature's client face runs in a browser that has no filesystem, no process and no host. Nothing enforces
 * that by construction: `apps/web/tsconfig.json` carries `node` types (the workspace packages it reaches through
 * chord are typed against Node), so `import "node:fs"` in a `src/client` file type-checks, builds, and fails only
 * when a user's tab asks for a module the browser does not have.
 *
 * So this guard walks the **value** import graph from each feature's `./client` entry and fails when it reaches:
 *
 *   1. a `node:*` builtin;
 *   2. `@naveti/host` (the assembly package) — a client must reach the kernel only through `@naveti/web`;
 *   3. that same package's `src/host/**` — the two faces of one package share a manifest, not code.
 *
 * Type-only imports are allowed and invisible here: `import type` is erased before any runtime sees it, and the
 * rule structure.md §5 states is about what the browser loads. Other packages are recorded but not followed: their
 * own entries are their business (a client importing `@naveti/web` is the intended path).
 *
 * Trigger (structure.md §13): the first feature with a UI — `chat`. Exit 1 with one line per violation.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { findWorkspacePackages } from "./package-workspaces.mjs";

const ROOT = process.env.NAVETI_CHECK_ROOT ? resolve(process.env.NAVETI_CHECK_ROOT) : process.cwd();
const SPEC = /(?:^|\n)\s*(?:import|export)\s+(?!type\s)([^;]*?\sfrom\s*)?["']([^"']+)["']/g;

const failures = [];
function fail(file, reason) {
	failures.push(`${file}: ${reason}`);
}

function posix(path) {
	return path.split(sep).join("/");
}

/** The source file a package's `./client` export points at, or `undefined` when the feature has no client face. */
function clientEntry(pkgDir, manifest) {
	const declared = manifest.exports?.["./client"];
	if (declared === undefined || typeof declared === "string") return undefined;
	const source = declared.source;
	if (typeof source !== "string") {
		fail(posix(relative(ROOT, join(pkgDir, "package.json"))), 'exports["./client"] declares no "source" file');
		return undefined;
	}
	const file = join(pkgDir, source);
	if (!existsSync(file)) {
		fail(posix(relative(ROOT, join(pkgDir, "package.json"))), `exports["./client"] points at ${source}, which is not there`);
		return undefined;
	}
	return file;
}

/** Resolve a relative specifier the way Node does for our sources: the file, `.ts`/`.tsx`, or a directory index. */
function resolveRelative(fromFile, specifier) {
	const base = resolve(dirname(fromFile), specifier);
	for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
	}
	return undefined;
}

function walk(entry, packageRoot, seen = new Set()) {
	const hostDirectory = join(packageRoot, "src", "host");
	const stack = [entry];
	while (stack.length > 0) {
		const file = stack.pop();
		if (file === undefined || seen.has(file)) continue;
		seen.add(file);
		const text = readFileSync(file, "utf8");
		for (const match of text.matchAll(SPEC)) {
			const specifier = match[2];
			const at = posix(relative(ROOT, file));
			if (specifier.startsWith("node:")) {
				fail(at, `imports ${specifier}; a client face runs in a browser with no Node builtins`);
				continue;
			}
			if (specifier === "@naveti/host" || specifier.startsWith("@naveti/host/")) {
				fail(at, `imports ${specifier}; a client reaches the host only through a wire contract`);
				continue;
			}
			if (!specifier.startsWith(".")) continue;
			const target = resolveRelative(file, specifier);
			if (target === undefined) {
				// An unresolved relative import is the TypeScript build's problem, not this guard's.
				continue;
			}
			if (target.startsWith(hostDirectory)) {
				fail(at, `imports ${specifier}; a client face does not import its own host face`);
				continue;
			}
			stack.push(target);
		}
	}
}

let checked = 0;
const features = join(ROOT, "packages", "features");
if (existsSync(features)) {
	for (const pkgDir of findWorkspacePackages(features)) {
		const manifestPath = join(pkgDir, "package.json");
		if (!existsSync(manifestPath)) continue;
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		const entry = clientEntry(pkgDir, manifest);
		if (entry === undefined) continue;
		walk(entry, pkgDir);
		checked++;
	}
}

if (failures.length > 0) {
	for (const line of failures) console.error(line);
	console.error(`\n${failures.length} client-face violation(s).`);
	process.exit(1);
}
console.log(`Client faces load no Node builtins and no host code across ${checked} feature(s).`);
