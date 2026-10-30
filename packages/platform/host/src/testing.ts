// A client for code that lives inside the host process: feature tests and the composition root's end-to-end gate.
//
// It is a thin platform surface on purpose. A feature must not import `@naveti/chord` (check-package-layers keeps the
// kernel out of a feature's dependencies), so a feature test cannot build a client host itself; and the gate wants to
// drive the real socket, not a shortcut. Both get one function and a `Client` that is only `get` and `close`.
import { createModels, fauxAssistantMessage, fauxProvider, fauxText, type Models } from "@naveti/ai";
import type { Context } from "@naveti/chord";
import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
import {
	type Contract,
	createHost,
	type ParamsOf,
	type Reference,
	type WebSocketLike,
	webSocketLink,
} from "@naveti/chord/next";
import type { Principal } from "@naveti/contracts/transport";
import type { ModelRef } from "@naveti/durable";
import type { Host } from "./host.ts";

/**
 * A deterministic model for tests: one scripted reply per request, no credentials, no network. It lives here so a
 * feature's tests never import `@naveti/ai` themselves — the kernel stays out of a feature's package.json entirely.
 */
export function fauxModels(replies: readonly string[]): { models: Models; model: ModelRef } {
	const faux = fauxProvider();
	faux.setResponses(replies.map((reply) => fauxAssistantMessage([fauxText(reply)])));
	const models = createModels();
	models.setProvider(faux.provider);
	return { models, model: { provider: "faux", modelId: "faux-1" } };
}

export type Client = {
	/** The context every call and watch takes. Cancelling it ends the client's watches, not the host. */
	readonly context: Context;
	get<C extends Contract>(contract: C, params: ParamsOf<C>): Promise<Reference<C>>;
	close(): Promise<void>;
};

function wrap(host: ReturnType<typeof createHost<Principal>>): Client {
	return {
		context: BACKGROUND_CONTEXT,
		get: (contract, params) => host.get(contract, params, BACKGROUND_CONTEXT),
		close: () => host.close(BACKGROUND_CONTEXT),
	};
}

/** A client joined to `host` over an in-process link: no port, no token, same contract and same code path. */
export async function connectInProcess(host: Host): Promise<Client> {
	const client = createHost<Principal>({ onError: () => {} });
	client.connect(host.acceptInProcess(), { principal: { kind: "server" } }, BACKGROUND_CONTEXT);
	await client.load([], BACKGROUND_CONTEXT);
	return wrap(client);
}

/** A client dialing the URL the host printed: the lane a browser takes, minus the browser. */
export async function connectLoopback(url: string): Promise<Client> {
	const socket = new WebSocket(url);
	const client = createHost<Principal>({ onError: () => {} });
	client.connect(
		webSocketLink(socket as unknown as WebSocketLike),
		{ principal: { kind: "server" } },
		BACKGROUND_CONTEXT,
	);
	await client.load([], BACKGROUND_CONTEXT);
	return wrap(client);
}
