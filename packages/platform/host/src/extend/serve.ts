// What a feature may be handed when it mounts a wire object. It is deliberately small: the harness it already has, and
// the two chord members a factory needs to reach other objects and to follow a view. Everything else a feature does to
// a conversation goes through the kernel's own API on the harness.
import type { Context, JsonValue, NativeWatchable, Watchable } from "@naveti/chord";
import type { Contract, FollowAttach, Implementation, ParamsOf, Reference } from "@naveti/chord/next";
import type { Principal } from "@naveti/contracts/transport";
import type { Harness, ModelRef } from "@naveti/durable";

/** The `self` a feature's served factory receives, plus what the platform opened for it. */
export type FeatureSelf = {
	/** The host's harness: live until the host closes. The platform opened it, not the feature. */
	readonly harness: Harness;
	/** The model a new conversation starts with: creating a conversation is the feature's call, the choice is the host's. */
	readonly model: ModelRef;
	/** A chord source over another runtime's observer, such as `harness.observeConversation`. */
	follow<T>(attach: FollowAttach<T>): Watchable<T>;
	/**
	 * A value computed from `sources` by the pure, synchronous `compute`. It is how a feature narrows a document to the
	 * shape its contract promises, instead of publishing the document's own layout.
	 */
	derive<const S extends readonly (Watchable<unknown> | NativeWatchable<unknown>)[], T extends JsonValue>(
		sources: S,
		compute: (
			values: {
				readonly [I in keyof S]: S[I] extends Watchable<infer V>
					? V
					: S[I] extends NativeWatchable<infer V>
						? V
						: never;
			},
		) => T,
	): Watchable<T>;
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
