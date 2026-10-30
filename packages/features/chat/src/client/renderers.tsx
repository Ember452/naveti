// The two entry kinds this feature renders. A kind nobody registered falls back in the panel, so an unknown entry is
// visible rather than missing.
import type { EntryRendererProps } from "@naveti/web";
import { entryText, toolName } from "./text.ts";

/** A model answer, as text. */
export function AssistantEntry({ entry }: EntryRendererProps) {
	return <article className="naveti-entry">{entryText(entry)}</article>;
}

/** A tool result: the call's name on top, its output below, monospaced. */
export function ToolResultEntry({ entry }: EntryRendererProps) {
	const name = toolName(entry) ?? "tool";
	return (
		<article className="naveti-entry tool">
			<header>{name}</header>
			{entryText(entry)}
		</article>
	);
}
