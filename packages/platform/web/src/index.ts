// The web platform's public surface: a seat table for features to fill, a connection to the host, and the frame that
// renders what was registered. No feature name appears in this package.
export { AppFrame, type AppFrameProps } from "./app-frame.tsx";
export { type Connection, connect } from "./connection.ts";
export { useAsync, useRemote } from "./hooks.tsx";
export {
	createSlots,
	type EntryRenderer,
	type EntryRendererProps,
	type Panel,
	type PanelProps,
	type SlotRegistry,
	type Slots,
} from "./slots.ts";
export { theme } from "./theme.ts";
