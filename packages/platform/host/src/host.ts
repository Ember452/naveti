// `openHost`: the one place where storage, the kernel, the seat table and the transport are put together.
//
// The order is the design (docs/kernel/seats.md §2): open the store, open the durable harness over it, install the
// host's own capabilities, serve features' contracts, then listen. Every step is the platform's decision, so an app
// passes paths, a model and a model choice and nothing else. Features arrive through `install` and are the only thing
// that differs between one product and the next: adding one changes a line in `compose.ts`, never this file.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Models } from "@naveti/ai";
import type { Context } from "@naveti/chord";
import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
import {
	type Host as ChordHost,
	type Contract,
	createHost,
	defineFacet,
	type Link,
	memoryLinkPair,
	openStore,
	type Self,
	sqliteBackend,
} from "@naveti/chord/next";
import { openNodeSqliteDatabase } from "@naveti/chord/sqlite/node";
import type { Principal } from "@naveti/contracts/transport";
import { createRegistry, Harness, type ModelRef, type Registry } from "@naveti/durable";
import { NodeExecutionEnv } from "@naveti/durable/env/node";
import { StoreStorage } from "@naveti/durable/storage/store";
import { CodingTools } from "@naveti/durable/tools";
import type { Feature, FeatureContext } from "./extend/feature.ts";
import type { FeatureFactory, FeatureSelf } from "./extend/serve.ts";
import { DATABASE_FILE, type HostPaths } from "./paths.ts";
import { type Listener, type ListenOptions, listenLoopback } from "./transport/loopback.ts";

/** The name durable's records are claimed under in the store. One host, one owner. */
const OWNER = "naveti";

export type HostOptions = {
	/** Where model requests go. The app decides (a provider, or the faux provider in tests); the platform just passes it. */
	readonly models: Models;
	/** The model a new conversation starts with. A conversation's own doc can change it later. */
	readonly model: ModelRef;
	/** The shell the `bash` tool runs through. Absent: the kernel's auto-detection, which finds Git Bash or PATH. */
	readonly shellPath?: string;
	/** The agent's working directory when a conversation has none of its own. */
	readonly workspace?: string;
	/** Background failures the host cannot attribute to a caller. A local app logs them. */
	readonly onError?: (error: unknown) => void;
};

/** A feature's wire object before chord sees it: the contract, and the factory that answers for one principal. */
type Mount = { readonly contract: Contract; readonly factory: FeatureFactory<Contract> };

export interface Host {
	readonly harness: Harness;
	/** Installs feature contributions, loads their contracts, then runs their `start` hooks. */
	install(features: readonly Feature[]): Promise<void>;
	listen(options?: ListenOptions): Promise<Listener>;
	/**
	 * One end of an in-process link, accepted by this host; the caller holds the other. It is a transport, not a test
	 * hook: an embedded host (a window in the same process) joins this way, and the gate uses it so the fast lane and the
	 * socket lane run the same contract over the same code.
	 */
	acceptInProcess(): Link;
	/** Stops listening, closes links, then closes the harness and the store. Idempotent. */
	close(): Promise<void>;
}

class HostImpl implements Host {
	readonly harness: Harness;
	readonly #model: ModelRef;
	readonly #store: Awaited<ReturnType<typeof openStore>>;
	readonly #registry: Registry;
	readonly #chord: ChordHost<Principal>;
	readonly #context: Context;
	readonly #listeners: Listener[] = [];
	#installed = false;
	#closed = false;

	constructor(parts: {
		harness: Harness;
		model: ModelRef;
		store: Awaited<ReturnType<typeof openStore>>;
		registry: Registry;
		chord: ChordHost<Principal>;
		context: Context;
	}) {
		this.harness = parts.harness;
		this.#model = parts.model;
		this.#store = parts.store;
		this.#registry = parts.registry;
		this.#chord = parts.chord;
		this.#context = parts.context;
	}

