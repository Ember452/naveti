// The chat panel: the conversation list on the left, one conversation's projection on the right, and a composer under
// it. Everything it shows comes from the two contracts; it never reads durable, never polls, and never holds state that
// the host already has.
import { ChatConversation, type ChatEntry, ChatHub } from "@naveti/contracts";
import { type PanelProps, useAsync, useRemote } from "@naveti/web";
import { useState } from "react";
import { entryText } from "./text.ts";

/** What an entry nobody registered a renderer for looks like: its kind, and whatever text it carries. */
function Unrendered({ entry }: { readonly entry: ChatEntry }) {
	return (
		<article className="naveti-entry">
			<header>{entry.kind}</header>
			{entryText(entry)}
		</article>
	);
}

export function ChatPanel({ connection, slots }: PanelProps) {
	const hub = useAsync(() => connection.get(ChatHub, {}), [connection]);
	const conversations = useRemote(hub?.conversations, connection.context);
	const [chosen, setChosen] = useState<number | undefined>(undefined);
	// Default to the most recently touched conversation; a click overrides it until the panel unmounts.
	const current = chosen ?? conversations?.[0]?.id;
	const conversation = useAsync(
		current === undefined ? undefined : () => connection.get(ChatConversation, { conversation: current }),
		[connection, current],
	);
	const view = useRemote(conversation?.view, connection.context);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);

	async function send(): Promise<void> {
		const content = draft.trim();
		if (conversation === undefined || content === "" || sending) return;
		setSending(true);
		setDraft("");
		try {
			await conversation.submit({ content }, connection.context);
		} catch (error) {
			console.error("chat submit:", error);
			setDraft(content);
		} finally {
			setSending(false);
		}
	}

	return (
		<section className="naveti-panel">
			<nav className="naveti-list">
				{(conversations ?? []).map((row) => (
					<button type="button" key={row.id} aria-current={row.id === current} onClick={() => setChosen(row.id)}>
						<span className="title">{row.title}</span>
						<span className="when">{new Date(row.updatedAt).toLocaleString()}</span>
					</button>
				))}
			</nav>
			<div>
				<div className="naveti-transcript">
					{(view?.entries ?? []).map((entry) => {
						const Renderer = slots.renderer(entry.kind);
						return Renderer === undefined ? (
							<Unrendered key={entry.id} entry={entry} />
						) : (
							<Renderer key={entry.id} entry={entry} />
						);
					})}
				</div>
				<form
					className="naveti-composer"
					onSubmit={(event) => {
						event.preventDefault();
						void send();
					}}
				>
					<textarea
						value={draft}
						placeholder="Ask for a change; the tools run in your workspace."
						onChange={(event) => setDraft(event.target.value)}
					/>
					<button type="submit" disabled={sending || conversation === undefined}>
						send
					</button>
				</form>
			</div>
		</section>
	);
}
