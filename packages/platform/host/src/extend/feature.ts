// What a feature is, and what it may do at install time.
//
// `install` runs once, synchronously, while the platform assembles the host: it declares contributions, it does not
// perform work. Anything that answers a request belongs in a served method; anything that must happen at startup
// belongs in `start`, which the platform awaits before it listens.
import type { Context } from "@naveti/chord";
import type { Contract } from "@naveti/chord/next";
import type { Harness, PromptSection, ToolRegistration } from "@naveti/durable";
import type { FeatureFactory } from "./serve.ts";

/** The contribution points a feature may use while it installs. Each one is a seat the platform owns. */
export type FeatureContext = {
	/** The host's harness. Conversations, docs and submissions are the kernel's API; this is how a feature reaches it. */
	readonly harness: Harness;
	/** The context for work the feature starts itself. A request carries its own context instead. */
	readonly context: Context;
	/** The `tool` seat. Names must be unique across the host's extensions. */
	readonly tools: { register(tool: ToolRegistration): void };
	/** The `section` seat. Keys must be unique across the host's extensions. */
	readonly sections: { add(section: PromptSection): void };
	/**
	 * Mount a wire object: the contract says what a client sees, the factory says how each principal's object answers.
	 * The platform serves it on the one transport every client already speaks; a feature never opens its own channel.
	 */
	serve<C extends Contract>(contract: C, factory: FeatureFactory<C>): void;
};

export type Feature = {
	/** Lower-case words joined by dashes; the package is `@naveti/feature-<id>`. */
	readonly id: string;
	install(context: FeatureContext): void;
	/** Runs after the host is assembled and before it listens. The place for "ensure the first conversation exists". */
	start?(context: FeatureContext): void | Promise<void>;
};

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Identity function, like `defineTool`: it types the descriptor and rejects an id no package name could carry. */
export function defineFeature(feature: Feature): Feature {
	if (!ID.test(feature.id)) throw new TypeError(`Feature id ${JSON.stringify(feature.id)} must match ${ID}`);
	return feature;
}
