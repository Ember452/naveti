import { defineConfig } from "vitest/config";

// One process, one module graph, every package.
//
// Each packages/kernel/* package supplies its own vitest.config.ts (name, timeout,
// special isolation) and is collected here by that filename. Tests stay inside their
// package; only the runner is centralized, so adding a package needs no entry here.
//
// Why the pattern names a file and not a directory: vitest treats every glob match as
// a project location and rejects any match that is not named like a config file. A
// plain README.md dropped next to the packages — which is exactly what happened when
// packages/kernel/README.md was added — broke all six projects while `pnpm check`
// stayed green. `check-vitest-projects` now enforces both halves: nothing but configs
// is collected, and no package directory is left uncollected.
export default defineConfig({
	test: {
		// `.only` silently reduces the run to the marked tests. The static guard
		// (`check-test-integrity.mjs`) catches it in the gate; this catches it at
		// runtime, including in files the walker does not scan.
		allowOnly: false,
		projects: ["packages/*/vitest.config.ts", "packages/*/*/vitest.config.ts", "apps/*/vitest.config.ts"],
	},
});
