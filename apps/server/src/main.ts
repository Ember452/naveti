// The composition root. Five steps and a shutdown handler; everything it decides is a path, a model or an address.
//
// Paths are computed here because this is the only layer that knows the machine (structure.md §5 rule 8); the platform
// takes them as an argument. The address and the token are printed on separate lines: the token never becomes part of a
// URL, so it cannot leak through a query string, a referrer header or a proxy log.
import { homedir } from "node:os";
import { join } from "node:path";
import { type HostPaths, openHost } from "@naveti/host";
import { compose } from "./compose.ts";
import { modelsFromEnvironment } from "./models.ts";

const env = process.env;
const dataDir = env.NAVETI_DATA_DIR ?? join(homedir(), ".naveti");
const paths: HostPaths = {
	dataDir,
	cacheDir: join(dataDir, "cache"),
	...(env.NAVETI_WEB_DIR === undefined ? {} : { webAssetsDir: env.NAVETI_WEB_DIR }),
};

const { models, model } = modelsFromEnvironment(env);
const host = await openHost(paths, {
	models,
	model,
	...(env.NAVETI_SHELL === undefined ? {} : { shellPath: env.NAVETI_SHELL }),
	...(env.NAVETI_WORKSPACE === undefined ? {} : { workspace: env.NAVETI_WORKSPACE }),
	onError: (error) => console.error("host:", error),
});

// One await per line of compose; a feature that fails to load fails the start, which is what a user wants to see.
await host.install(await Promise.all(compose.map(async (entry) => (await entry.host()).default)));

const listener = await host.listen(env.NAVETI_PORT === undefined ? {} : { port: Number(env.NAVETI_PORT) });

console.log(`naveti host listening on ${listener.url}`);
console.log(`token: ${listener.token}`);
console.log(`data: ${dataDir}`);
console.log(`model: ${model.provider} / ${model.modelId}`);

let stopping = false;
async function shutdown(signal: string): Promise<void> {
	if (stopping) return;
	stopping = true;
	console.log(`\n${signal}: closing`);
	await host.close();
	process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
