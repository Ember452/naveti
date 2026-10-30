import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai";
import { ChatConversation, ChatHub, type ChatView } from "@naveti/contracts";
import { type Host, openHost } from "@naveti/host";
import { connectLoopback } from "@naveti/host/testing";
// The browser's own connection module, imported without its React surface: this is the code the page dials through.
import { connect as connectWeb } from "@naveti/web/connection";
import { afterEach, describe, expect, it } from "vitest";
import { compose } from "../src/compose.ts";

/**
 * P2's host-side acceptance, at the composition root: the real `compose`, the real loopback socket, a real turn with
 * three tool calls, and a restart that reads the same transcript back from the same database file.
 *
 * The model is the faux provider because the assertion has to be about the durable path, not about a vendor; the
 * assertions never mention a token count or a scripted id, so the same body runs under a real provider by swapping the
 * models object.
 */
const directories: string[] = [];

afterEach(async () => {
	for (const directory of directories.splice(0)) {
		await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
	}
});

function toolCall(name: string, args: Parameters<typeof fauxToolCall>[1], id: string) {
	return fauxAssistantMessage([fauxToolCall(name, args, { id })], { stopReason: "toolUse" });
}

function scriptedModels() {
	const faux = fauxProvider();
	faux.setResponses([
		toolCall("read", { path: "notes.txt" }, "read-1"),
		toolCall("edit", { path: "notes.txt", edits: [{ oldText: "world", newText: "naveti" }] }, "edit-1"),
		toolCall("bash", { command: "cat notes.txt" }, "bash-1"),
		fauxAssistantMessage([fauxText("The file now greets naveti.")]),
	]);
	const models = createModels();
	models.setProvider(faux.provider);
	return models;
}

async function start(directory: string): Promise<Host> {
	const host = await openHost(
		{ dataDir: join(directory, "data"), cacheDir: join(directory, "cache") },
		{
			models: scriptedModels(),
			model: { provider: "faux", modelId: "faux-1" },
			workspace: join(directory, "workspace"),
			shellPath: process.env.NAVETI_SHELL,
			onError: () => {},
		},
	);
	await host.install(await Promise.all(compose.map(async (entry) => (await entry.host()).default)));
	return host;
}

async function waitFor(done: () => boolean, timeoutMs = 60_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (done()) return;
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	throw new Error("timed out waiting for the conversation view");
}

describe("the loopback round", () => {
	it("keeps the client face's own connection module working against the real socket", async () => {
		// The second lane the browser takes: `@naveti/web`'s connect (global WebSocket, chord's link) against the host,
		// holding the same contracts. A DOM test would need jsdom; this proves the module the page loads works, and the
		// panel is covered separately in the feature's jsdom spec.
		const directory = await mkdtemp(join(tmpdir(), "naveti-web-"));
		directories.push(directory);
		await mkdir(join(directory, "workspace"), { recursive: true });
		const host = await start(directory);
		const listener = await host.listen({ port: 0 });
		const connection = await connectWeb(listener.url, listener.token);
		try {
			const hub = await connection.get(ChatHub, {});
			const root = hub.conversations.value[0];
			if (root === undefined) throw new Error("no reserved conversation");
			const conversation = await connection.get(ChatConversation, { conversation: root.id });

			// A panel watches the projection; the frame it receives is what a browser would render.
			const seen: ChatView[] = [];
			const watch = await conversation.view.watch(connection.context);
			watch.start(async (call) => {
				if (call.kind === "value") seen.push(call.value);
			});
			await conversation.submit({ content: "hello from the client" }, connection.context);
			// Wait for the answer entry, not for any text: the view's built-in agent doc already names the provider.
			await waitFor(() => conversation.view.value.entries.some((entry) => entry.kind === "naveti.assistant"));
			expect(seen.length).toBeGreaterThan(0);
			expect(conversation.view.value.entries.map((entry) => entry.kind)).toContain("naveti.assistant");
			await watch.stop();
		} finally {
			await connection.close();
			await listener.close();
			await host.close();
		}
	});

	it("reports an unreachable address instead of handing back a connection that is not there", async () => {
		// `client.load([])` needs no link, so a connect that resolved before the socket opened would render a panel whose
		// every hold is pending forever — an empty screen where "press send does nothing" is the only symptom.
		await expect(connectWeb("ws://127.0.0.1:1/", "whatever")).rejects.toThrow(/cannot reach ws:\/\/127\.0\.0\.1:1\//);
	});

	it("runs read, edit and bash over the socket, and reads the same transcript back after a restart", async () => {
		const directory = await mkdtemp(join(tmpdir(), "naveti-loopback-"));
		directories.push(directory);
		await mkdir(join(directory, "workspace"), { recursive: true });
		await writeFile(join(directory, "workspace", "notes.txt"), "hello world\n");

		const first = await start(directory);
		const listener = await first.listen({ port: 0 });
		const client = await connectLoopback(listener.url, listener.token);
		let before: ChatView;
		try {
			const hub = await client.get(ChatHub, {});
			const root = hub.conversations.value[0];
			if (root === undefined) throw new Error("the feature did not create the reserved conversation");
			const conversation = await client.get(ChatConversation, { conversation: root.id });

			await conversation.submit({ content: "Greet naveti instead." }, client.context);
			// The run is four model turns (call, call, call, answer). Three tool results are not the end: the answer is a
			// fourth commit after them, so waiting on the tool results alone races the last commit under load.
			await waitFor(() => {
				const entries = conversation.view.value.entries;
				return (
					entries.filter((entry) => entry.kind === "naveti.tool-result").length >= 3 &&
					entries.filter((entry) => entry.kind === "naveti.assistant").length >= 4
				);
			});

			before = conversation.view.value;
			// The turn's shape, not the kernel's prompt bookkeeping: `naveti.system` entries are written whenever the prompt
			// changes, so they are filtered out; the model's wording is the faux provider's business, so no sentence is
			// asserted either. What is left is the commit order this test exists to pin.
			const kinds = before.entries.map((entry) => entry.kind).filter((kind) => kind !== "naveti.system");
			expect(kinds).toEqual([
				"naveti.user",
				"naveti.assistant",
				"naveti.tool-result",
				"naveti.assistant",
				"naveti.tool-result",
				"naveti.assistant",
				"naveti.tool-result",
				"naveti.assistant",
			]);
			// The tools really ran on the server's side: the file on disk changed.
			expect(await readFile(join(directory, "workspace", "notes.txt"), "utf8")).toBe("hello naveti\n");
		} finally {
			await client.close();
			await listener.close();
			await first.close();
		}

		// A second process would do exactly this: a new host over the same dataDir, a new client, the same conversation.
		const second = await start(directory);
		const again = await second.listen({ port: 0 });
		const reopened = await connectLoopback(again.url, again.token);
		try {
			const hub = await reopened.get(ChatHub, {});
			const root = hub.conversations.value[0];
			if (root === undefined) throw new Error("the conversation list did not survive the restart");
			const conversation = await reopened.get(ChatConversation, { conversation: root.id });
			expect(conversation.view.value.entries.map((entry) => entry.id)).toEqual(
				before.entries.map((entry) => entry.id),
			);
			expect(conversation.view.value.entries.map((entry) => entry.kind)).toEqual(
				before.entries.map((entry) => entry.kind),
			);
		} finally {
			await reopened.close();
			await again.close();
			await second.close();
		}
	});
});
