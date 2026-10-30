// The wire contract of chat: what the host serves and what every client holds.
//
// It lives here, not in the feature package, for two reasons: `platform/host` must serve it without importing a
// feature (structure.md §5 rule 6), and the web client must hold it without importing the host.
//
// Ids stay integers, the representation durable already uses. The `view` member is a delta of durable's own
// conversation view: every frame's ops are computed on that value, so re-typing ids on the way out would break them.
import { arr, int, map, method, obj, opt, remote, type Static, str, unknown } from "@naveti/chord/next";

/** One transcript entry as a client sees it: durable's `EntryRecord`, whose `model` and `data` stay opaque here. */
export const chatEntry = obj({
	id: int(),
	conversationId: int(),
	kind: str(),
	model: opt(arr(unknown())),
	data: opt(unknown()),
	head: opt(int()),
	edits: opt(arr(unknown())),
	byTaskId: opt(int()),
});

/** The conversation projection a client renders: a window of entries plus durable's built-in documents. */
export const chatView = obj({
	conversation: obj({
		id: int(),
		parent: opt(obj({ conversationId: int(), at: int() })),
		owner: opt(obj({ conversationId: int(), taskId: int() })),
	}),
	entries: arr(chatEntry),
	before: opt(int()),
	docs: map(unknown()),
});

export type ChatEntry = Static<typeof chatEntry>;
export type ChatView = Static<typeof chatView>;

/** One row of the conversation list. A number timestamp, not a `Date`: the wire carries JSON. */
export const chatSummary = obj({ id: int(), title: str(), updatedAt: int() });

export type ChatSummary = Static<typeof chatSummary>;

/**
 * The hub: which conversations exist, and creating one. One object per principal; its state is a session-scoped
 * document, so the list is the same in every conversation.
 */
export const ChatHub = remote("naveti.chat.hub", {
	version: 1,
	params: {},
	variants: {
		owner: {
			state: { conversations: arr(chatSummary) },
			methods: { create: method(obj({ title: str() }), obj({ conversation: int() })) },
		},
	},
});

/**
 * One conversation: its projection as state, and the two things a user does to it. The entries themselves are not
 * here — they are durable's log; `view` is the projection of it, and a feature never opens a second channel.
 */
export const ChatConversation = remote("naveti.chat.conversation", {
	version: 1,
	params: { conversation: int() },
	variants: {
		owner: {
			state: { view: chatView },
			methods: {
				submit: method(obj({ content: str() })),
				interrupt: method(),
			},
		},
	},
});
