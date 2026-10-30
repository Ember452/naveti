// Which model this deployment talks to. The app decides, not the platform: a provider and a model id come from the
// environment, and the default is the faux provider so a checkout starts without credentials and answers
// deterministically.
//
// The providers this build can reach are the ones imported here. Adding one is an app change (an import and a map
// entry), not a platform one — which is the seam structure.md §9 describes: the kernel declares the adapter interface,
// the app selects the implementation.
import { createModels, fauxAssistantMessage, fauxProvider, fauxText, type Models } from "@naveti/ai";
import { anthropicProvider } from "@naveti/ai/providers/anthropic";
import type { ModelRef } from "@naveti/durable";

/** The real providers this build carries. `faux` is handled separately: it needs a script, not a credential. */
const PROVIDERS = { anthropic: anthropicProvider } as const;

type RealProvider = keyof typeof PROVIDERS;

/** What the faux provider says, once per request and then again from the start. */
const FAUX_REPLIES = [
	"This build is answering from the faux provider. Set NAVETI_PROVIDER=anthropic and NAVETI_MODEL=<model id> to use a real model.",
	"The faux provider has no model behind it: tools work, the answers are this text.",
];

/**
 * `NAVETI_PROVIDER` (default `faux`) and `NAVETI_MODEL` (required unless the provider is faux). Credentials for a real
 * provider come from its own environment variable, read by the adapter when a request is made.
 */
export function modelsFromEnvironment(env: NodeJS.ProcessEnv): { models: Models; model: ModelRef } {
	const provider = env.NAVETI_PROVIDER ?? "faux";
	if (provider === "faux") {
		const faux = fauxProvider();
		faux.setResponses(FAUX_REPLIES.map((reply) => fauxAssistantMessage([fauxText(reply)])));
		const models = createModels();
		models.setProvider(faux.provider);
		return { models, model: { provider: "faux", modelId: "faux-1" } };
	}
	if (!Object.hasOwn(PROVIDERS, provider)) {
		throw new Error(
			`Unknown NAVETI_PROVIDER ${JSON.stringify(provider)}; this build carries ${Object.keys(PROVIDERS).join(", ")} and faux`,
		);
	}
	const modelId = env.NAVETI_MODEL;
	if (modelId === undefined || modelId === "") {
		throw new Error(`NAVETI_MODEL is required with NAVETI_PROVIDER=${provider}`);
	}
	const models = createModels();
	models.setProvider(PROVIDERS[provider as RealProvider]());
	return { models, model: { provider, modelId } };
}
