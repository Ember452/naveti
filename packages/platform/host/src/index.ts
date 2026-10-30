// The host package's public surface: assembly and paths for an app, the facade for a feature. Transport, seats and
// storage are the platform's own business; an app that needs to name them is asking for a different split.

export type { Feature } from "./extend/feature.ts";
export { type Host, type HostOptions, openHost } from "./host.ts";
export { DATABASE_FILE, type HostPaths } from "./paths.ts";
export type { Listener, ListenOptions } from "./transport/loopback.ts";
