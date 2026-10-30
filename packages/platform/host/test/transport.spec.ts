import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModels, fauxAssistantMessage, fauxProvider, fauxText } from "@naveti/ai";
import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
import {
	arr,
	createHost,
	type Link,
	method,
	obj,
	remote,
	str,
	type WebSocketLike,
	webSocketLink,
} from "@naveti/chord/next";
import type { Principal } from "@naveti/contracts/transport";
import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { defineDoc } from "../src/extend/docs.ts";
import { defineFeature } from "../src/extend/feature.ts";
import { type Host, openHost } from "../src/host.ts";

/**
 * Two transports, one body of assertions. A loopback socket is the one a user's browser gets; the in-process link is
 * the one an embedded host (and this test) uses so the fast lane does not depend on ports. If they diverged, the fast
 * lane would stop being evidence for the real one, so every assertion runs against both, and a transport that cannot
 * pass it does not ship.
 */

const Notes = remote("naveti.test.notes", {
	version: 1,
	params: {},
	variants: {
		owner: {
			state: { notes: obj({ items: arr(str()) }) },
			methods: { add: method(obj({ text: str() })) },
		},
	},
});

const NotesDoc = defineDoc<{ items: string[] }>({
	kind: "naveti.test.notes",
	version: 1,
	scope: "session",
	initial: () => ({ items: [] }),
	checkpointWhen: () => true,
});

/** A feature with one doc, one state member over it, and one method that writes it. */
const notes = defineFeature({
	id: "notes",
	async start({ harness, context }) {
		// The doc has to exist before a client can follow it: an absent address fails the activation.
		await harness.commit(async (tx) => {
			await tx.doc(NotesDoc);
		}, context);
	},
	install(ctx) {
		ctx.serve(Notes, (_params, _principal, self) => ({
			variant: "owner",
			members: {
				// The doc itself is the member: a client gets its snapshot and then one frame per commit.
				notes: self.follow((observer, context) => self.harness.observeDoc(NotesDoc, observer, context)),
				add: async ({ text }, context) => {
					await self.harness.commit(async (tx) => {
						const doc = await tx.doc(NotesDoc);
						doc.items.push(text);
					}, context);
					return null;
				},
			},
		}));
	},
});

function fauxModels() {
	const faux = fauxProvider();
	faux.setResponses([fauxAssistantMessage([fauxText("unused")])]);
	const created = createModels();
	created.setProvider(faux.provider);
	return created;
}

async function withHost(run: (host: Host) => Promise<void>): Promise<void> {
	const directory = await mkdtemp(join(tmpdir(), "naveti-host-transport-"));
	const host = await openHost(
		{ dataDir: join(directory, "data"), cacheDir: join(directory, "cache") },
		{ models: fauxModels(), model: { provider: "faux", modelId: "faux-1" }, onError: () => {} },
	);
	try {
		await host.install([notes]);
		await run(host);
	} finally {
		await host.close();
		await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
	}
}

/** Polls until `done`: a frame crosses a link, so the assertion waits for the value instead of the call's promise. */
async function waitFor(done: () => boolean, timeoutMs = 5_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (done()) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error("timed out waiting for the state to arrive");
}

/** The same four assertions, run over whichever link the transport provides. */
async function roundTrip(link: () => Link): Promise<void> {
	const client = createHost<Principal>({ onError: () => {} });
	try {
		client.connect(link(), { principal: { kind: "server" } }, BACKGROUND_CONTEXT);
		await client.load([], BACKGROUND_CONTEXT);
		const notes = await client.get(Notes, {}, BACKGROUND_CONTEXT);

		// 1. The first value is a snapshot of the server's doc.
		expect(notes.notes.value).toEqual({ items: [] });

		// 2. A method call commits on the server; the client's state member moves.
		const frames: string[][] = [];
		const watch = await notes.notes.watch(BACKGROUND_CONTEXT);
		watch.start(async (call) => {
			if (call.kind === "value") frames.push(call.value.items);
		});
		await notes.add({ text: "first" }, BACKGROUND_CONTEXT);
		await waitFor(() => frames.some((items) => items.includes("first")));
		expect(notes.notes.value.items).toContain("first");

		// 3. A payload far above any inline threshold arrives unchanged.
		const large = "x".repeat(200_000);
		await notes.add({ text: large }, BACKGROUND_CONTEXT);
		await waitFor(() => notes.notes.value.items.some((item) => item.length === large.length));
		expect(notes.notes.value.items.find((item) => item.length === large.length)).toHaveLength(large.length);

		// 4. Two callers writing at once both land, with no lost write.
		await Promise.all([notes.add({ text: "a" }, BACKGROUND_CONTEXT), notes.add({ text: "b" }, BACKGROUND_CONTEXT)]);
		await waitFor(() => notes.notes.value.items.includes("a") && notes.notes.value.items.includes("b"));
		expect(notes.notes.value.items.filter((item) => item === "a" || item === "b")).toHaveLength(2);

		await watch.stop();
	} finally {
		await client.close(BACKGROUND_CONTEXT);
	}
}

describe("the loopback transport", () => {
	it("delivers a snapshot, method results, a large payload and concurrent writes", async () => {
		await withHost(async (host) => {
			const listener = await host.listen({ port: 0 });
			try {
				await roundTrip(() => webSocketLink(new WebSocket(listener.url) as unknown as WebSocketLike));
			} finally {
				await listener.close();
			}
		});
	});

	it("refuses a connection without the printed token", async () => {
		await withHost(async (host) => {
			const listener = await host.listen({ port: 0 });
			try {
				// A raw socket: the refusal has to happen at the transport, before any hold exists. The close code is the
				// observation: a client host would translate it into a retry and only give up at `readyTimeout`.
				const socket = new WebSocket(`ws://127.0.0.1:${listener.port}/?token=wrong`);
				const closed = once(socket, "close") as Promise<[number, Buffer]>;
				const [code] = await closed;
				expect(code).toBe(4401);
			} finally {
				await listener.close();
			}
		});
	});
});

describe("the in-process transport", () => {
	it("delivers a snapshot, method results, a large payload and concurrent writes", async () => {
		await withHost(async (host) => {
			await roundTrip(() => host.acceptInProcess());
		});
	});
});
