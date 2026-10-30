// What this deployment installs. One line per feature, and the only place a feature id appears outside its package:
// the server decides what it runs, the feature declares what it contributes, `check-feature-registry` (P4) keeps the
// two lists and the manifests in agreement.
import type { Feature } from "@naveti/host";

export type ComposeEntry = {
	readonly id: string;
	/** The host face: installed into the host at startup. */
	readonly host: () => Promise<{ default: Feature }>;
};

export const compose: readonly ComposeEntry[] = [{ id: "chat", host: () => import("@naveti/feature-chat") }];
