// The client-side seats: where a feature's screens hang. The list is closed and declared here (docs/kernel/seats.md §3)
// — `panel` for a screenful of UI and `renderer` for one entry kind's view. The other five seats arrive with their first
// consumer; adding one is a platform change with a decision record, not a feature's private arrangement.

import type { ChatEntry } from "@naveti/contracts";
import type { ComponentType } from "react";
import type { Connection } from "./connection.ts";

/** What a renderer is given: one entry of a conversation, already detached from the runtime that produced it. */
export type EntryRendererProps = { readonly entry: ChatEntry };

export type EntryRenderer = ComponentType<EntryRendererProps>;

/** What a panel is given: the connection, and the read-only seat table to render through. */
export type PanelProps = {
	readonly connection: Connection;
	readonly slots: Slots;
};

export type Panel = ComponentType<PanelProps>;

/** The read side of the seats: what a panel may consult while it renders. */
export type Slots = {
	/** Every registered panel, in registration order. */
	readonly panels: readonly Panel[];
	/** The renderer registered for an entry kind, or `undefined` so the caller can fall back. */
	renderer(kind: string): EntryRenderer | undefined;
};

/** The write side: what a feature's `client/index.ts` registers into. The shell only reads. */
export type SlotRegistry = {
	readonly panels: { add(panel: Panel): void };
	readonly renderers: { add(kind: string, renderer: EntryRenderer): void };
};

/** Builds the empty registry the app fills from its compose list. */
export function createSlots(): { registry: SlotRegistry; slots: Slots } {
	const panels: Panel[] = [];
	const renderers = new Map<string, EntryRenderer>();
	return {
		registry: {
			panels: {
				add: (panel) => {
					panels.push(panel);
				},
			},
			renderers: {
				add: (kind, component) => {
					if (renderers.has(kind)) throw new Error(`Two renderers registered for entry kind ${kind}`);
					renderers.set(kind, component);
				},
			},
		},
		slots: { panels, renderer: (kind) => renderers.get(kind) },
	};
}
