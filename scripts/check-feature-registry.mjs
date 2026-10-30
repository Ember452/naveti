#!/usr/bin/env node
/**
 * `structure.md` §8 says the three places that describe a feature — its directory, its manifest, and the compose list —
 * must agree, and that a guard checks it. Until now nothing did: `naveti.feature.json` was a file nobody read,
 * `seats.ts` exported three functions with no caller, and a feature could be half-registered with every gate green.
 *
 * The relationships are three, and they are not the same relationship:
 *
 *   1. directory ⇔ manifest ⇔ `apps/server/src/compose.ts` are equal. Installed is installed, on both sides.
 *   2. a feature that exports `./client` is listed in `apps/web/src/compose.ts`, and one that does not is not.
 *   3. the web list is a **subset** of the server list. The two faces are decided independently: a feature may have a
 *      host face and no UI (structure.md §8), so equality here would be the wrong invariant and would fail the first
 *      headless feature.
 *
 * Also checked because they are the same failure one level down: a seat outside the closed set (the shape that let
 * seats.md claim hooks exist while `FeatureContext` had no attach point for them), and a `requires` naming a feature
 * that is not installed.
 *
 * Exit 1 with one line per violation. Fixtures in `check-feature-registry.test.mjs`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = process.env.NAVETI_CHECK_ROOT ? resolve(process.env.NAVETI_CHECK_ROOT) : process.cwd();
const FEATURES = join(ROOT, "packages", "features");
const SERVER_COMPOSE = join(ROOT, "apps", "server", "src", "compose.ts");
const WEB_COMPOSE = join(ROOT, "apps", "web", "src", "compose.ts");
const SEATS = join(ROOT, "packages", "platform", "host", "src", "seats.ts");

const failures = [];
function fail(where, reason) {
	failures.push(`${where}: ${reason}`);
}

function posix(path) {
	return path.split(sep).join("/");
}

/** A closed set as `seats.ts` declares it: the file is the authority, so it is read rather than copied. */
function closedSet(source, name) {
	const match = source.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\]`));
	if (match === null) throw new Error(`seats.ts declares no ${name}`);
	return [...match[1].matchAll(/"([^"]+)"/g)].map((quoted) => quoted[1]);
}

/** The ids a compose file lists, in order. Absent file: the app does not exist in this workspace. */
function composeIds(file) {
	if (!existsSync(file)) return undefined;
	const text = readFileSync(file, "utf8");
	return [...text.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((entry) => entry[1]);
}

if (!existsSync(SEATS)) {
	console.error(`${posix(relative(ROOT, SEATS))}: the seat declaration is gone; this guard reads it as the authority`);
	process.exit(1);
}
const seatsSource = readFileSync(SEATS, "utf8");
const hostSeats = new Set(closedSet(seatsSource, "HOST_SEATS"));
const clientSeats = new Set(closedSet(seatsSource, "CLIENT_SEATS"));

/** What each feature directory says about itself. */
const features = new Map();
if (existsSync(FEATURES)) {
	for (const name of readdirSync(FEATURES)) {
		const directory = join(FEATURES, name);
		if (!statSync(directory).isDirectory()) continue;
		const where = posix(relative(ROOT, directory));
		const manifestPath = join(directory, "naveti.feature.json");
		const packagePath = join(directory, "package.json");
		if (!existsSync(packagePath)) {
			fail(where, "a feature directory with no package.json");
			continue;
		}
		const manifest = existsSync(manifestPath)
			? JSON.parse(readFileSync(manifestPath, "utf8"))
			: undefined;
		if (manifest === undefined) {
			fail(where, "no naveti.feature.json; the manifest is how a feature states its id, seats and requires");
			continue;
		}
		if (manifest.id !== name) {
			fail(`${where}/naveti.feature.json`, `id "${String(manifest.id)}" does not match the directory "${name}"`);
		}
		const declared = manifest.seats ?? {};
		for (const seat of declared.host ?? []) {
			if (!hostSeats.has(seat)) {
				fail(`${where}/naveti.feature.json`, `host seat "${seat}" is outside the closed set (${[...hostSeats].join(", ")})`);
			}
		}
		for (const seat of declared.client ?? []) {
			if (!clientSeats.has(seat)) {
				fail(`${where}/naveti.feature.json`, `client seat "${seat}" is outside the closed set (${[...clientSeats].join(", ")})`);
			}
		}
		const manifestOfPackage = JSON.parse(readFileSync(packagePath, "utf8"));
		features.set(manifest.id, {
			name,
			where,
			hasClientFace: manifestOfPackage.exports?.["./client"] !== undefined,
			requires: manifest.requires ?? [],
		});
	}
}

const server = composeIds(SERVER_COMPOSE);
const web = composeIds(WEB_COMPOSE);

if (server === undefined) {
	fail(posix(relative(ROOT, SERVER_COMPOSE)), "the server compose is gone; this guard has nothing to compare against");
} else {
	for (const id of server) {
		if (!features.has(id)) {
			fail(posix(relative(ROOT, SERVER_COMPOSE)), `lists "${id}", which is not a feature directory with a manifest (a ghost entry)`);
		}
	}
	for (const [id, feature] of features) {
		if (!server.includes(id)) {
			fail(posix(relative(ROOT, SERVER_COMPOSE)), `does not install "${id}", but ${feature.where} exists (a feature nobody runs)`);
		}
	}
}

if (web !== undefined) {
	const installed = new Set(server ?? []);
	for (const id of web) {
		if (!installed.has(id)) {
			fail(posix(relative(ROOT, WEB_COMPOSE)), `renders "${id}", which the server does not install; the web list is a subset of the host list`);
		}
	}
	for (const [id, feature] of features) {
		const listed = web.includes(id);
		if (feature.hasClientFace && !listed) {
			fail(posix(relative(ROOT, WEB_COMPOSE)), `omits "${id}", which exports ./client; a client face nobody mounts never renders`);
		}
		if (!feature.hasClientFace && listed) {
			fail(posix(relative(ROOT, WEB_COMPOSE)), `renders "${id}", which exports no ./client (${feature.where})`);
		}
	}
}

for (const [id, feature] of features) {
	for (const required of feature.requires) {
		if (!features.has(required)) {
			fail(`${feature.where}/naveti.feature.json`, `requires "${required}", which is not an installed feature`);
		}
	}
}

if (failures.length > 0) {
	for (const line of failures) console.error(line);
	console.error(`\n${failures.length} feature-registry violation(s).`);
	process.exit(1);
}
console.log(
	`Feature registry agrees across ${features.size} feature(s), 2 compose list(s) and the seat closed set.`,
);
