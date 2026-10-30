import { defineConfig, mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../../vitest.base.ts";

export default mergeConfig(
	sharedTestConfig,
	defineConfig({
		test: {
			// The package's directory name is `chat`; the project names stay what `--project` expects.
			name: "chat",
			reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
		},
	}),
);
