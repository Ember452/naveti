import { defineConfig, mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../../vitest.base.ts";

export default mergeConfig(
	sharedTestConfig,
	defineConfig({
		test: {
			name: "ai",
			globals: true,
			testTimeout: 30000, // 30 seconds for API calls
			reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
			silent: "passed-only",
		},
	}),
);
