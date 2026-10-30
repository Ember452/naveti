import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findWorkspacePackages } from "./package-workspaces.mjs";

export function getPublicWorkspacePackages(root = "packages") {
	return findWorkspacePackages(root)
		.map((directory) => ({
			directory,
			...JSON.parse(readFileSync(join(directory, "package.json"), "utf8")),
		}))
		.filter((pkg) => pkg.private !== true)
		.map(({ directory, name, version }) => ({ directory, name, version }));
}
