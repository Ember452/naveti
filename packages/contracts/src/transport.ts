// The transport declaration this project owns: how a client addresses the host, and who a connection acts for.
//
// The link itself is not declared here. `Link` is a chord interface the kernel already defines (structure.md §9 rule
// 1), so both transports produce one and nothing in this file replaces it. What chord cannot know is our URL shape and
// our principal, and both ends have to agree on those, so they are here — pure strings and one pure parser, no I/O.

/**
 * Who a connection acts for. Two roles exist and both are needed: `owner` is the person at this machine — what the
 * platform stamps on an accepted loopback link, and therefore what a feature's factory always sees; `server` is the
 * other end of that link, what a client says its parent is when it connects. Remote clients (a phone) add their own
 * principals, with their own credentials, when that transport exists.
 */
export type Principal = { readonly kind: "owner" } | { readonly kind: "server" };

/** Loopback is bound to the loopback interface, never to a wildcard address. */
export const LOOPBACK_HOST = "127.0.0.1";

/** The path every loopback connection uses; the token rides in its query. */
export const LOOPBACK_PATH = "/";

/** What `apps/server` prints and what a client dials. */
export function loopbackUrl(port: number, token: string): string {
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError(`Not a TCP port: ${String(port)}`);
	if (token.length === 0) throw new TypeError("A loopback URL needs a token");
	return `ws://${LOOPBACK_HOST}:${port}${LOOPBACK_PATH}?token=${encodeURIComponent(token)}`;
}

/**
 * The token a request URL carries, or `undefined`. The host's upgrade handler calls this before it accepts a link:
 * a connection without the printed token is refused, so a stray local process cannot drive the conversation.
 */
export function readLoopbackToken(url: string | undefined): string | undefined {
	if (url === undefined) return undefined;
	let parsed: URL;
	try {
		parsed = new URL(url, `http://${LOOPBACK_HOST}`);
	} catch {
		return undefined;
	}
	const token = parsed.searchParams.get("token");
	return token === null || token === "" ? undefined : token;
}
