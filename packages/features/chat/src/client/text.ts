// Reading what a durable entry says without depending on the kernel's message types.
//
// The wire keeps `model` and `data` opaque on purpose (`packages/contracts`); the renderer is the one place that knows
// the shape it needs — a text part, or the tool name a tool-result message carries. A shape that is not there renders
// as nothing rather than throwing inside a frame.
import type { ChatEntry } from "@naveti/contracts";

type Part = { readonly type?: unknown; readonly text?: unknown };
type Message = { readonly content?: unknown; readonly toolName?: unknown };

function messages(entry: ChatEntry): readonly Message[] {
	return Array.isArray(entry.model) ? (entry.model as readonly Message[]) : [];
}

/** The text parts of an entry's model messages, joined by newlines. */
export function entryText(entry: ChatEntry): string {
	const texts: string[] = [];
	for (const message of messages(entry)) {
		if (!Array.isArray(message.content)) continue;
		for (const part of message.content as readonly Part[]) {
			if (part.type === "text" && typeof part.text === "string") texts.push(part.text);
		}
	}
	return texts.join("\n");
}

/** The tool a tool-result entry belongs to, when the entry carries one. */
export function toolName(entry: ChatEntry): string | undefined {
	for (const message of messages(entry)) {
		if (typeof message.toolName === "string") return message.toolName;
	}
	return undefined;
}
