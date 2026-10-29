import { defineConfig } from "vitest/config";

/**
 * Shared test defaults, merged into every package's `vitest.config.ts`.
 *
 * Three things live here because they must not drift between packages:
 *
 *   - `resolve.conditions` / `ssr.resolve.conditions`: without the `source`
 *     condition a package resolves its workspace dependencies through `dist`, so a
 *     stale build would make the suite test old code and still pass.
 *   - `testTimeout`: the durable heap tests sit just above the default 5 s.
 *   - `allowOnly: false`: a stray `.only` would otherwise reduce the run to the
 *     marked tests and exit 0.
 *
 * The root `vitest.config.ts` collects the packages as projects; each package adds
 * only its own name and the settings it genuinely needs:
 *
 *     export default mergeConfig(sharedTestConfig, defineConfig({ test: { name } }));
 *
 * An earlier version of this file exported 19 hardcoded source paths and was
 * imported by nobody; both halves of that mistake are fixed here.
 */
export const sharedTestConfig = defineConfig({
	test: {
		environment: "node",
		testTimeout: 60000,
		allowOnly: false,
	},
	resolve: { conditions: ["source"] },
	ssr: { resolve: { conditions: ["source"] } },
});

export default sharedTestConfig;
