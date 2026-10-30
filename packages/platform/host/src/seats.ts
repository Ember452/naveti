// The closed list of seats: the places a feature may attach to the host or the shell. It is closed on purpose — a
// feature that invents its own attach point (a second channel, a shell edit, a process singleton) is the failure this
// list exists to name. Adding one is a platform change with a decision record, not a feature's private choice.
//
// Authority for what each seat means is docs/kernel/seats.md; this file only makes the list a value the code can check.

/** Host-side seats a feature may occupy. Mechanics all come from durable, through `@naveti/host/extend/*`. */
export const HOST_SEATS = ["tool", "section", "hook", "wrap", "task", "doc", "extension"] as const;

/**
 * Client-side seats a feature may occupy. Only the two the first feature needs exist: `panel` and `renderer`. The
 * others (nav, settings, command, composer, status) arrive with their first consumer.
 */
export const CLIENT_SEATS = ["panel", "renderer"] as const;

export type HostSeat = (typeof HOST_SEATS)[number];
export type ClientSeat = (typeof CLIENT_SEATS)[number];

/** What a feature declares it occupies, as its `naveti.feature.json` records it. */
export type FeatureSeats = {
	readonly host: readonly HostSeat[];
	readonly client: readonly ClientSeat[];
};

/** Whether `seat` is a declared host seat. */
export function isHostSeat(seat: string): seat is HostSeat {
	return (HOST_SEATS as readonly string[]).includes(seat);
}

/** Whether `seat` is a declared client seat. */
export function isClientSeat(seat: string): seat is ClientSeat {
	return (CLIENT_SEATS as readonly string[]).includes(seat);
}
