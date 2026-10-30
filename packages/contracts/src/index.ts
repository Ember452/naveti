// The contract package's public surface: explicit names only.
//
// No `export *`: this package is the compatibility matrix between the host and every client, so what it exports is the
// promise. A new contract gets its own subpath and a line here.
export {
	ChatConversation,
	type ChatEntry,
	ChatHub,
	type ChatSummary,
	type ChatView,
	chatEntry,
	chatSummary,
	chatView,
} from "./chat.ts";
export {
	LOOPBACK_HOST,
	LOOPBACK_PATH,
	LOOPBACK_PROTOCOL,
	loopbackProtocols,
	loopbackUrl,
	type Principal,
	readLoopbackToken,
} from "./transport.ts";
