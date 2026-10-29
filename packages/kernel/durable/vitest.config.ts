import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../../vitest.base.ts";

export default mergeConfig(
	sharedTestConfig,
	defineConfig({
		test: {
			name: "durable",
			// Run in workerd by their own config: `pnpm run test:workers`.
			exclude: [...configDefaults.exclude, "test-workers/**"],
			setupFiles: ["./test/setup-document-retention.ts"],
		},
	}),
);
