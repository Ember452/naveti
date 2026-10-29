#!/usr/bin/env node
/**
 * Runs the vendored package test suites under the conditions they were written for.
 *
 * Two modes, same configs:
 *
 *   node scripts/run-tests.mjs            # one vitest process per package (fallback)
 *   node scripts/run-tests.mjs --projects # one process, all projects (default gate)
 *
 * `--projects` uses the root `vitest.config.ts`, which collects `packages/kernel/*`
 * as projects. Package arguments still filter: `--projects durable chord`.
 *
 * `--hermetic` replaces the inherited environment with the allowlist ported from
 * upstream's `test.sh` (see `scripts/hermetic-env.mjs`): no API keys, throwaway
 * HOME/TMP, no user git or npm config, fixed TZ/locale. Without it, credential-gated
 * skips depend on whose shell started the run.
 *
 * Two environment assumptions break on Windows without touching any test:
 *
 *   1. `env/node.ts` finds bash through PATH. Windows only exposes `Git\cmd` on
 *      PATH, so the bash lookup fails; we prepend `Git\bin` when we can find it.
 *   2. Several heap-measuring tests sit just above the default 5s timeout on a
 *      loaded machine. Every project config carries `testTimeout: 60000`; the
 *      per-package mode also passes it on the command line.
 *
 * `chord` additionally spies on the global `setTimeout`, which is unsafe while
 * several test files share a process; its project sets `fileParallelism: false`.
 *
 * Usage: node scripts/run-tests.mjs [--projects] [--hermetic] [package ...]
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHermeticEnvironment } from "./hermetic-env.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALL = ["telemetry", "ai", "chord", "codemode", "mcp", "durable"];
const SERIAL = new Set(["chord"]);
const TIMEOUT_MS = "60000";

function commandOutput(command, args) {
	try {
		const result = spawn(command, args, { shell: false, windowsHide: true });
		let output = "";
		result.stdout?.on("data", (chunk) => {
			output += chunk.toString();
		});
		return new Promise((done) => {
			result.on("error", () => done(""));
			result.on("close", () => done(output));
		});
	} catch {
		return Promise.resolve("");
	}
}

/** Absolute path to a bash executable, or undefined when the platform has none. */
async function findBash() {
	if (process.platform !== "win32") return undefined;

	const onPath = await commandOutput("where", ["bash"]);
	const first = onPath.split(/\r?\n/).find((line) => line.trim().length > 0);
	if (first && existsSync(first.trim())) return first.trim();

	// Derive Git's bin directory from whichever git.exe is visible. This avoids
	// hardcoding an install location.
	const gitOnPath = await commandOutput("where", ["git"]);
	for (const line of gitOnPath.split(/\r?\n/)) {
		const git = line.trim();
		if (!git) continue;
		const candidate = resolve(dirname(git), "..", "bin", "bash.exe");
		if (existsSync(candidate)) return candidate;
	}

	const roots = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA];
	for (const root of roots) {
		if (!root) continue;
		const candidate = join(root, "Git", "bin", "bash.exe");
		if (existsSync(candidate)) return candidate;
		const programs = join(root, "Programs", "Git", "bin", "bash.exe");
		if (existsSync(programs)) return programs;
	}
	return undefined;
}

const vitest = join(ROOT, "node_modules", "vitest", "vitest.mjs");

function runPerPackage(pkg, env) {
	const args = [vitest, "--run", `--testTimeout=${TIMEOUT_MS}`];
	if (SERIAL.has(pkg)) args.push("--no-file-parallelism");
	return spawnVitest(args, join(ROOT, "packages", "kernel", pkg), env);
}

function runProjects(pkgs, env) {
	const args = [vitest, "--run"];
	for (const pkg of pkgs) args.push("--project", pkg);
	return spawnVitest(args, ROOT, env);
}

function spawnVitest(args, cwd, env) {
	return new Promise((done) => {
		const child = spawn(process.execPath, args, { cwd, env, stdio: "inherit", windowsHide: true });
		child.on("error", () => done(1));
		child.on("close", (code) => done(code ?? 1));
	});
}

const argv = process.argv.slice(2);
const useProjects = argv.includes("--projects");
const useHermetic = argv.includes("--hermetic");
const requested = argv
	.filter((argument) => !argument.startsWith("--"))
	.map((argument) => argument.replace(/^kernel\//, ""));
const packages = requested.length > 0 ? requested : ALL;
const unknown = packages.filter((pkg) => !ALL.includes(pkg));
if (unknown.length > 0) {
	console.error(`Unknown package(s): ${unknown.join(", ")}. Known: ${ALL.join(", ")}`);
	process.exit(2);
}

/**
 * The `ai` and `chord` probe tests spawn a plain `node` child, which resolves
 * workspace packages through `dist` rather than through the `source` condition.
 * A missing `dist` fails loudly; a *stale* `dist` is worse — the probe would pass
 * against code that no longer matches the tree. Require the build up front.
 */
function requireBuild(pkgs) {
	const missing = pkgs.filter((pkg) => !existsSync(join(ROOT, "packages", "kernel", pkg, "dist")));
	if (missing.length === 0) return;
	console.error(`Missing build output for: ${missing.join(", ")}.`);
	console.error("Run `pnpm build` first; the probe tests load dist, so a stale build would test old code.");
	process.exit(1);
}

requireBuild(packages);

/**
 * Prepends a directory to PATH without discarding the rest of it.
 *
 * Windows exposes the variable as `Path`, so `env.PATH = ...` on a spread copy
 * creates a second, empty-baseline entry and drops System32 from the child's
 * environment. Always mutate the key that is actually present.
 */
function prependPath(baseEnv, directory) {
	const env = { ...baseEnv };
	const key = Object.keys(env).find((name) => name.toUpperCase() === "PATH") ?? "PATH";
	const separator = process.platform === "win32" ? ";" : ":";
	env[key] = `${directory}${separator}${env[key] ?? ""}`;
	return env;
}

const bash = await findBash();
let env = { ...process.env };
if (bash) {
	env = prependPath(env, dirname(bash));
	console.log(`bash: ${bash}`);
} else if (process.platform === "win32") {
	console.warn("bash: not found. NodeExecutionEnv shell tests will fail until Git for Windows is on PATH.");
}

let hermeticCleanup;
if (useHermetic) {
	const hermetic = createHermeticEnvironment({ pathPrefix: bash ? dirname(bash) : undefined });
	env = hermetic.env;
	hermeticCleanup = hermetic.cleanup;
	console.log(`hermetic: ${hermetic.root}`);
}

const results = [];
if (useProjects) {
	console.log(`\n=== projects (${packages.join(", ")}) ===`);
	const code = await runProjects(packages, env);
	for (const pkg of packages) results.push([pkg, code]);
} else {
	for (const pkg of packages) {
		console.log(`\n=== ${pkg} ===`);
		results.push([pkg, await runPerPackage(pkg, env)]);
	}
}

console.log("\n=== summary ===");
for (const [pkg, code] of results) console.log(`${code === 0 ? "PASS" : "FAIL"}  ${pkg}  (exit ${code})`);
hermeticCleanup?.();
process.exit(results.every(([, code]) => code === 0) ? 0 : 1);
