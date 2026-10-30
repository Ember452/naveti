// The hub: which conversations exist, and creating one.
//
// Its state is the session document, narrowed to the array the contract promises — the client sees a list, not the
// document's layout, so the document can grow a field without a wire version bump.
import type { ChatHub } from "@naveti/contracts";
import type { FeatureFactory } from "@naveti/host/extend/serve";
import type { Context, Harness, ModelRef } from "@naveti/host/extend/types";
import { ChatConversationsDoc, DEFAULT_TITLE } from "./doc.ts";

export const hubFactory: FeatureFactory<typeof ChatHub> = (_params, _principal, self) => ({
	variant: "owner",
	members: {
		conversations: self.derive(
			[self.follow((observer, context) => self.harness.observeDoc(ChatConversationsDoc, observer, context))],
			([document]) => [...document.items],
		),
		create: async ({ title }, context) => {
			const created = await self.harness.createConversation(
				{
					ownership: { kind: "ownerless" },
					agent: { model: self.model },
					// The list entry is written in the creating commit: a crash between the two would leave a
					// conversation nobody can find.
					init: async (tx, id) => {
						const document = await tx.doc(ChatConversationsDoc);
						document.items.unshift({ id, title, updatedAt: Date.now() });
					},
				},
				context,
			);
			return { conversation: created.id };
		},
	},
});

/**
 * Makes sure the reserved conversation exists and appears in the list. Runs from `start`, after the contracts are
 * mounted and before the host listens, so the first client always finds something to open.
 */
export async function ensureRoot(harness: Harness, model: ModelRef, context: Context): Promise<void> {
	const root = await harness.root(context, { agent: { model } });
	await harness.commit(async (tx) => {
		const document = await tx.doc(ChatConversationsDoc);
		if (document.items.some((item) => item.id === root.id)) return;
		document.items.unshift({ id: root.id, title: DEFAULT_TITLE, updatedAt: Date.now() });
	}, context);
}
