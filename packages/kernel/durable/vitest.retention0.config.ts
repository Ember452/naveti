import { defineConfig, mergeConfig } from "vitest/config";
import mainConfig from "./vitest.config.ts";

/**
 * Second pass of `pnpm test`: the document-retention window is switched off so the
 * expired-document paths run too.
 *
 * `test.env` replaces the shell prefix `PI_DURABLE_DOCUMENT_RETENTION_MS=0`, which
 * cmd.exe (npm/pnpm's default script shell on Windows) cannot express. Merging the
 * main config keeps `setupFiles`, `exclude` and the `source` conditions identical,
 * so the two passes stay comparable.
 */
export default mergeConfig(
	mainConfig,
	defineConfig({
		test: {
			name: "durable-retention0",
			env: { PI_DURABLE_DOCUMENT_RETENTION_MS: "0" },
		},
	}),
);
