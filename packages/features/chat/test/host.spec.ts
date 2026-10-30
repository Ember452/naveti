import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChatConversation, ChatHub } from "@naveti/contracts";
import { openHost } from "@naveti/host";
import { connectInProcess, fauxModels } from "@naveti/host/testing";
import { describe, expect, it } from "vitest";
import chat from "../src/host/index.ts";

/**
 * The feature's own contract, exercised over the platform's in-process lane. The wire itself is covered by the host
 * package's transport conformance and by the composition root's loopback gate; what is tested here is the thing only
 * this feature can get wrong — where its state lives, and what a second conversation sees.
 */

function firstAnswerModels() {
	return fauxModels(["first answer"]);
}

async function withHost(run: (host: Awaited<ReturnType<typeof openHost>>) => Promise<void>): Promise<void> {
	const directory = await mkdtemp(join(tmpdir(), "naveti-chat-"));
	const { models, model } = firstAnswerModels();
	const host = await openHost(
		{ dataDir: join(directory, "data"), cacheDir: join(directory, "cache") },
		{ models, model, workspace: directory, shellPath: process.env.NAVETI_SHELL, onError: () => {} },
	);
	try {
		await host.install([chat]);
		await run(host);
	} finally {
		await host.close();
		await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
	}
}

async function waitFor(done: () => boolean, timeoutMs = 10_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (done()) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error("timed out waiting for the conversation view");
}

describe("chat", () => {
	it("opens the reserved conversation, answers a submit, and shows the answer in the view", async () => {
		await withHost(async (host) => {
			const client = await connectInProcess(host);
			try {
				const hub = await client.get(ChatHub, {});
				// `start` ran before the host listened, so the first client always finds the reserved conversation.
				const list = hub.conversations.value;
				expect(list).toHaveLength(1);
				const root = list[0];
				if (root === undefined) throw new Error("no reserved conversation");

				const conversation = await client.get(ChatConversation, { conversation: root.id });
				expect(conversation.view.value.entries).toEqual([]);

				await conversation.submit({ content: "hello" }, client.context);
				await waitFor(() => JSON.stringify(conversation.view.value).includes("first answer"));
				const kinds = conversation.view.value.entries.map((entry) => entry.kind);
				expect(kinds).toContain("naveti.user");
				expect(kinds).toContain("naveti.assistant");
			} finally {
				await client.close();
			}
		});
	});

	it("keeps the conversation list shared across conversations and their transcripts separate", async () => {
		await withHost(async (host) => {
			const client = await connectInProcess(host);
			try {
				const hub = await client.get(ChatHub, {});
				const rootId = hub.conversations.value[0]?.id;
				if (rootId === undefined) throw new Error("no reserved conversation");

				const created = await hub.create({ title: "second" }, client.context);
				await waitFor(() => hub.conversations.value.length === 2);
				// The list is session-scoped: a second conversation sees both rows, most recent first.
				expect(hub.conversations.value.map((row) => row.title)).toEqual(["second", "New conversation"]);

				const second = await client.get(ChatConversation, { conversation: created.conversation });
				// The transcript is conversation-scoped: the new one starts empty while the first still has none either.
				expect(second.view.value.entries).toEqual([]);
				expect(second.view.value.conversation.id).toBe(created.conversation);
				expect(second.view.value.conversation.id).not.toBe(rootId);

				// Touching the second conversation reorders the shared list, which the first conversation's client sees too.
				await second.submit({ content: "hello" }, client.context);
				await waitFor(() => hub.conversations.value[0]?.id === created.conversation);
			} finally {
				await client.close();
			}
		});
	});
});