	async install(features: readonly Feature[]): Promise<void> {
		if (this.#installed) throw new Error("install() runs once, before listen()");
		this.#installed = true;
		const mounts: Mount[] = [];
		const contexts: { feature: Feature; context: FeatureContext }[] = [];
		for (const feature of features) {
			const tools: Parameters<FeatureContext["tools"]["register"]>[0][] = [];
			const sections: Parameters<FeatureContext["sections"]["add"]>[0][] = [];
			const context = this.#featureContext(tools, sections, mounts);
			feature.install(context);
			// One extension per feature: its name identifies it in selection, hook attribution and error reports.
			if (tools.length > 0 || sections.length > 0) {
				this.#registry.install({ name: feature.id, tools, sections });
			}
			contexts.push({ feature, context });
		}
		if (mounts.length > 0) await this.#loadContracts(mounts);
		// Startup work runs after the objects exist: `start` may create the conversation a client will hold.
		for (const { feature, context } of contexts) await feature.start?.(context);
	}

	async listen(options: ListenOptions = {}): Promise<Listener> {
		if (this.#closed) throw new Error("The host is closed");
		const listener = await listenLoopback(this.#chord, options, this.#context);
		this.#listeners.push(listener);
		return listener;
	}

	acceptInProcess(): Link {
		if (this.#closed) throw new Error("The host is closed");
		const [hostEnd, clientEnd] = memoryLinkPair();
		this.#chord.accept(hostEnd, { principal: { kind: "owner" } }, this.#context);
		return clientEnd;
	}

	async close(): Promise<void> {
		if (this.#closed) return;
		this.#closed = true;
		for (const listener of this.#listeners.splice(0)) await listener.close();
		await this.#chord.close(this.#context);
		await this.harness.close(this.#context);
		await this.#store.close(this.#context);
	}

	#featureContext(
		tools: Parameters<FeatureContext["tools"]["register"]>[0][],
		sections: Parameters<FeatureContext["sections"]["add"]>[0][],
		mounts: Mount[],
	): FeatureContext {
		return {
			harness: this.harness,
			model: this.#model,
			context: this.#context,
			tools: { register: (tool) => tools.push(tool) },
			sections: { add: (section) => sections.push(section) },
			// The erasure is the collection point: `FeatureFactory<C>` is safe per contract, and the array holds many.
			serve: (contract, factory) => mounts.push({ contract, factory: factory as FeatureFactory<Contract> }),
		};
	}

	async #loadContracts(mounts: readonly Mount[]): Promise<void> {
		const harness = this.harness;
		const model = this.#model;
		const facet = defineFacet<Principal>((api) => {
			for (const { contract, factory } of mounts) {
				// chord types `serve` by the contract's declaration; these are the same values with a widened parameter.
				// The cast belongs here, at the one place that erases a per-feature generic, and nowhere else.
				const serve = api.serve as (contract: unknown, factory: unknown) => void;
				serve(contract, (params: never, principal: Principal, self: Self) =>
					factory(params, principal, selfFor(harness, model, self)),
				);
			}
		});
		await this.#chord.load([{ name: "naveti.features", facet }], this.#context);
	}
}

/** chord's `self`, narrowed to what a feature may use, plus what the platform opened. */
function selfFor(harness: Harness, model: ModelRef, self: Self): FeatureSelf {
	return {
		harness,
		model,
		follow: (attach) => self.follow(attach),
		derive: (sources, compute) => self.derive(sources, compute),
		get: (contract, params) => self.get(contract, params),
	};
}

/**
 * Opens the host and leaves it unlistened. The caller installs features, then listens; that split is what lets
 * `apps/server` keep its five steps and lets a test install a different compose without touching the platform.
 */
export async function openHost(paths: HostPaths, options: HostOptions): Promise<Host> {
	const context = BACKGROUND_CONTEXT;
	await mkdir(paths.dataDir, { recursive: true });
	await mkdir(paths.cacheDir, { recursive: true });

	const database = await openNodeSqliteDatabase(join(paths.dataDir, DATABASE_FILE));
	const store = await openStore(sqliteBackend(database), context);
	try {
		const storage = await StoreStorage.open(store, OWNER, context);
		const registry = createRegistry();
		// The host's own capabilities, not a feature's: read/write/edit/bash belong to every conversation this host
		// serves. A feature that wants a tool adds it through its own extension; neither makes the other recompile.
		registry.install(CodingTools);
		const harness = await Harness.open(
			storage,
			{
				models: options.models,
				registry,
				// No `settings.extensions`: every installed extension is selected, so a feature installed later is live
				// without the platform naming it here.
				env: (target) =>
					new NodeExecutionEnv({
						cwd: target.cwd ?? options.workspace ?? process.cwd(),
						shellPath: options.shellPath,
					}),
			},
			context,
		);
		const chord = createHost<Principal>({
			store,
			principal: { kind: "owner" },
			onError: (error) => (options.onError ?? console.error)(error),
		});
		return new HostImpl({ harness, model: options.model, store, registry, chord, context });
	} catch (error) {
		await store.close(context).catch(() => {});
		throw error;
	}
}
