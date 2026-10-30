// The wire promise, pinned. `tests/golden/chat-wire.json` holds what every client depends on: each contract's name,
// version and fingerprint (chord hashes the normalized declaration, so any change to a member or a schema moves it),
// and the persisted document's kind and version, which a change to means a data migration.
//
// It lives at the composition root because that is where the dependencies exist — the golden *file* is shared, the
// assertion is not a feature's private business.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ChatConversation, ChatHub } from "@naveti/contracts";
import { ChatConversationsDoc } from "@naveti/feature-chat";
import { describe, expect, it } from "vitest";

const golden = JSON.parse(
	readFileSync(fileURLToPath(new URL("../../../tests/golden/chat-wire.json", import.meta.url)), "utf8"),
) as {
	wire: Record<string, { version: number; fingerprint: string }>;
	doc: { kind: string; version: number };
};

describe("the chat wire contract", () => {
	it("still has the names, versions and fingerprints the golden file pins", () => {
		expect({
			[ChatHub.name]: { version: ChatHub.version, fingerprint: ChatHub.fingerprint },
			[ChatConversation.name]: { version: ChatConversation.version, fingerprint: ChatConversation.fingerprint },
		}).toEqual(golden.wire);
	});

	it("still persists the conversation list under the kind and version the golden file pins", () => {
		expect({ kind: ChatConversationsDoc.definition.kind, version: ChatConversationsDoc.definition.version }).toEqual(
			golden.doc,
		);
	});
});
