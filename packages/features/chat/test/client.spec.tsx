// @vitest-environment jsdom
// The panel over a fake connection: what a frame turns into on screen, and what the composer sends.
//
// The wire itself is tested in Node (transport conformance, loopback gate); jsdom only exists to prove that the entry
// kinds this feature registers are the ones the panel renders, and that submit carries the text the user typed.
import { type ChatEntry, ChatHub, type ChatView } from "@naveti/contracts";
import type { Connection, Slots } from "@naveti/web";
import { createSlots } from "@naveti/web";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { register } from "../src/client/index.ts";
import { ChatPanel } from "../src/client/panel.tsx";

// React only routes state updates through `act` when it is told it is in a test: without this the render below
// silently happens outside it and the warning hides real act-related mistakes.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const assistantEntry: ChatEntry = {
	id: 2,
	conversationId: 1,
	kind: "naveti.assistant",
	model: [{ role: "assistant", content: [{ type: "text", text: "The file now greets naveti." }] }],
};

const toolEntry: ChatEntry = {
	id: 3,
	conversationId: 1,
	kind: "naveti.tool-result",
	model: [{ role: "toolResult", toolName: "bash", content: [{ type: "text", text: "hello naveti" }] }],
};

const view: ChatView = { conversation: { id: 1 }, entries: [assistantEntry, toolEntry], docs: {} };

/** A remote member as chord hands it over: a value now, and a watch that starts at it and then goes quiet. */
function readable<T>(value: T) {
	return {
		value,
		async watch() {
			return {
				start(listener: (call: { kind: string; value?: T }) => void | Promise<void>) {
					void listener({ kind: "value", value });
				},
				stop() {},
			};
		},
	};
}

/** `get` by contract name: the panel asks with the real contract objects, the fake answers what they would carry. */
function fakeConnection(submitted: string[]): Connection {
	const conversation = {
		variant: "owner" as const,
		view: readable(view),
		submit: async ({ content }: { content: string }) => {
			submitted.push(content);
			return null;
		},
	};
	const hub = {
		variant: "owner" as const,
		conversations: readable([{ id: 1, title: "New conversation", updatedAt: 0 }]),
	};
	return {
		context: { abortSignal: undefined, telemetry: {} } as Connection["context"],
		// The fake answers what the real reference would carry; the double cast is the test's own seam, not the panel's.
		get: (async (contract: unknown) => (contract === ChatHub ? hub : conversation)) as unknown as Connection["get"],
		close: async () => {},
	};
}

let cleanup: (() => void) | undefined;
afterEach(() => {
	cleanup?.();
	cleanup = undefined;
	document.body.innerHTML = "";
});

describe("the chat panel", () => {
	it("renders the answer and the tool result through the registered renderers, and sends what was typed", async () => {
		const submitted: string[] = [];
		const { registry, slots } = createSlots();
		register(registry);
		const connection = fakeConnection(submitted);

		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		cleanup = () => root.unmount();

		await act(async () => {
			root.render(<ChatPanel connection={connection} slots={slots as Slots} />);
		});

		const text = container.textContent ?? "";
		expect(text).toContain("New conversation");
		expect(text).toContain("The file now greets naveti.");
		expect(text).toContain("bash");
		expect(text).toContain("hello naveti");

		const composer = container.querySelector("textarea");
		if (composer === null) throw new Error("the panel has no composer");
		await act(async () => {
			const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
			setter?.call(composer, "change notes.txt");
			composer.dispatchEvent(new Event("input", { bubbles: true }));
		});
		const form = container.querySelector("form");
		if (form === null) throw new Error("the composer is not a form");
		await act(async () => {
			form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
		});
		expect(submitted).toEqual(["change notes.txt"]);
	});

	// The report this test exists for: a panel whose first hold is still pending used to show an empty list and an inert
	// button, which is indistinguishable from a host that is not answering.
	it("says why it is empty and why the composer is inert", async () => {
		const { registry, slots } = createSlots();
		register(registry);
		const pending = {
			context: { abortSignal: undefined, telemetry: {} } as Connection["context"],
			get: (() => new Promise(() => {})) as unknown as Connection["get"],
			close: async () => {},
		};

		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		cleanup = () => root.unmount();

		await act(async () => {
			root.render(<ChatPanel connection={pending} slots={slots as Slots} />);
		});

		expect(container.textContent ?? "").toContain("connecting to the host…");
		const button = container.querySelector("button[type=submit]");
		if (!(button instanceof HTMLButtonElement)) throw new Error("the composer has no send button");
		expect(button.disabled).toBe(true);
	});
});
