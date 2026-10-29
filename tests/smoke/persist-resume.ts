// Persistence smoke test: submit an input, close, reopen the same SQLite file,
// and continue. Run from the repository root:
//   node --conditions=source tests/smoke/persist-resume.ts
//
// No provider credentials: the faux provider answers deterministically, so the
// run exercises the durable path (entries, commits, task scheduling) only.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModels, fauxAssistantMessage, fauxProvider, fauxText } from "@naveti/ai";
import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
import { createRegistry, Harness } from "@naveti/durable";
import { openNodeSqliteStorage } from "@naveti/durable/storage/sqlite/node";

const context = BACKGROUND_CONTEXT;
const directory = await mkdtemp(join(tmpdir(), "naveti-smoke-"));
const databasePath = join(directory, "session.sqlite");

/** Models and registry are process objects; a reopen builds fresh ones over the same storage. */
function setup(responses) {
	const faux = fauxProvider();
	faux.setResponses(responses);
	const models = createModels();
	models.setProvider(faux.provider);
	return { faux, models, registry: createRegistry() };
}

async function open(state) {
	return Harness.open(await openNodeSqliteStorage(databasePath), { models: state.models, registry: state.registry }, context);
}

async function entriesOf(conversation) {
	const page = await conversation.entries({}, 1000, undefined, context);
	return [...page.items].reverse();
}

const steps = [];

// 1. Submit, answer, and observe the stream: a snapshot first, then commit batches.
{
	const state = setup([fauxAssistantMessage([fauxText("hello from the faux model")])]);
	const harness = await open(state);
	const root = await harness.root(context, { agent: { model: { provider: "faux", modelId: "faux-1" } } });

	// The watch delivers a snapshot on acquisition, then one call per commit batch.
	const watch = await root.watch(context);
	assert.ok(watch.value !== undefined, "watch must deliver a snapshot before any batch");
	let batches = 0;
	watch.start((call) => {
		if (call.kind === "value") batches += 1;
	});

	const submission = await root.submit({ type: "input", content: "first question" }, context);
	const settled = await submission.wait(context);
	assert.equal(settled.status, "done", `submission settled as ${settled.status}`);
	assert.equal(settled.type, "input");

	const before = await entriesOf(root);
	assert.ok(before.length >= 2, `expected user + assistant entries, got ${before.length}`);
	assert.ok(
		before.some((entry) => JSON.stringify(entry).includes("hello from the faux model")),
		"the assistant answer must be persisted verbatim, not just recorded as a finished status",
	);
	assert.ok(batches > 0, "expected at least one streamed batch after the snapshot");
	const answerId = submission.id;
	steps.push(["submit + answer", true]);

	await watch.stop();
	await harness.close(context);

	// 2. Reopen the same storage: the transcript must be intact.
	const reopenedState = setup([]);
	const reopened = await open(reopenedState);
	reopened.resume();
	const reopenedRoot = await reopened.root(context);
	const after = await entriesOf(reopenedRoot);
	assert.equal(after.length, before.length, `entries changed across reopen: ${before.length} -> ${after.length}`);
	assert.deepEqual(
		after.map((entry) => entry.id),
		before.map((entry) => entry.id),
		"entry ids must be identical after reopen (no duplicate commits)",
	);
	steps.push(["reopen keeps transcript", true]);

	// 3. The persisted conversation still answers: submit again after resume.
	reopenedState.faux.setResponses([fauxAssistantMessage([fauxText("second answer")])]);
	const second = await (await reopenedRoot.submit({ type: "input", content: "second question" }, context)).wait(context);
	assert.equal(second.status, "done", `second submission settled as ${second.status}`);
	const grown = await entriesOf(reopenedRoot);
	assert.ok(grown.length > after.length, "second run must append entries");
	assert.ok(
		grown.some((entry) => JSON.stringify(entry).includes("second answer")),
		"the post-reopen answer must be persisted verbatim",
	);
	steps.push(["resume + continue", true]);

	await reopened.close(context);
	console.log(`first submission id: ${answerId}`);
}

// 4. An interrupted run is picked up by the next process.
{
	const state = setup([]);
	const harness = await open(state);
	const root = await harness.root(context, { agent: { model: { provider: "faux", modelId: "faux-1" } } });

	// A response that never settles: the generation task stays running.
	let reached;
	const sent = new Promise((resolve) => {
		reached = resolve;
	});
	state.faux.setResponses([
		(_context, options) =>
			new Promise((_resolve, reject) => {
				reached();
				options.signal?.addEventListener("abort", () => reject(options.signal.reason), { once: true });
			}),
	]);
	const pending = await root.submit({ type: "input", content: "will be interrupted", requestId: "interrupted-1" }, context);
	await sent;

	// Close mid-run, the way a crash would.
	await harness.close(context);
	const interruptedState = setup([fauxAssistantMessage([fauxText("recovered after restart")])]);
	const resumed = await open(interruptedState);
	resumed.resume();
	const recovered = await resumed.submission(pending.id, context);
	assert.ok(recovered, "the submission must still exist after reopen");
	const settled = await recovered.wait(context);
	assert.equal(settled.status, "done", `interrupted submission settled as ${settled.status}`);
	steps.push(["interrupted run resumes", true]);
	await resumed.close(context);
}

await rm(directory, { recursive: true, force: true });
console.log("\n=== smoke summary ===");
for (const [name, passed] of steps) console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
