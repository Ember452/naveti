// What a feature may be handed when it mounts a wire object. It is deliberately small: the harness it already has, and
// the two chord members a factory needs to reach other objects and to follow a view. Everything else a feature does to
// a conversation goes through the kernel's own API on the harness.
import type { Context, Watchable } from "@naveti/chord";
import type { Contract, FollowAttach, Implementation, ParamsOf, Reference } from "@naveti/chord/next";
import type { Principal } from "@naveti/contracts/transport";
import type { Harness } from "@naveti/durable";

/** The `self` a feature's served factory receives, plus the harness the platform opened for it. */
export type FeatureSelf = {
	/** The host's harness: live until the host closes. The platform opened it, not the feature. */
	readonly harness: Harness;
	/** A chord source over another runtime's observer, such as `harness.observeConversation`. */
	follow<T>(attach: FollowAttach<T>): Watchable<T>;
	/** A reference to another served object, by contract and params. */
	get<C extends Contract>(contract: C, params: ParamsOf<C>): Reference<C>;
};

/**
 * What a feature returns from `ctx.serve`. Methods take the request's `Context`; state members are watchables, so a
 * client gets a snapshot and then deltas through the one transport the platform already runs.
 */
export type FeatureFactory<C extends Contract> = (
	params: ParamsOf<C>,
	principal: Principal,
	self: FeatureSelf,
) => Implementation<C>;

export type { Context, Contract, FollowAttach, Implementation, ParamsOf, Reference, Watchable };
