// React bindings for the two things a panel waits on: a remote state member and an async `get`. Both are one effect
// each, and both treat the connection as the dependency — the shell never polls.
import type { Context } from "@naveti/chord";
import { useEffect, useState } from "react";

/**
 * The shape of a remote state member as chord hands it to a browser: the current value, and a watch that starts at it
 * and then delivers one call per commit. Structural on purpose — this package does not import chord's host surface.
 */
type RemoteReadable<T> = {
	readonly value: T;
	watch(context: Context): Promise<{
		start(listener: (call: { readonly kind: string; readonly value?: T }) => void | Promise<void>): void;
		stop(): unknown;
	}>;
};

/** The latest value of a remote member, kept live while the component is mounted. */
export function useRemote<T>(readable: RemoteReadable<T> | undefined, context: Context): T | undefined {
	const [value, setValue] = useState<T | undefined>(readable?.value);
	useEffect(() => {
		if (readable === undefined) return;
		let active = true;
		let handle: { stop(): unknown } | undefined;
		void readable.watch(context).then((watch) => {
			if (!active) {
				void watch.stop();
				return;
			}
			handle = watch;
			setValue(readable.value);
			watch.start((call) => {
				if (call.kind === "value" && call.value !== undefined) setValue(call.value);
			});
		});
		return () => {
			active = false;
			void handle?.stop();
		};
	}, [readable, context]);
	return value ?? readable?.value;
}

/** The result of `get`, re-run when its dependencies change; a failed load logs and leaves the value undefined. */
export function useAsync<T>(load: (() => Promise<T>) | undefined, dependencies: readonly unknown[]): T | undefined {
	const [value, setValue] = useState<T | undefined>(undefined);
	useEffect(() => {
		if (load === undefined) {
			setValue(undefined);
			return;
		}
		let active = true;
		void load()
			.then((result) => {
				if (active) setValue(result);
			})
			.catch((error: unknown) => {
				console.error("client load:", error);
			});
		return () => {
			active = false;
		};
		// biome-ignore lint/correctness/useExhaustiveDependencies: the caller owns the dependency list, and `load` is a fresh closure every render by design.
	}, dependencies);
	return value;
}
