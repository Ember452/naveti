// The transport declaration this project owns: how a client addresses the host, who a connection acts for, and how the
// token crosses the boundary.
//
// The link itself is not declared here. `Link` is a chord interface the kernel already defines (structure.md §9 rule
// 1), so both transports produce one and nothing in this file replaces it. What chord cannot know is our address, our
// principal and our credential, and both ends have to agree on those.
//
// The token travels as a WebSocket subprotocol, never in the URL. A query string lands in access logs, browser history
// and every proxy between the two ends; a subprotocol is part of the handshake and is not retained anywhere, and the
// server can still refuse the handshake before a single frame exists.

/**
 * Who a connection acts for. Two roles exist and both are needed: `owner` is the person at this machine — what the
 * platform stamps on an accepted loopback link, and therefore what a feature's factory always sees; `server` is the
 * other end of that link, what a client says its parent is when it connects. Remote clients (a phone) add their own
 * principals, with their own credentials, when that transport exists.
 */
export type Principal = { readonly kind: "owner" } | { readonly kind: "server" };

/** Loopback is bound to the loopback interface, never to a wildcard address. */
export const LOOPBACK_HOST = "127.0.0.1";

/** The path every loopback connection uses. It carries nothing: the token is in the handshake (see below). */
export const LOOPBACK_PATH = "/";

/** The protocol both ends speak on the wire; the client offers it, the host echoes it back on success. */
export const LOOPBACK_PROTOCOL = "naveti.1";

/** The prefix the client uses to carry the token inside its offered subprotocols. */
const TOKEN_PREFIX = "naveti.token.";

/** What `apps/server` prints as the address. The token is printed separately and never becomes part of a URL. */
export function loopbackUrl(port: number): string {
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError(`Not a TCP port: ${String(port)}`);
	return `ws://${LOOPBACK_HOST}:${port}${LOOPBACK_PATH}`;
}

/** The subprotocols a client offers: the protocol itself, then the token in a form the host can verify. */
export function loopbackProtocols(token: string): readonly string[] {
	if (token.length === 0) throw new TypeError("A loopback connection needs a token");
	return [LOOPBACK_PROTOCOL, `${TOKEN_PREFIX}${token}`];
}

/**
 * The token a handshake carries, or `undefined`. The host calls this in `handleProtocols`: a connection without a
 * token protocol is refused during the handshake, so a stray local process cannot hold anything.
 */
export function readLoopbackToken(protocolHeader: string | string[] | undefined): string | undefined {
	const header = Array.isArray(protocolHeader) ? protocolHeader.join(",") : protocolHeader;
	if (header === undefined) return undefined;
	for (const offered of header.split(",")) {
		const protocol = offered.trim();
		if (!protocol.startsWith(TOKEN_PREFIX)) continue;
		const token = protocol.slice(TOKEN_PREFIX.length);
		if (token !== "") return token;
	}
	return undefined;
}
