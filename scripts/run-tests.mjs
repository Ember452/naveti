#!/usr/bin/env node
/**
 * Runs the vendored package test suites under the conditions they were written for.
 *
 * The suites come from pi, whose CI runs only on ubuntu-latest. On Windows two
 * environment assumptions break without touching any test:
 *
 *   1. `env/node.ts` finds bash through PATH. Windows only exposes `Git\cmd` on
 *      PATH, so the bash lookup fails; we prepend `Git\bin` when we can find it.
 *   2. Several heap-measuring tests sit just above the default 5s timeout on a
 *      loaded machine, so we pass a larger one.
 *
 * `chord` additionally spies on the global `setTimeout`, which is unsafe while
 * several test files share a process; it runs without file parallelism.
 *
 * Usage: node scripts/run-tests.mjs [package ...]
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

function run(pkg, env) {
	const vitest = join(ROOT, "node_modules", "vitest", "vitest.mjs");
	const args = [vitest, "--run", `--testTimeout=${TIMEOUT_MS}`];
	if (SERIAL.has(pkg)) args.push("--no-file-parallelism");
	return new Promise((done) => {
		const child = spawn(process.execPath, args, {
			cwd: join(ROOT, "packages", pkg),
			env,
			stdio: "inherit",
			windowsHide: true,
		});
		child.on("error", () => done(1));
		child.on("close", (code) => done(code ?? 1));
	});
}

const requested = process.argv.slice(2);
const packages = requested.length > 0 ? requested : ALL;
const unknown = packages.filter((pkg) => !ALL.includes(pkg));
if (unknown.length > 0) {
	console.error(`Unknown package(s): ${unknown.join(", ")}. Known: ${ALL.join(", ")}`);
	process.exit(2);
}

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

const results = [];
for (const pkg of packages) {
	console.log(`\n=== ${pkg} ===`);
	results.push([pkg, await run(pkg, env)]);
}

console.log("\n=== summary ===");
for (const [pkg, code] of results) console.log(`${code === 0 ? "PASS" : "FAIL"}  ${pkg}  (exit ${code})`);
process.exit(results.every(([, code]) => code === 0) ? 0 : 1);
