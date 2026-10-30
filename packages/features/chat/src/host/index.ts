// The feature's host entry: the only file `compose.ts` names. It declares contributions and nothing else — no request
// is answered here, so the platform can install it before it listens and a crash in one feature cannot take the
// assembly down with it.
import { ChatConversation, ChatHub } from "@naveti/contracts";
import { defineFeature } from "@naveti/host/extend";
import { conversationFactory } from "./conversation.ts";
import { ensureRoot, hubFactory } from "./hub.ts";
import { chatSection } from "./section.ts";

export default defineFeature({
	id: "chat",
	install(ctx) {
		ctx.sections.add(chatSection);
		ctx.serve(ChatHub, hubFactory);
		ctx.serve(ChatConversation, conversationFactory);
	},
	async start({ harness, model, context }) {
		await ensureRoot(harness, model, context);
	},
});
