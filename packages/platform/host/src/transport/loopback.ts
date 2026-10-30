// The loopback transport: a WebSocket server bound to the loopback interface, one token, one principal.
//
// It is not a second protocol. The kernel's `Link` is the seam (structure.md §9 rule 1), so this file's whole job is to
// produce one link per accepted connection and hand it to the host. The token exists because "bound to 127.0.0.1" is
// not an authorization: any local process can dial a loopback port, so a connection without the token the app printed
// is refused before it can hold anything.
import { randomBytes } from "node:crypto";
import type { Context } from "@naveti/chord";
import { type Host as ChordHost, type WebSocketLike, webSocketLink } from "@naveti/chord/next";
import {
	LOOPBACK_HOST,
	LOOPBACK_PROTOCOL,
	loopbackUrl,
	type Principal,
	readLoopbackToken,
} from "@naveti/contracts/transport";
import { WebSocketServer } from "ws";

export type ListenOptions = {
	/** 0 (the default) lets the operating system choose; the printed URL carries whichever port it chose. */
	readonly port?: number;
};

/** What `apps/*` prints, and what closes the socket. */
export type Listener = {
	readonly url: string;
	readonly token: string;
	readonly port: number;
	close(): Promise<void>;
};

/**
 * Starts listening. `context` is the parent of the work that arrives on accepted links, as chord's `accept` expects;
 * closing the listener ends the links it accepted, and closing the host ends the rest.
 */
export async function listenLoopback(
	host: ChordHost<Principal>,
	options: ListenOptions,
	context: Context,
): Promise<Listener> {
	const token = randomBytes(32).toString("base64url");
	const server = new WebSocketServer({
		host: LOOPBACK_HOST,
		port: options.port ?? 0,
		// The credential arrives as an offered subprotocol, so a wrong token is refused during the handshake: no frame,
		// no link, nothing to hold. The host echoes the protocol itself, never the token protocol.
		handleProtocols: (protocols) =>
			readLoopbackToken([...protocols].join(",")) === token ? LOOPBACK_PROTOCOL : false,
	});
	await new Promise<void>((resolve, reject) => {
		server.once("listening", resolve);
		server.once("error", reject);
	});

	server.on("connection", (socket) => {
		// `ws`'s WebSocket matches chord's structural `WebSocketLike`; the cast is the price of `ws` exporting classes
		// whose `send` overloads are wider than the interface's.
		host.accept(webSocketLink(socket as unknown as WebSocketLike), { principal: { kind: "owner" } }, context);
	});

	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : (options.port ?? 0);

	let closed = false;
	return {
		url: loopbackUrl(port),
		token,
		port,
		async close() {
			if (closed) return;
			closed = true;
			for (const client of server.clients) client.terminate();
			await new Promise<void>((resolve) => {
				server.close(() => resolve());
			});
		},
	};
}
