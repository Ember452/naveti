import { defineConfig, mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../../vitest.base.ts";

export default mergeConfig(
	sharedTestConfig,
	defineConfig({
		test: {
			name: "host",
			reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
		},
	}),
);
