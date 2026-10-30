// The browser's connection to the host: one WebSocket, one contract set, one context. Everything the shell renders
// comes through here; the shell never opens a second channel and never touches the kernel.
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
import { loopbackProtocols, type Principal } from "@naveti/contracts/transport";

/** What a panel gets: the context every call takes, and `get` for a contract it holds. */
export type Connection = {
	readonly context: Context;
	get<C extends Contract>(contract: C, params: ParamsOf<C>): Promise<Reference<C>>;
	close(): Promise<void>;
};

/**
 * Dials the URL the host printed, with the token as an offered subprotocol. The socket is the browser's own
 * `WebSocket`; chord's link adapts it, so the same frames the gate exercises in Node arrive here. A wrong token fails
 * during the handshake rather than after a first frame.
 *
 * The dial is part of the promise: `client.load([])` needs no link, so resolving before the socket opens would report a
 * connection that does not exist and leave every hold loading forever. A typo in the address, a host that is not
 * running, or a rejected token all reject here with something the shell can show.
 */
export async function connect(url: string, token: string): Promise<Connection> {
	const socket = new WebSocket(url, [...loopbackProtocols(token)]);
	await opened(socket, url);

	const client = createHost<Principal>({
		onError: (error) => console.error("client:", error),
	});
	client.connect(
		webSocketLink(socket as unknown as WebSocketLike),
		{ principal: { kind: "server" } },
		BACKGROUND_CONTEXT,
	);
	await client.load([], BACKGROUND_CONTEXT);
	return {
		context: BACKGROUND_CONTEXT,
		get: (contract, params) => client.get(contract, params, BACKGROUND_CONTEXT),
		close: () => client.close(BACKGROUND_CONTEXT),
	};
}

/** Resolve once the handshake completes, reject with a sentence when it cannot: a dead socket must not look idle. */
function opened(socket: WebSocket, url: string): Promise<void> {
	return new Promise((resolve, reject) => {
		socket.addEventListener("open", () => resolve(), { once: true });
		socket.addEventListener(
			"error",
			() => reject(new Error(`cannot reach ${url} — is the host running, and is the token the one it printed?`)),
			{ once: true },
		);
	});
}
