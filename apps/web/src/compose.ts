// What this deployment renders. The mirror of `apps/server/src/compose.ts`'s host list: the same features, their client
// faces. Two lists exist because the two faces are decided independently — a feature can have a host face and no UI —
// and `check-feature-registry` (P4) is where the pair starts being machine-compared instead of reviewed.
import type { SlotRegistry } from "@naveti/web";

export type ClientEntry = {
	readonly id: string;
	readonly client: () => Promise<{ register(slots: SlotRegistry): void }>;
};

export const compose: readonly ClientEntry[] = [{ id: "chat", client: () => import("@naveti/feature-chat/client") }];
