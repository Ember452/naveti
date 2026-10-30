// Where the host keeps things. It never decides this: `apps/*` computes the directories and injects them, because the
// desktop app's `userData`, a server's XDG directory and a test's temporary tree are three different answers to a
// question the platform cannot see.
export type HostPaths = {
	/** The database file and anything else that must survive a restart. */
	readonly dataDir: string;
	/** Anything that may be thrown away: derived files, caches. */
	readonly cacheDir: string;
	/** The built web client, when the host serves it. Absent while the web app runs on its own dev server. */
	readonly webAssetsDir?: string;
};

/** The database file inside `dataDir`. The platform names it; the app names the directory. */
export const DATABASE_FILE = "naveti.sqlite";
