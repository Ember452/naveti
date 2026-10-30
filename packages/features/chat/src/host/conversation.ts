// One conversation as a client sees it: the projection durable already computes, plus the two things a user does.
//
// `view` is a follow source over `harness.observeConversation`, not a copy: every frame's ops are computed on durable's
// own value, so the client's updates are as cheap as the server's, and there is no second transcript to reconcile.
import type { ChatConversation, ChatView } from "@naveti/contracts";
import type { FeatureFactory, FeatureSelf, Watchable } from "@naveti/host/extend/serve";
import type { Context, ConversationId } from "@naveti/host/extend/types";
import { ChatConversationsDoc } from "./doc.ts";

/** Moves the conversation to the top of the list; a chat list that never reorders is a list nobody trusts. */
async function touch(self: FeatureSelf, id: number, context: Context): Promise<void> {
	await self.harness.commit(async (tx) => {
		const document = await tx.doc(ChatConversationsDoc);
		const item = document.items.find((entry) => entry.id === id);
		if (item === undefined) return;
		item.updatedAt = Date.now();
		document.items.sort((left, right) => right.updatedAt - left.updatedAt);
	}, context);
}

export const conversationFactory: FeatureFactory<typeof ChatConversation> = ({ conversation }, _principal, self) => {
	// The wire id is the kernel's integer with its brand erased; both ends use the same allocation, so this is the one
	// boundary where a number becomes a `ConversationId`.
	const id = conversation as ConversationId;
	return {
		variant: "owner",
		members: {
			// `ConversationView` is deeply readonly while the wire's static type is mutable JSON. No copy: chord computes
			// this member's ops on the value it is given, and a re-typed copy would cost one clone per commit.
			view: self.follow((observer, context) =>
				self.harness.observeConversation(id, observer, context, { min: 50 }),
			) as unknown as Watchable<ChatView>,
			submit: async ({ content }, context) => {
				const target = await self.harness.conversation(id, context);
				// A stale id from a client (a deleted or never-created conversation) is an error the caller can show.
				if (target === undefined) throw new Error(`Conversation ${conversation} does not exist`);
				await target.submit({ type: "input", content }, context);
				await touch(self, conversation, context);
				return null;
			},
			interrupt: async (context) => {
				const target = await self.harness.conversation(id, context);
				await target?.abort(context);
				return null;
			},
		},
	};
};
