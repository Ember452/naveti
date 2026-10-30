// The frame: connect once, then render every registered panel. It knows no feature, no conversation and no entry kind;
// that is what keeps a second feature out of this file.
import { type ReactNode, useEffect, useState } from "react";
import { type Connection, connect } from "./connection.ts";
import type { Slots } from "./slots.ts";
import { theme } from "./theme.ts";

function Notice({ children }: { readonly children: ReactNode }) {
	return (
		<main className="naveti naveti-notice">
			<style>{theme}</style>
			<p>{children}</p>
		</main>
	);
}

export type AppFrameProps = {
	/** The seats the app's compose list filled in. */
	readonly slots: Slots;
	/** The loopback URL the host printed, usually from `?url=`. */
	readonly url: string | undefined;
};

/** The shell: one connection, the panels registered for it, and nothing else. */
export function AppFrame({ slots, url }: AppFrameProps) {
	const [connection, setConnection] = useState<Connection>();
	const [failure, setFailure] = useState<string>();

	useEffect(() => {
		if (url === undefined) return;
		let active = true;
		let opened: Connection | undefined;
		void connect(url)
			.then((client) => {
				if (!active) {
					void client.close();
					return;
				}
				opened = client;
				setConnection(client);
			})
			.catch((error: unknown) => {
				if (active) setFailure(error instanceof Error ? error.message : String(error));
			});
		return () => {
			active = false;
			if (opened !== undefined) void opened.close();
		};
	}, [url]);

	if (url === undefined) return <Notice>Pass the host address: ?url=ws://127.0.0.1:PORT/?token=…</Notice>;
	if (failure !== undefined) return <Notice>Cannot reach the host: {failure}</Notice>;
	if (connection === undefined) return <Notice>Connecting to the host…</Notice>;
	if (slots.panels.length === 0) return <Notice>No feature is installed. Add one to the app's compose list.</Notice>;

	return (
		<main className="naveti">
			<style>{theme}</style>
			{slots.panels.map((Panel, index) => (
				// Panels are a registration list, not data: the index is the only stable key they have.
				// biome-ignore lint/suspicious/noArrayIndexKey: registration order is the identity here.
				<Panel key={index} connection={connection} slots={slots} />
			))}
		</main>
	);
}
