#!/usr/bin/env node
/**
 * Fails on production advisories unless they are reviewed and accepted here.
 *
 * Runs `pnpm audit --prod --json`, the pnpm equivalent of the removed
 * `npm audit --omit=dev`. Set `NAVETI_AUDIT_REPORT` to a saved report to run it
 * offline or from a test; the shape it reads is pnpm's, whose advisories carry the
 * resolution paths — that is the difference that matters when deciding whether an
 * advisory is reachable, so it is printed.
 *
 * Every accepted advisory must name the affected package and explain why it does not
 * apply, the same bar upstream used. They live in `scripts/deps-audit-accept.json` so
 * that granting one is a reviewable data change instead of an edit to the checker, and
 * an entry that stops matching is reported: a stale acceptance is a suppression nobody
 * reviewed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const AUDIT_LEVEL = "moderate";
const SEVERITIES = ["info", "low", "moderate", "high", "critical"];
const ACCEPT_FILE = process.env.NAVETI_AUDIT_ACCEPT ?? join(process.cwd(), "scripts", "deps-audit-accept.json");

/** @type {Record<string, { package: string; reason: string }>} */
const acceptedAdvisories = (() => {
	if (!existsSync(ACCEPT_FILE)) return {};
	try {
		return JSON.parse(readFileSync(ACCEPT_FILE, "utf8"));
	} catch (error) {
		console.error(`${ACCEPT_FILE} is not valid JSON: ${error.message}`);
		process.exit(1);
	}
})();

function loadReport() {
	if (process.env.NAVETI_AUDIT_REPORT) {
		return readFileSync(process.env.NAVETI_AUDIT_REPORT, "utf8");
	}
	// Windows ships pnpm as a .CMD shim, which Node refuses to spawn without a shell.
	// The command is passed as one fixed string with no interpolated input, which avoids
	// the shell-plus-args path Node deprecates (DEP0190).
	const result = spawnSync("pnpm audit --prod --json", {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		shell: true,
	});
	if (result.error) throw result.error;
	return result.stdout;
}

let report;
try {
	report = JSON.parse(loadReport());
} catch {
	console.error("pnpm audit did not produce a JSON report. Is the registry reachable?");
	process.exit(1);
}

if (!report.advisories || !report.metadata) {
	console.error(`Unexpected audit report shape: ${Object.keys(report).join(", ") || "(empty)"}`);
	process.exit(1);
}

const minimum = SEVERITIES.indexOf(AUDIT_LEVEL);
const seenAccepted = new Set();
const failures = [];

for (const advisory of Object.values(report.advisories)) {
	const id = advisory.github_advisory_id ?? String(advisory.id);
	const accepted = acceptedAdvisories[id];
	if (accepted && accepted.package === advisory.module_name) {
		seenAccepted.add(id);
		continue;
	}
	if (SEVERITIES.indexOf(advisory.severity) < minimum) continue;
	const paths = (advisory.findings ?? []).flatMap((finding) => finding.paths ?? []);
	failures.push({
		id,
		line: `${advisory.module_name} ${advisory.vulnerable_versions} [${advisory.severity}] ${advisory.title}`,
		reachable: paths.slice(0, 3),
		url: advisory.url,
		fixed: advisory.patched_versions,
	});
}

for (const id of seenAccepted) {
	console.log(`accepted ${id} (${acceptedAdvisories[id].package}): ${acceptedAdvisories[id].reason}`);
}

for (const id of Object.keys(acceptedAdvisories)) {
	if (!seenAccepted.has(id)) {
		console.warn(`stale acceptance ${id}: nothing matches it any more, remove it from scripts/deps-audit-accept.json`);
	}
}

if (failures.length > 0) {
	console.error(`\n${failures.length} unaccepted advisor${failures.length === 1 ? "y" : "ies"} at or above ${AUDIT_LEVEL}:`);
	for (const failure of failures) {
		console.error(`- ${failure.id} ${failure.line}`);
		console.error(`    fixed in: ${failure.fixed || "no release"}`);
		for (const path of failure.reachable) console.error(`    reached via: ${path.split(">").join(" > ")}`);
		console.error(`    ${failure.url}`);
	}
	process.exit(1);
}

console.log(`No unaccepted advisories at or above ${AUDIT_LEVEL} (${Object.keys(report.advisories).length} total reported).`);
