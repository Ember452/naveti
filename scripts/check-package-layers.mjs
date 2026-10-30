#!/usr/bin/env node
/**
 * Dependency direction is the one thing a refactor cannot quietly undo, and `package.json` is
 * where a product layer would first lose it: one convenient import of the kernel's harness
 * inside a feature, and the facade stops being the only promise surface. Nothing about that
 * fails a type check — the import resolves, the build passes, and the cost appears a year
 * later when the kernel is refactored and forty features move with it.
 *
 * So this guard reads manifests, not code, and holds the four directions structure.md §5
 * states:
 *
 *   1. kernel only depends on kernel: a kernel package listing any product-layer workspace
 *      package (here: anything that is not under packages/kernel/) is a violation.
 *   2. contracts does not depend on platform, features, providers or apps. It may depend on
 *      `@naveti/chord`, whose declarations are what a wire contract is made of (see
 *      .agents/notes/implemented/2026-10-30-contracts-hold-chord-declarations.md); that is
 *      the allowlist, and it stays an allowlist rather than a rule about a scope.
 *   3. platform does not depend on features or apps.
 *   4. a feature does not depend on a kernel package at all, in any dependency section.
 *
 * A fifth direction — a feature's client face must not reach the host or `node:*` — is a
 * property of the import graph rather than of a manifest, and belongs to `check-client-face`
 * (structure.md §13). This guard does not pretend to cover it.
 *
 * Workspace membership comes from `findWorkspacePackages`, the same source the other guards
 * and the build use, so a package cannot be laid out one way for this check and another way
 * for everything else. Exit 1 with one line per violation.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { findWorkspacePackages } from "./package-workspaces.mjs";

const ROOT = process.env.NAVETI_CHECK_ROOT ? resolve(process.env.NAVETI_CHECK_ROOT) : process.cwd();
const DEPENDENCY_SECTIONS = ["dependencies", "devDependencies", "peerDependencies"];
/** The only kernel package a contract may be built from: its declaration layer is the wire format. */
const CONTRACTS_MAY_USE_KERNEL = new Set(["@naveti/chord"]);

const failures = [];
function fail(manifestPath, reason) {
	failures.push(`${manifestPath}: ${reason}`);
}

/** `kernel`, `contracts`, `platform`, `providers`, `feature`, `app`, or `undefined` for a layout this guard does not know. */
function layerOf(directory) {
	const path = relative(ROOT, directory).split("\\").join("/");
	if (path.startsWith("packages/kernel/")) return "kernel";
	if (path === "packages/contracts") return "contracts";
	if (path.startsWith("packages/platform/")) return "platform";
	if (path.startsWith("packages/providers/")) return "providers";
	if (path.startsWith("packages/features/")) return "feature";
	if (path.startsWith("apps/")) return "app";
	return undefined;
}

/** Workspace packages by name, with the layer each one belongs to. */
function workspaceLayers() {
	const layers = new Map();
	for (const root of ["packages", "apps"]) {
		const directory = join(ROOT, root);
		if (!existsSync(directory)) continue;
		for (const pkgDir of findWorkspacePackages(directory)) {
			const manifestPath = join(pkgDir, "package.json");
			const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
			if (typeof manifest.name === "string") layers.set(manifest.name, layerOf(pkgDir));
		}
	}
	return layers;
}

/** Every internal dependency a manifest declares, with the section it came from. */
function internalDependencies(manifest) {
	const declared = [];
	for (const section of DEPENDENCY_SECTIONS) {
		for (const name of Object.keys(manifest[section] ?? {})) {
			if (name.startsWith("@naveti/")) declared.push({ name, section });
		}
	}
	return declared;
}

const layers = workspaceLayers();

for (const root of ["packages", "apps"]) {
	const directory = join(ROOT, root);
	if (!existsSync(directory)) continue;
	for (const pkgDir of findWorkspacePackages(directory)) {
		const manifestPath = relative(ROOT, join(pkgDir, "package.json")).split("\\").join("/");
		const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
		const own = layerOf(pkgDir);
		for (const { name, section } of internalDependencies(manifest)) {
			const dependency = layers.get(name);
			// A name that is not a workspace member is an external package that borrows the scope; the
			// pinned-dependency guard owns its version, nothing here can tell where it belongs.
			if (dependency === undefined) continue;
			if (own === "kernel" && dependency !== "kernel") {
				fail(manifestPath, `${section}.${name} is ${dependency}-layer; the kernel depends on the kernel only`);
			}
			if (own === "contracts" && !(dependency === "kernel" && CONTRACTS_MAY_USE_KERNEL.has(name))) {
				fail(
					manifestPath,
					`${section}.${name} is ${dependency}-layer; a contract may depend only on the kernel's declaration layer (${[...CONTRACTS_MAY_USE_KERNEL].join(", ")})`,
				);
			}
			if (own === "platform" && (dependency === "feature" || dependency === "app")) {
				fail(manifestPath, `${section}.${name} is ${dependency}-layer; the platform does not import features`);
			}
			if (own === "feature" && dependency === "kernel") {
				fail(
					manifestPath,
					`${section}.${name} is a kernel package; a feature reaches the kernel only through @naveti/host/extend/*`,
				);
			}
		}
	}
}

if (failures.length > 0) {
	for (const line of failures) console.error(line);
	console.error(`\n${failures.length} package-layer violation(s).`);
	process.exit(1);
}
console.log(`Package layers point the documented way across ${layers.size} workspace package(s).`);
