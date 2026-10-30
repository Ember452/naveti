// The client face: register into the shell's seats and nothing else. The shell file it lands in (`app-frame.tsx`)
// never learns that `chat` exists; this file is where the feature names its own screens.
import type { SlotRegistry } from "@naveti/web";
import { ChatPanel } from "./panel.tsx";
import { AssistantEntry, ToolResultEntry } from "./renderers.tsx";

export function register(slots: SlotRegistry): void {
	slots.renderers.add("naveti.assistant", AssistantEntry);
	slots.renderers.add("naveti.tool-result", ToolResultEntry);
	slots.panels.add(ChatPanel);
}
