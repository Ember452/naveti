import { defineConfig } from "vitest/config";

/**
 * One process, one module graph, every package.
 *
 * Each `packages/kernel/*` directory is a project and supplies its own
 * `vitest.config.ts` (name, timeout, special isolation). Tests stay inside their
 * package; only the runner is centralized, so adding a package needs no entry
 * here.
 */
export default defineConfig({
	test: {
		// `.only` silently reduces the run to the marked tests. The static guard
		// (`check-test-integrity.mjs`) catches it in the gate; this catches it at
		// runtime, including in files the walker does not scan.
		allowOnly: false,
		projects: ["packages/kernel/*"],
	},
});
