// The conversation list: one session-scoped document, written only where a conversation is created or used.
//
// Scope is the decision that fails silently: a `conversation`-scoped list would look right in the first conversation and
// be empty in the second, so it is `session` — one per store, shared by every conversation on this machine.

import type { ChatSummary } from "@naveti/contracts";
import { defineDoc, type JsonObject } from "@naveti/host/extend/docs";

export type ChatConversations = { items: ChatSummary[] } & JsonObject;

export const ChatConversationsDoc = defineDoc<ChatConversations>({
	kind: "naveti.chat.conversations",
	version: 1,
	scope: "session",
	initial: () => ({ items: [] }),
	// Small and frequently replaced: storing each change as a base keeps a new client's snapshot cheap to build.
	checkpointWhen: () => true,
});

/** The title the root conversation starts with; a rename is a list edit, not a second document. */
export const DEFAULT_TITLE = "New conversation";
