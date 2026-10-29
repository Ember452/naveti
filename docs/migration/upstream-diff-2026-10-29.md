# Upstream diff 2026-10-29

Compared against local checkout `..\pi-main`.
Differences include the scope rename, regenerated `src/providers/data`, and any local fix.

## telemetry

Scope replacements applied to upstream tree: 1

Added locally (0):

```
(none)
```

Upstream only (0):

```
(none)
```

Changed (0):

```
(none)
```

## ai

Scope replacements applied to upstream tree: 37

Added locally (43):

```
src/providers/data/.manifest.json
src/providers/data/amazon-bedrock.json
src/providers/data/ant-ling.json
src/providers/data/anthropic.json
src/providers/data/azure.json
src/providers/data/baseten.json
src/providers/data/cerebras.json
src/providers/data/cloudflare-ai-gateway.json
src/providers/data/cloudflare-workers-ai.json
src/providers/data/deepseek.json
src/providers/data/fireworks.json
src/providers/data/github-copilot.json
src/providers/data/google-vertex.json
src/providers/data/google.json
src/providers/data/groq.json
src/providers/data/huggingface.json
src/providers/data/kimi-coding.json
src/providers/data/meta.json
src/providers/data/minimax-cn.json
src/providers/data/minimax.json
src/providers/data/mistral.json
src/providers/data/moonshotai-cn.json
src/providers/data/moonshotai.json
src/providers/data/nvidia.json
src/providers/data/openai-codex.json
src/providers/data/openai.json
src/providers/data/opencode-go.json
src/providers/data/opencode.json
src/providers/data/openrouter.json
src/providers/data/qwen-token-plan-cn.json
src/providers/data/qwen-token-plan-individual.json
src/providers/data/qwen-token-plan.json
src/providers/data/radius.json
src/providers/data/together.json
src/providers/data/typesafe.json
src/providers/data/vercel-ai-gateway.json
src/providers/data/xai.json
src/providers/data/xiaomi-token-plan-ams.json
src/providers/data/xiaomi-token-plan-cn.json
src/providers/data/xiaomi-token-plan-sgp.json
src/providers/data/xiaomi.json
src/providers/data/zai-coding-cn.json
src/providers/data/zai.json
```

Upstream only (1):

```
test/codex-websocket-cached-probe.ts
```

Changed (0):

```
(none)
```

## chord

Scope replacements applied to upstream tree: 15

Added locally (0):

```
(none)
```

Upstream only (0):

```
(none)
```

Changed (2):

```
src/host.ts
test/boundary.test.ts
```

```diff
diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\chord-normalized\\src\\host.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\chord\\src\\host.ts"
index 7f83056..29979a3 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\chord-normalized\\src\\host.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\chord\\src\\host.ts"
@@ -424,9 +424,7 @@ export class HostImpl implements Host, HostCore {
 	async resolve(plugins: readonly PluginRef[]): Promise<Facet[]> {
 		const modules = plugins.filter((ref): ref is string | URL => !isFacet(ref));
 		if (modules.length > 0 && this.#loader === undefined) {
-			throw new Error(
-				"loading modules needs createHost({ loader }), e.g. nodeLoader from @naveti/chord/node",
-			);
+			throw new Error("loading modules needs createHost({ loader }), e.g. nodeLoader from @naveti/chord/node");
 		}
 		const loaded = modules.length > 0 && this.#loader !== undefined ? await this.#loader(modules) : [];
 		return plugins.map((ref) => (isFacet(ref) ? ref : loaded.shift()!));

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\chord-normalized\\test\\boundary.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\chord\\test\\boundary.test.ts"
index 9213ac7..1ab4f20 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\chord-normalized\\test\\boundary.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\chord\\test\\boundary.test.ts"
@@ -1,5 +1,5 @@
 import { readdir, readFile } from "node:fs/promises";
-import { dirname, resolve } from "node:path";
+import { dirname, resolve, sep } from "node:path";
 import { fileURLToPath } from "node:url";
 import { describe, expect, test } from "vitest";
 
@@ -16,9 +16,7 @@ describe("package boundary", () => {
 			dependencies?: Record<string, string>;
 		};
 		expect(
-			Object.keys(manifest.dependencies ?? {}).filter(
-				(name) => name.startsWith("@earendil-works/pi-") && !ALLOWED.has(name),
-			),
+			Object.keys(manifest.dependencies ?? {}).filter((name) => name.startsWith("@naveti/") && !ALLOWED.has(name)),
 		).toEqual([]);
 
 		const paths = (await readdir(sourceDirectory, { recursive: true })).filter((path) => path.endsWith(".ts")).sort();
@@ -29,9 +27,11 @@ describe("package boundary", () => {
 			for (const match of source.matchAll(IMPORT_SPECIFIER)) {
 				const specifier = match[1]!;
 				const pkg = specifier.split("/").slice(0, 2).join("/");
-				if (specifier.startsWith("@earendil-works/pi-") && !ALLOWED.has(pkg))
-					violations.push(`${path}: ${specifier}`);
-				if (specifier.startsWith(".") && !resolve(dirname(file), specifier).startsWith(`${sourceDirectory}/`)) {
+				if (specifier.startsWith("@naveti/") && !ALLOWED.has(pkg)) violations.push(`${path}: ${specifier}`);
+				if (
+					specifier.startsWith(".") &&
+					!resolve(dirname(file), specifier).startsWith(`${sourceDirectory}${sep}`)
+				) {
 					violations.push(`${path}: ${specifier}`);
 				}
 			}

```

## codemode

Scope replacements applied to upstream tree: 10

Added locally (0):

```
(none)
```

Upstream only (0):

```
(none)
```

Changed (0):

```
(none)
```

## mcp

Scope replacements applied to upstream tree: 2

Added locally (0):

```
(none)
```

Upstream only (0):

```
(none)
```

Changed (0):

```
(none)
```

## durable

Scope replacements applied to upstream tree: 556

Added locally (0):

```
(none)
```

Upstream only (0):

```
(none)
```

Changed (95):

```
src/codemode/codemode.ts
src/codemode/models.ts
src/harness/compaction.ts
src/harness/context.ts
src/harness/define.ts
src/harness/generation.ts
src/harness/harness.ts
src/harness/live.ts
src/harness/partial-changes.ts
src/harness/prompt.ts
src/harness/provider.ts
src/harness/scheduler.ts
src/harness/tool.ts
src/harness/types.ts
src/harness/usage.ts
src/harness/view.ts
src/types.ts
test/chat-support.ts
test/codemode-bench.ts
test/codemode-models.test.ts
test/codemode.test.ts
test/conversation-view-bench.ts
test/env-node-conformance.test.ts
test/examples/05-harness.ts
test/examples/06-configuration.ts
test/examples/07-harness-conversations.ts
test/examples/08-context.ts
test/examples/09-registry-reload.ts
test/examples/10-extension-state.ts
test/examples/11-tasks.ts
test/examples/12-recovery.ts
test/examples/13-chat.ts
test/examples/14-system-prompt.ts
test/examples/15-real-model.ts
test/examples/16-coding-tools.ts
test/examples/17-print.ts
test/examples/18-json.ts
test/examples/19-inbox.ts
test/examples/20-late-join.ts
test/examples/21-subagent-foreground.ts
test/examples/22-subagent-background.ts
test/examples/23-child-tasks.ts
test/examples/24-compaction.ts
test/examples/25-coding-agent.ts
test/examples/26-plan-mode.ts
test/examples/27-reviewer.ts
test/examples/28-sandbox-per-conversation.ts
test/examples/29-tool-override.ts
test/examples/30-reload-and-restart.ts
test/examples/31-transcript.ts
test/examples/32-tests-after-edits.ts
test/examples/33-turn-limit-and-continue.ts
test/examples/34-submit-in-commit.ts
test/examples/35-durable-on-the-store.ts
test/examples/36-durable-views.ts
test/examples/37-harness-registry.ts
test/harness-after-run.test.ts
test/harness-cancellation-barrier.test.ts
test/harness-context.test.ts
test/harness-continue.test.ts
test/harness-deferred-progress.test.ts
test/harness-inbox.test.ts
test/harness-lifecycle.test.ts
test/harness-live-deltas.test.ts
test/harness-nested-tools-restart.test.ts
test/harness-nested-tools.test.ts
test/harness-partial-changes.test.ts
test/harness-registry-reader.test.ts
test/harness-scheduler-retention.test.ts
test/harness-storage-failure.test.ts
test/harness-structured-output.test.ts
test/harness-structured.test.ts
test/harness-submit-in-commit.test.ts
test/harness-tasks-recovery.test.ts
test/harness-tasks.test.ts
test/harness-telemetry.test.ts
test/harness-tool-hooks.test.ts
test/harness-tools-recovery.test.ts
test/harness-tools.test.ts
test/harness-view-run.test.ts
test/harness-view.test.ts
test/nested-images-bench.ts
test/nested-tools-bench.ts
test/scheduler-fanout-bench.ts
test/scheduler-memory-bench.ts
test/session-adoption.test.ts
test/session-checkpoints-migrations.test.ts
test/session-document-cache-bench.ts
test/session-document-retention.test.ts
test/session-documents.test.ts
test/spec-usage.test.ts
test/store-storage.test.ts
test/tool-output-bench.ts
test/tools-images.test.ts
test/tools.test.ts
```

```diff
diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\codemode\\codemode.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\codemode\\codemode.ts"
index 90df493..cf9f3d7 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\codemode\\codemode.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\codemode\\codemode.ts"
@@ -34,9 +34,10 @@
  * or when the script diverges: it makes another call, or calls in another order, than the journal says. Each ends the
  * call with an error result.
  */
+
+import type { TextContent } from "@naveti/ai";
 import { type Context, copyJson, type JsonValue } from "@naveti/chord";
 import { ownedSlice } from "@naveti/chord/delta";
-import type { TextContent } from "@naveti/ai";
 import { toCodemodeIdentifier } from "@naveti/codemode/declarations";
 import type {
 	CodemodeHostCall,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\codemode\\models.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\codemode\\models.ts"
index f5f26d7..797f176 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\codemode\\models.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\codemode\\models.ts"
@@ -7,16 +7,9 @@
  * tool listings): a nested durable call with its own task, live row, abort, usage accounting, and replay policy. The
  * code mode tool turns a script's call of the global into a call of that tool.
  */
+
+import type { AnyModel, ClassifierContext, ImagesContext, Models, ModelType, ModelTypeMap, Usage } from "@naveti/ai";
 import type { Context, JsonValue } from "@naveti/chord";
-import type {
-	AnyModel,
-	ClassifierContext,
-	ImagesContext,
-	Models,
-	ModelType,
-	ModelTypeMap,
-	Usage,
-} from "@naveti/ai";
 import { Type } from "typebox";
 import { defineTool } from "../harness/define.ts";
 import type { ToolRegistration } from "../harness/types.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\compaction.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\compaction.ts"
index e583e6b..7e1ed52 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\compaction.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\compaction.ts"
@@ -1,7 +1,7 @@
-import type { Context, Draft } from "@naveti/chord";
 import type { AssistantMessage, Message, ModelThinkingLevel, SimpleStreamOptions } from "@naveti/ai";
 import { calculateContextTokens, estimateMessageTokens } from "@naveti/ai/utils/estimate";
 import { isRetryableAssistantError, retryDelayMs } from "@naveti/ai/utils/retry";
+import type { Context, Draft } from "@naveti/chord";
 import { CompactionEntry } from "../entries.ts";
 import { defineTask } from "../tasks.ts";
 import type {

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\context.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\context.ts"
index c6f993c..91a67b7 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\context.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\context.ts"
@@ -1,5 +1,5 @@
-import type { Context } from "@naveti/chord";
 import type { AssistantMessage, Message, ToolCall, ToolResultMessage } from "@naveti/ai";
+import type { Context } from "@naveti/chord";
 import { SystemEntry } from "../entries.ts";
 import { idFromNumber } from "../ids.ts";
 import type { SessionImpl } from "../session/session.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\define.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\define.ts"
index 33ce349..de50fd4 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\define.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\define.ts"
@@ -1,5 +1,5 @@
-import type { JsonValue } from "@naveti/chord";
 import type { TSchema } from "@naveti/ai";
+import type { JsonValue } from "@naveti/chord";
 import type { Task } from "../types.ts";
 import type {
 	AnyTask,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\generation.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\generation.ts"
index 28ea4d1..55c3e8e 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\generation.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\generation.ts"
@@ -1,4 +1,3 @@
-import { type Context, copyJson, type Draft, type JsonValue } from "@naveti/chord";
 import type {
 	Api,
 	AssistantMessage,
@@ -12,6 +11,7 @@ import type {
 import { isContextOverflow } from "@naveti/ai/utils/overflow";
 import { isRetryableAssistantError, retryDelayMs } from "@naveti/ai/utils/retry";
 import { getCurrentTools } from "@naveti/ai/utils/transcript";
+import { type Context, copyJson, type Draft, type JsonValue } from "@naveti/chord";
 import { AssistantEntry, ResetEntry, SystemEntry, UserEntry } from "../entries.ts";
 import type { ExecutionEnv } from "../env/index.ts";
 import type { TaskCreationOptions } from "../session/transaction.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\harness.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\harness.ts"
index 43aac75..f5bf00a 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\harness.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\harness.ts"
@@ -1,5 +1,3 @@
-import type { Context, JsonValue } from "@naveti/chord";
-import { withAbortSignal, withoutAbortSignal } from "@naveti/chord/context";
 import type { Models } from "@naveti/ai";
 import {
 	type ClientIdentity,
@@ -7,6 +5,8 @@ import {
 	PI_ATTRIBUTION,
 	withClientIdentity,
 } from "@naveti/ai/utils/identity";
+import type { Context, JsonValue } from "@naveti/chord";
+import { withAbortSignal, withoutAbortSignal } from "@naveti/chord/context";
 import {
 	createTypedMetrics,
 	NOOP_TELEMETRY_CONTEXT,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\live.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\live.ts"
index 83018e0..134f063 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\live.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\live.ts"
@@ -1,5 +1,5 @@
-import type { Draft, JsonRepresentation, JsonValue } from "@naveti/chord";
 import type { AssistantMessage, Usage } from "@naveti/ai";
+import type { Draft, JsonRepresentation, JsonValue } from "@naveti/chord";
 import { defineDoc } from "../documents.ts";
 import type { Transaction } from "../session/transaction.ts";
 import type {

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\partial-changes.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\partial-changes.ts"
index 58aad08..b2ad7b4 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\partial-changes.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\partial-changes.ts"
@@ -1,8 +1,9 @@
 // What a streamed answer changed in its partial message between two partial commits, so a commit costs the new text.
-import type { JsonRepresentation, JsonValue } from "@naveti/chord";
-import { appendText, type Draft } from "@naveti/chord/delta";
+
 import type { AssistantMessage, AssistantMessageEvent, ToolCall } from "@naveti/ai";
 import { type JsonChange, StreamingJsonParser } from "@naveti/ai/utils/streaming-json";
+import type { JsonRepresentation, JsonValue } from "@naveti/chord";
+import { appendText, type Draft } from "@naveti/chord/delta";
 import { type AssignPlan, assignJson } from "./json.ts";
 import type { LiveState } from "./live.ts";
 

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\prompt.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\prompt.ts"
index 2f76690..ee0db62 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\prompt.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\prompt.ts"
@@ -1,6 +1,6 @@
-import type { Context } from "@naveti/chord";
 import type { Message, SystemMessage, Tool, ToolReference } from "@naveti/ai";
 import { declarationsEqual, getCurrentTools, toToolDeclaration } from "@naveti/ai/utils/transcript";
+import type { Context } from "@naveti/chord";
 import { SystemEntry } from "../entries.ts";
 import type { ContextEdit, TypedEntryDraft } from "../types.ts";
 import type { ContextView, PromptInput, PromptSection, ToolRegistration } from "./types.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\provider.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\provider.ts"
index ddabe4e..f5ffa3b 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\provider.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\provider.ts"
@@ -1,5 +1,5 @@
-import type { Context } from "@naveti/chord";
 import { uuidv7 } from "@naveti/ai/utils/uuid";
+import type { Context } from "@naveti/chord";
 import { defineDoc } from "../documents.ts";
 import type { TaskRuntime } from "../types.ts";
 

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\scheduler.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\scheduler.ts"
index e730686..79cc43f 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\scheduler.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\scheduler.ts"
@@ -1,7 +1,7 @@
+import type { Models } from "@naveti/ai";
 import { type Context, copyJson, type JsonValue } from "@naveti/chord";
 import { awaitWithContext, withAbortSignal, withoutAbortSignal, withTelemetry } from "@naveti/chord/context";
 import { ownedSlice } from "@naveti/chord/delta";
-import type { Models } from "@naveti/ai";
 import {
 	createTypedMetrics,
 	createTypedSpanStarter,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\tool.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\tool.ts"
index 2fdda89..9b310a1 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\tool.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\tool.ts"
@@ -1,3 +1,5 @@
+import type { ImageContent, TextContent, ToolCall, ToolResultMessage } from "@naveti/ai";
+import { validateToolArguments } from "@naveti/ai/utils/validation";
 import { type Context, copyJson, type Draft, type JsonRepresentation, type JsonValue } from "@naveti/chord";
 import { awaitWithContext } from "@naveti/chord/context";
 import { overlap, ownedSlice } from "@naveti/chord/delta";
@@ -9,8 +11,6 @@ import {
 	Progress,
 	type ProgressClock,
 } from "@naveti/chord/output";
-import type { ImageContent, TextContent, ToolCall, ToolResultMessage } from "@naveti/ai";
-import { validateToolArguments } from "@naveti/ai/utils/validation";
 import { Compile } from "typebox/compile";
 import { defineDocFamily } from "../documents.ts";
 import { AssistantEntry, ToolResultEntry } from "../entries.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\types.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\types.ts"
index e3b4ec6..a0eb8e1 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\types.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\types.ts"
@@ -1,4 +1,3 @@
-import type { Context, JsonValue, WatchHandle } from "@naveti/chord";
 import type {
 	AssistantMessage,
 	CacheRetention,
@@ -15,6 +14,7 @@ import type {
 	Usage,
 	UserMessage,
 } from "@naveti/ai";
+import type { Context, JsonValue, WatchHandle } from "@naveti/chord";
 import type { TelemetryContext } from "@naveti/telemetry";
 import type { ExecutionEnv, ShellOutputSkip, ShellOutputWindow } from "../env/index.ts";
 import type {

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\usage.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\usage.ts"
index c711b2d..f6cc207 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\usage.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\usage.ts"
@@ -1,5 +1,5 @@
-import { copyJson, type Draft, type JsonRepresentation } from "@naveti/chord";
 import type { Usage } from "@naveti/ai";
+import { copyJson, type Draft, type JsonRepresentation } from "@naveti/chord";
 import { defineDoc } from "../documents.ts";
 import type { ConversationId, Tx } from "../types.ts";
 

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\view.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\view.ts"
index 55bc579..8d48af2 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\harness\\view.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\harness\\view.ts"
@@ -1,11 +1,4 @@
-import {
-	type Context,
-	type JsonValue,
-	Watch,
-	type WatchCall,
-	type WatchEnd,
-	type WatchHandle,
-} from "@naveti/chord";
+import { type Context, type JsonValue, Watch, type WatchCall, type WatchEnd, type WatchHandle } from "@naveti/chord";
 import { withoutAbortSignal } from "@naveti/chord/context";
 import { applyImmutable, type NonEmptyPath, type Op, type Path } from "@naveti/chord/delta";
 import { idFromNumber } from "../ids.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\types.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\types.ts"
index a2404d0..f463862 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\src\\types.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\src\\types.ts"
@@ -1,6 +1,6 @@
+import type { Message, Models } from "@naveti/ai";
 import type { Context, Draft, JsonValue, WatchCall, WatchEnd, WatchHandle } from "@naveti/chord";
 import type { Op } from "@naveti/chord/delta";
-import type { Message, Models } from "@naveti/ai";
 import type { TelemetryCarrier } from "@naveti/telemetry";
 import type { ExecutionEnv } from "./env/index.ts";
 import type {

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\chat-support.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\chat-support.ts"
index 491459c..5f790b9 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\chat-support.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\chat-support.ts"
@@ -1,4 +1,3 @@
-import type { Context } from "@naveti/chord";
 import {
 	createModels,
 	type FauxProviderHandle,
@@ -8,6 +7,7 @@ import {
 	type Models,
 	type RegisterFauxProviderOptions,
 } from "@naveti/ai";
+import type { Context } from "@naveti/chord";
 import {
 	type Conversation,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\codemode-bench.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\codemode-bench.ts"
index 9d5cefa..d2bfc75 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\codemode-bench.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\codemode-bench.ts"
@@ -8,9 +8,9 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { CodemodeSandbox } from "@naveti/codemode";
 import { Type } from "typebox";
 import { createCodemodeTool } from "../src/codemode/codemode.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\codemode-models.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\codemode-models.test.ts"
index e8d2df1..ff6f569 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\codemode-models.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\codemode-models.test.ts"
@@ -1,7 +1,6 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import type { Context } from "@naveti/chord";
 import {
 	type AssistantImages,
 	type ClassifierResult,
@@ -11,6 +10,7 @@ import {
 	fauxToolCall,
 	type MutableModels,
 } from "@naveti/ai";
+import type { Context } from "@naveti/chord";
 import { CodemodeSandbox } from "@naveti/codemode";
 import { MemoryStorage, ToolResultEntry, UsageDoc } from "@naveti/durable";
 import { describe, expect, it } from "vitest";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\codemode.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\codemode.test.ts"
index 1117163..ad423fb 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\codemode.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\codemode.test.ts"
@@ -1,8 +1,8 @@
 import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { dirname, join } from "node:path";
-import type { Context } from "@naveti/chord";
 import { type AssistantMessage, fauxAssistantMessage, fauxText, fauxToolCall, Type } from "@naveti/ai";
+import type { Context } from "@naveti/chord";
 import { type CodemodeRun, CodemodeSandbox } from "@naveti/codemode";
 import {
 	defineTool,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\conversation-view-bench.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\conversation-view-bench.ts"
index 32d38a9..01d1d44 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\conversation-view-bench.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\conversation-view-bench.ts"
@@ -18,9 +18,9 @@ import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { fileURLToPath } from "node:url";
 import { promisify } from "node:util";
+import { createModels } from "@naveti/ai/models";
 import type { Context } from "@naveti/chord";
 import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
-import { createModels } from "@naveti/ai/models";
 import { type Conversation, createRegistry, type EntryId, Harness, LiveDoc, type Storage } from "../src/index.ts";
 import { openNodeSqliteStorage } from "../src/storage/sqlite/node.ts";
 import { openStoreStorage } from "./store-storage-support.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\env-node-conformance.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\env-node-conformance.test.ts"
index 8995824..3e2747b 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\env-node-conformance.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\env-node-conformance.test.ts"
@@ -1,7 +1,7 @@
 import { execFileSync } from "node:child_process";
-import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
+import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
 import { tmpdir } from "node:os";
-import { join } from "node:path";
+import { delimiter, join } from "node:path";
 import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { afterEach, describe, expect, it } from "vitest";
 import { type FileChange, getOrThrow } from "../src/env/index.ts";
@@ -9,7 +9,21 @@ import { NodeExecutionEnv } from "../src/env/node.ts";
 import { registerEnvConformance } from "../src/testing/index.ts";
 
 const windows = process.platform === "win32";
-const gitBash = join(process.env.ProgramFiles ?? "C:\\Program Files", "Git", "bin", "bash.exe");
+/**
+ * Mirrors `getShellConfig` in the kernel: Git for Windows under either Program
+ * Files root first, then whichever `bash.exe` is on PATH. Hardcoding Program
+ * Files breaks any machine whose Git lives elsewhere.
+ */
+function findGitBash(): string {
+	const candidates = [
+		process.env.ProgramFiles && join(process.env.ProgramFiles, "Git", "bin", "bash.exe"),
+		process.env["ProgramFiles(x86)"] && join(process.env["ProgramFiles(x86)"], "Git", "bin", "bash.exe"),
+		...(process.env.PATH ?? "").split(delimiter).map((directory) => directory && join(directory, "bash.exe")),
+	].filter((candidate): candidate is string => Boolean(candidate));
+	return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? "bash";
+}
+
+const gitBash = findGitBash();
 const context = BACKGROUND_CONTEXT;
 
 /**

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\05-harness.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\05-harness.ts"
index 6ff0f88..3b665e5 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\05-harness.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\05-harness.ts"
@@ -1,9 +1,10 @@
 // Open a Harness with a registry of extensions.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/05-harness.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	AgentDoc,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\06-configuration.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\06-configuration.ts"
index f032962..e9c7e22 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\06-configuration.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\06-configuration.ts"
@@ -1,9 +1,10 @@
 // Per-conversation agent choices and Harness-wide settings.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/06-configuration.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	AgentDoc,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\07-harness-conversations.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\07-harness-conversations.ts"
index fff40db..01d338d 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\07-harness-conversations.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\07-harness-conversations.ts"
@@ -1,8 +1,9 @@
 // Conversation handles, typed entries, created conversations, and forks.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/07-harness-conversations.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createRegistry, defineEntry, Harness, MemoryStorage } from "../../src/index.ts";
 
 const context = BACKGROUND_CONTEXT;

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\08-context.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\08-context.ts"
index 074640e..df53fd9 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\08-context.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\08-context.ts"
@@ -1,9 +1,10 @@
 // Transcript history and model context.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/08-context.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import type { AssistantMessage, Message, StopReason, ToolResultMessage } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createRegistry, Harness, MemoryStorage } from "../../src/index.ts";
 
 const context = BACKGROUND_CONTEXT;

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\09-registry-reload.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\09-registry-reload.ts"
index c7f3631..10e68b6 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\09-registry-reload.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\09-registry-reload.ts"
@@ -1,9 +1,10 @@
 // Reload extension code through the registry.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/09-registry-reload.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createRegistry, defineExtension, defineTool, Harness, MemoryStorage, wrapTool } from "../../src/index.ts";
 
 const context = BACKGROUND_CONTEXT;

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\10-extension-state.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\10-extension-state.ts"
index a59a0f6..de56b87 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\10-extension-state.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\10-extension-state.ts"
@@ -1,10 +1,11 @@
 // An extension that keeps its own per-conversation document.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/10-extension-state.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	createRegistry,
 	defineDoc,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\11-tasks.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\11-tasks.ts"
index 35ae2a4..6e82c90 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\11-tasks.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\11-tasks.ts"
@@ -1,8 +1,9 @@
 // Run a durable task.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/11-tasks.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createRegistry, defineExtension, defineTask, Harness, MemoryStorage } from "../../src/index.ts";
 
 const context = BACKGROUND_CONTEXT;

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\12-recovery.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\12-recovery.ts"
index 387e676..a7d26e5 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\12-recovery.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\12-recovery.ts"
@@ -4,8 +4,8 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createRegistry, defineExtension, defineTask, Harness } from "../../src/index.ts";
 import { openNodeSqliteStorage } from "../../src/storage/sqlite/node.ts";
 

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\13-chat.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\13-chat.ts"
index 77a72b0..d7603af 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\13-chat.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\13-chat.ts"
@@ -1,9 +1,10 @@
 // A chat turn.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/13-chat.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { AssistantEntry, createRegistry, defineExtension, Harness, MemoryStorage, section } from "../../src/index.ts";
 
 const context = BACKGROUND_CONTEXT;

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\14-system-prompt.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\14-system-prompt.ts"
index 3bcf80d..2d48c33 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\14-system-prompt.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\14-system-prompt.ts"
@@ -1,9 +1,10 @@
 // System prompt sections and per-conversation instructions.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/14-system-prompt.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { NodeExecutionEnv } from "../../src/env/node.ts";
 import {
 	type Conversation,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\15-real-model.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\15-real-model.ts"
index 163298c..8c3a678 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\15-real-model.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\15-real-model.ts"
@@ -1,9 +1,10 @@
 // A real model: stream an answer from OpenAI.
 // Run from packages/durable (needs OPENAI_API_KEY):
 //   node --conditions=source --experimental-strip-types test/examples/15-real-model.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { createModels } from "@naveti/ai/models";
 import { openaiProvider } from "@naveti/ai/providers/openai";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	AssistantEntry,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\16-coding-tools.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\16-coding-tools.ts"
index f721eb2..4ab5bf0 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\16-coding-tools.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\16-coding-tools.ts"
@@ -6,10 +6,10 @@
 import { mkdtemp, readFile, writeFile } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import type { ToolResultMessage } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { NodeExecutionEnv } from "../../src/env/node.ts";
 import {
 	AssistantEntry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\17-print.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\17-print.ts"
index cf10fe4..d3c675d 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\17-print.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\17-print.ts"
@@ -2,11 +2,12 @@
 // idle. Uses OpenAI when OPENAI_API_KEY is set, and a scripted faux model otherwise.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/17-print.ts "What is in this directory?"
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import type { AssistantMessage } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
 import { openaiProvider } from "@naveti/ai/providers/openai";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { NodeExecutionEnv } from "../../src/env/node.ts";
 import { AssistantEntry, createRegistry, defineExtension, Harness, MemoryStorage, section } from "../../src/index.ts";
 import { createBashTool, createReadTool } from "../../src/tools/index.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\18-json.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\18-json.ts"
index dde951d..f4729fb 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\18-json.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\18-json.ts"
@@ -9,10 +9,10 @@
 import { mkdtemp } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
 import { openaiProvider } from "@naveti/ai/providers/openai";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { NodeExecutionEnv } from "../../src/env/node.ts";
 import { createRegistry, defineExtension, Harness, MemoryStorage, type Storage, section } from "../../src/index.ts";
 import { openNodeJsonlStorage } from "../../src/storage/jsonl/node.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\19-inbox.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\19-inbox.ts"
index ded23e0..adedd6a 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\19-inbox.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\19-inbox.ts"
@@ -1,10 +1,11 @@
 // The inbox: what happens to submissions while a conversation is busy.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/19-inbox.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import type { FauxResponseStep } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createRegistry, Harness, InboxDoc, MemoryStorage, type Submission } from "../../src/index.ts";
 
 const context = BACKGROUND_CONTEXT;

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\20-late-join.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\20-late-join.ts"
index 46531bb..6d58148 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\20-late-join.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\20-late-join.ts"
@@ -2,10 +2,11 @@
 // view, and then only what changes after that.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/20-late-join.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	createRegistry,
 	defineExtension,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\21-subagent-foreground.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\21-subagent-foreground.ts"
index 1d20a4c..8da6164 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\21-subagent-foreground.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\21-subagent-foreground.ts"
@@ -4,12 +4,13 @@
 // Uses OpenAI when OPENAI_API_KEY is set, and a scripted faux model otherwise.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/21-subagent-foreground.ts
-import type { Context } from "@naveti/chord";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { type AssistantMessage, type FauxResponseStep, Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
 import { openaiProvider } from "@naveti/ai/providers/openai";
+import type { Context } from "@naveti/chord";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	AssistantEntry,
 	type ConversationId,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\22-subagent-background.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\22-subagent-background.ts"
index d2d0faf..207382f 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\22-subagent-background.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\22-subagent-background.ts"
@@ -8,11 +8,11 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { type AssistantMessage, type FauxResponseStep, Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
 import { openaiProvider } from "@naveti/ai/providers/openai";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	AssistantEntry,
 	type ConversationId,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\23-child-tasks.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\23-child-tasks.ts"
index bde7433..db7dd59 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\23-child-tasks.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\23-child-tasks.ts"
@@ -5,8 +5,8 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	type Conversation,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\24-compaction.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\24-compaction.ts"
index b19cd72..b6d1372 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\24-compaction.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\24-compaction.ts"
@@ -1,10 +1,11 @@
 // Compaction: a long trip-planning chat whose older messages are summarized so the model context stays small.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/24-compaction.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import type { AssistantMessage, Message, TranscriptContext } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	CompactionEntry,
 	type Conversation,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\25-coding-agent.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\25-coding-agent.ts"
index 95acb0a..9979b32 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\25-coding-agent.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\25-coding-agent.ts"
@@ -5,10 +5,10 @@
 import { mkdir, mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import type { ToolResultMessage } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { NodeExecutionEnv } from "../../src/env/node.ts";
 import {
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\26-plan-mode.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\26-plan-mode.ts"
index 243336e..8147c69 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\26-plan-mode.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\26-plan-mode.ts"
@@ -5,10 +5,10 @@
 import { mkdtemp, rm, writeFile } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { NodeExecutionEnv } from "../../src/env/node.ts";
 import {
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\27-reviewer.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\27-reviewer.ts"
index 8d018de..9375b56 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\27-reviewer.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\27-reviewer.ts"
@@ -5,10 +5,10 @@
 import { mkdtemp, rm, writeFile } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import type { AssistantMessage } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { NodeExecutionEnv } from "../../src/env/node.ts";
 import {
 	AssistantEntry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\28-sandbox-per-conversation.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\28-sandbox-per-conversation.ts"
index d27c8fc..5b2699d 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\28-sandbox-per-conversation.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\28-sandbox-per-conversation.ts"
@@ -6,9 +6,9 @@
 import { mkdtemp, readFile, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { NodeExecutionEnv } from "../../src/env/node.ts";
 import { createRegistry, defineDoc, Harness, MemoryStorage } from "../../src/index.ts";
 import { CodingTools } from "../../src/tools/index.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\29-tool-override.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\29-tool-override.ts"
index 5ecfd08..93b7f21 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\29-tool-override.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\29-tool-override.ts"
@@ -5,10 +5,10 @@
 import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import type { ToolResultMessage } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { NodeExecutionEnv } from "../../src/env/node.ts";
 import {
 	type Conversation,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\30-reload-and-restart.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\30-reload-and-restart.ts"
index 16d114d..d0d08af 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\30-reload-and-restart.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\30-reload-and-restart.ts"
@@ -5,10 +5,10 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { type ToolResultMessage, Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import { createRegistry, defineExtension, defineTool, Harness, ToolResultEntry } from "../../src/index.ts";
 import { openNodeSqliteStorage } from "../../src/storage/sqlite/node.ts";
 

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\31-transcript.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\31-transcript.ts"
index b1818f0..ac693c5 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\31-transcript.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\31-transcript.ts"
@@ -3,8 +3,9 @@
 // demand. A client that drops resumes after the newest entry it has.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/31-transcript.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	ConversationTranscript,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\32-tests-after-edits.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\32-tests-after-edits.ts"
index 30fdc82..1326923 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\32-tests-after-edits.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\32-tests-after-edits.ts"
@@ -2,10 +2,11 @@
 // tests, a failure starts a fix run, and input sent meanwhile waits for them too.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/32-tests-after-edits.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	createRegistry,
 	defineExtension,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\33-turn-limit-and-continue.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\33-turn-limit-and-continue.ts"
index 66ebfcd..2422159 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\33-turn-limit-and-continue.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\33-turn-limit-and-continue.ts"
@@ -2,10 +2,11 @@
 // message, with a fresh budget. A host learns that a run stopped from `pi.live.runFailure`.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/33-turn-limit-and-continue.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	ConversationBusy,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\34-submit-in-commit.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\34-submit-in-commit.ts"
index df1f09c..66d6633 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\34-submit-in-commit.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\34-submit-in-commit.ts"
@@ -3,10 +3,11 @@
 // state; `whenIdle: "reject"` refuses it when no run is working.
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/34-submit-in-commit.ts
-import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
+
 import { Type } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	ConversationIdle,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\35-durable-on-the-store.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\35-durable-on-the-store.ts"
index 56f9947..f6a80fb 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\35-durable-on-the-store.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\35-durable-on-the-store.ts"
@@ -7,19 +7,10 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
+import { createModels } from "@naveti/ai";
 import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
-import {
-	createHost,
-	defineFacet,
-	defineTable,
-	local,
-	method,
-	openStore,
-	sqliteBackend,
-	str,
-} from "@naveti/chord/next";
+import { createHost, defineFacet, defineTable, local, method, openStore, sqliteBackend, str } from "@naveti/chord/next";
 import { openNodeSqliteDatabase } from "@naveti/chord/sqlite/node";
-import { createModels } from "@naveti/ai";
 import { createRegistry, Harness, ROOT_CONVERSATION_ID } from "../../src/index.ts";
 import { StoreStorage } from "../../src/storage/store/index.ts";
 

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\36-durable-views.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\36-durable-views.ts"
index 2793528..c7d44c7 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\36-durable-views.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\36-durable-views.ts"
@@ -5,6 +5,7 @@
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/36-durable-views.ts
 
+import { createModels } from "@naveti/ai";
 import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	arr,
@@ -19,7 +20,6 @@ import {
 	str,
 } from "@naveti/chord/next";
 import { openNodeSqliteDatabase } from "@naveti/chord/sqlite/node";
-import { createModels } from "@naveti/ai";
 import { createRegistry, Harness, ROOT_CONVERSATION_ID } from "../../src/index.ts";
 import { StoreStorage } from "../../src/storage/store/index.ts";
 

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\37-harness-registry.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\37-harness-registry.ts"
index 135ab00..697f8ea 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\examples\\37-harness-registry.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\examples\\37-harness-registry.ts"
@@ -6,6 +6,7 @@
 // Run from packages/durable:
 //   node --conditions=source --experimental-strip-types test/examples/37-harness-registry.ts
 
+import { createModels } from "@naveti/ai";
 import { BACKGROUND_CONTEXT } from "@naveti/chord/context";
 import {
 	arr,
@@ -21,7 +22,6 @@ import {
 	str,
 } from "@naveti/chord/next";
 import { openNodeSqliteDatabase } from "@naveti/chord/sqlite/node";
-import { createModels } from "@naveti/ai";
 import {
 	createRegistry,
 	defineExtension,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-after-run.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-after-run.test.ts"
index 4dd49ef..b1c765b 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-after-run.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-after-run.test.ts"
@@ -1,8 +1,8 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import type { Draft, JsonValue } from "@naveti/chord";
 import { fauxAssistantMessage, fauxToolCall, Type } from "@naveti/ai";
+import type { Draft, JsonValue } from "@naveti/chord";
 import {
 	CompactionTask,
 	ConversationBusy,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-cancellation-barrier.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-cancellation-barrier.test.ts"
index 9bdb34d..a429ffd 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-cancellation-barrier.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-cancellation-barrier.test.ts"
@@ -1,12 +1,5 @@
 import type { Context } from "@naveti/chord";
-import {
-	createSession,
-	defineTask,
-	MemoryStorage,
-	type Seq,
-	type StorageWrite,
-	type TaskId,
-} from "@naveti/durable";
+import { createSession, defineTask, MemoryStorage, type Seq, type StorageWrite, type TaskId } from "@naveti/durable";
 import { describe, expect, it } from "vitest";
 import { context, flush } from "./session-support.ts";
 import { aborted, deferred, eventually, openTasks } from "./task-support.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-context.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-context.test.ts"
index 4c5ad0c..32d2729 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-context.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-context.test.ts"
@@ -1,5 +1,5 @@
-import type { Context } from "@naveti/chord";
 import { createModels, type Message } from "@naveti/ai";
+import type { Context } from "@naveti/chord";
 import {
 	type ContextView,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-continue.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-continue.test.ts"
index 0a23772..ebe7944 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-continue.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-continue.test.ts"
@@ -2,7 +2,6 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { withTelemetry } from "@naveti/chord/context";
 import {
 	type AssistantMessage,
 	type FauxResponseStep,
@@ -12,6 +11,7 @@ import {
 	type Message,
 	Type,
 } from "@naveti/ai";
+import { withTelemetry } from "@naveti/chord/context";
 import {
 	AssistantEntry,
 	type Conversation,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-deferred-progress.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-deferred-progress.test.ts"
index e856c76..0eb646b 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-deferred-progress.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-deferred-progress.test.ts"
@@ -2,8 +2,9 @@
 // the next commit that reads or writes `pi.live` or within `settings.progress.persistWithinMs`. Crashes are simulated
 // by failing the Harness: from that moment nothing more reaches Storage, as when the process dies; the reopened Harness
 // resumes from what was stored.
-import { applyImmutable } from "@naveti/chord/delta";
+
 import { fauxAssistantMessage, fauxText, fauxToolCall, Type } from "@naveti/ai";
+import { applyImmutable } from "@naveti/chord/delta";
 import {
 	AssistantEntry,
 	type ConversationId,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-inbox.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-inbox.test.ts"
index ae3ebd7..4682439 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-inbox.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-inbox.test.ts"
@@ -1,7 +1,6 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import type { Op } from "@naveti/chord/delta";
 import {
 	type AssistantMessage,
 	type FauxResponseStep,
@@ -12,6 +11,7 @@ import {
 	Type,
 	type Usage,
 } from "@naveti/ai";
+import type { Op } from "@naveti/chord/delta";
 import {
 	type Conversation,
 	defineDoc,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-lifecycle.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-lifecycle.test.ts"
index 467129a..ed81ca6 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-lifecycle.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-lifecycle.test.ts"
@@ -1,9 +1,9 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
+import { createModels, fauxAssistantMessage, fauxText, fauxToolCall, Type } from "@naveti/ai";
 import type { Context, JsonValue } from "@naveti/chord";
 import { withAbortSignal } from "@naveti/chord/context";
-import { createModels, fauxAssistantMessage, fauxText, fauxToolCall, Type } from "@naveti/ai";
 import {
 	type Conversation,
 	type ConversationId,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-live-deltas.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-live-deltas.test.ts"
index 2114a56..449f493 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-live-deltas.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-live-deltas.test.ts"
@@ -1,5 +1,5 @@
-import type { Op } from "@naveti/chord/delta";
 import { fauxAssistantMessage, fauxText, fauxToolCall, Type } from "@naveti/ai";
+import type { Op } from "@naveti/chord/delta";
 import {
 	type CommitPublication,
 	defineTool,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-nested-tools-restart.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-nested-tools-restart.test.ts"
index 6fd6c26..5762d87 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-nested-tools-restart.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-nested-tools-restart.test.ts"
@@ -1,7 +1,6 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import type { Context } from "@naveti/chord";
 import {
 	type AssistantMessage,
 	fauxAssistantMessage,
@@ -10,6 +9,7 @@ import {
 	type ToolResultMessage,
 	Type,
 } from "@naveti/ai";
+import type { Context } from "@naveti/chord";
 import {
 	defineExtension,
 	defineTask,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-nested-tools.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-nested-tools.test.ts"
index 0d386bc..731f0b8 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-nested-tools.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-nested-tools.test.ts"
@@ -1,9 +1,6 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import type { JsonValue } from "@naveti/chord";
-import { withAbortSignal } from "@naveti/chord/context";
-import { applyImmutable } from "@naveti/chord/delta";
 import {
 	type AssistantMessage,
 	fauxAssistantMessage,
@@ -13,6 +10,9 @@ import {
 	Type,
 	type Usage,
 } from "@naveti/ai";
+import type { JsonValue } from "@naveti/chord";
+import { withAbortSignal } from "@naveti/chord/context";
+import { applyImmutable } from "@naveti/chord/delta";
 import {
 	AssistantEntry,
 	type ConversationView,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-partial-changes.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-partial-changes.test.ts"
index 8740f0b..9c43678 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-partial-changes.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-partial-changes.test.ts"
@@ -1,11 +1,6 @@
+import { type AssistantMessage, type AssistantMessageEvent, type ToolCall, ToolCallArgumentsStream } from "@naveti/ai";
 import { copyJson } from "@naveti/chord";
 import { type Op, track } from "@naveti/chord/delta";
-import {
-	type AssistantMessage,
-	type AssistantMessageEvent,
-	type ToolCall,
-	ToolCallArgumentsStream,
-} from "@naveti/ai";
 import { describe, expect, it } from "vitest";
 import type { LiveState } from "../src/harness/live.ts";
 import { PartialChanges, type PartialMessage } from "../src/harness/partial-changes.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-registry-reader.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-registry-reader.test.ts"
index d4f9ee3..7a65f86 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-registry-reader.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-registry-reader.test.ts"
@@ -1,3 +1,4 @@
+import { createModels } from "@naveti/ai/models";
 import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import {
 	arr,
@@ -11,7 +12,6 @@ import {
 	type RegistryTable,
 	str,
 } from "@naveti/chord/next";
-import { createModels } from "@naveti/ai/models";
 import { describe, expect, it } from "vitest";
 import {
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-scheduler-retention.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-scheduler-retention.test.ts"
index 155faaa..42177a3 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-scheduler-retention.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-scheduler-retention.test.ts"
@@ -3,14 +3,7 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import {
-	type Conversation,
-	defineTask,
-	type Harness,
-	LiveDoc,
-	type Storage,
-	type TaskId,
-} from "@naveti/durable";
+import { type Conversation, defineTask, type Harness, LiveDoc, type Storage, type TaskId } from "@naveti/durable";
 import { afterEach, describe, expect, it } from "vitest";
 import { SCHEDULER_INDEX_SIZES } from "../src/harness/harness.ts";
 import { openNodeSqliteStorage } from "../src/storage/sqlite/node.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-storage-failure.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-storage-failure.test.ts"
index 959c629..ca0c4a7 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-storage-failure.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-storage-failure.test.ts"
@@ -1,6 +1,6 @@
 import { runInNewContext } from "node:vm";
-import type { Context } from "@naveti/chord";
 import { createModels } from "@naveti/ai";
+import type { Context } from "@naveti/chord";
 import {
 	createRegistry,
 	defineExtension,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-structured-output.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-structured-output.test.ts"
index 5454222..09c3bf0 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-structured-output.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-structured-output.test.ts"
@@ -1,7 +1,6 @@
 import { mkdtempSync, rmSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import type { JsonValue } from "@naveti/chord";
 import {
 	type AssistantMessage,
 	fauxAssistantMessage,
@@ -10,6 +9,7 @@ import {
 	type ToolResultMessage,
 	Type,
 } from "@naveti/ai";
+import type { JsonValue } from "@naveti/chord";
 import {
 	defineTool,
 	MemoryStorage,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-structured.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-structured.test.ts"
index 0934f19..b557ffb 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-structured.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-structured.test.ts"
@@ -1,15 +1,8 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
+import { fauxAssistantMessage, fauxText, fauxToolCall, type Models, type ToolResultMessage, Type } from "@naveti/ai";
 import type { Context, JsonValue } from "@naveti/chord";
-import {
-	fauxAssistantMessage,
-	fauxText,
-	fauxToolCall,
-	type Models,
-	type ToolResultMessage,
-	Type,
-} from "@naveti/ai";
 import {
 	type Conversation,
 	type ConversationId,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-submit-in-commit.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-submit-in-commit.test.ts"
index 31e9a61..a6050bc 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-submit-in-commit.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-submit-in-commit.test.ts"
@@ -1,6 +1,6 @@
 // Admission for hosts that must not start runs: `whenIdle: "reject"`, and `submit(tx, draft)` inside the caller's
 // commit (#11149).
-import { withTelemetry } from "@naveti/chord/context";
+
 import {
 	type AssistantMessage,
 	type FauxResponseStep,
@@ -9,6 +9,7 @@ import {
 	fauxToolCall,
 	Type,
 } from "@naveti/ai";
+import { withTelemetry } from "@naveti/chord/context";
 import {
 	type Conversation,
 	ConversationBusy,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tasks-recovery.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tasks-recovery.test.ts"
index 17c2cf6..0a33677 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tasks-recovery.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tasks-recovery.test.ts"
@@ -1,8 +1,8 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import type { Context, JsonValue } from "@naveti/chord";
 import { createModels, Type } from "@naveti/ai";
+import type { Context, JsonValue } from "@naveti/chord";
 import {
 	createRegistry,
 	defineDoc,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tasks.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tasks.test.ts"
index 35806c0..215149a 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tasks.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tasks.test.ts"
@@ -1,6 +1,6 @@
+import { createModels, Type } from "@naveti/ai";
 import type { Context } from "@naveti/chord";
 import { withAbortSignal, withCancel } from "@naveti/chord/context";
-import { createModels, Type } from "@naveti/ai";
 import {
 	type CommitPublication,
 	type Conversation,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-telemetry.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-telemetry.test.ts"
index 45effbe..4b83268 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-telemetry.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-telemetry.test.ts"
@@ -1,5 +1,5 @@
-import { withTelemetry } from "@naveti/chord/context";
 import { fauxAssistantMessage, fauxToolCall, Type } from "@naveti/ai";
+import { withTelemetry } from "@naveti/chord/context";
 import { CodemodeSandbox } from "@naveti/codemode";
 import {
 	CompactionTask,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tool-hooks.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tool-hooks.test.ts"
index a9e56e1..ca25738 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tool-hooks.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tool-hooks.test.ts"
@@ -3,7 +3,6 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import type { JsonValue } from "@naveti/chord";
 import {
 	type AssistantMessage,
 	fauxAssistantMessage,
@@ -12,6 +11,7 @@ import {
 	type ToolResultMessage,
 	Type,
 } from "@naveti/ai";
+import type { JsonValue } from "@naveti/chord";
 import {
 	defineTool,
 	type EntryRecord,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tools-recovery.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tools-recovery.test.ts"
index 72c01fd..46d5b01 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tools-recovery.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tools-recovery.test.ts"
@@ -1,7 +1,6 @@
 import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { dirname, join } from "node:path";
-import type { JsonValue } from "@naveti/chord";
 import {
 	type AssistantMessage,
 	fauxAssistantMessage,
@@ -10,6 +9,7 @@ import {
 	type ToolResultMessage,
 	Type,
 } from "@naveti/ai";
+import type { JsonValue } from "@naveti/chord";
 import {
 	defineTool,
 	type EntryRecord,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tools.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tools.test.ts"
index f6ff58d..6c695fa 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-tools.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-tools.test.ts"
@@ -1,7 +1,6 @@
 import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import type { JsonValue } from "@naveti/chord";
 import {
 	type AssistantMessage,
 	type FauxResponseStep,
@@ -13,6 +12,7 @@ import {
 	type ToolResultMessage,
 	Type,
 } from "@naveti/ai";
+import type { JsonValue } from "@naveti/chord";
 import {
 	AgentDoc,
 	type Conversation,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-view-run.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-view-run.test.ts"
index 8ccd7c3..d6300cf 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-view-run.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-view-run.test.ts"
@@ -2,8 +2,6 @@
 // commit makes, rebuilt from operations alone. This replaced the event stream (`watchEvents`, #11327).
 import { GCProfiler, getHeapStatistics, setFlagsFromString } from "node:v8";
 import { runInNewContext } from "node:vm";
-import type { Draft } from "@naveti/chord";
-import { applyImmutable, type Op } from "@naveti/chord/delta";
 import {
 	type AssistantMessage,
 	type FauxResponseStep,
@@ -13,6 +11,8 @@ import {
 	fauxToolCall,
 	Type,
 } from "@naveti/ai";
+import type { Draft } from "@naveti/chord";
+import { applyImmutable, type Op } from "@naveti/chord/delta";
 import {
 	type Conversation,
 	type ConversationView,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-view.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-view.test.ts"
index 76d8671..57424c1 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\harness-view.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\harness-view.test.ts"
@@ -3,8 +3,8 @@ import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { setFlagsFromString } from "node:v8";
 import { runInNewContext } from "node:vm";
-import { applyImmutable, type Op } from "@naveti/chord/delta";
 import { type AssistantMessage, type FauxResponseStep, fauxAssistantMessage, fauxText } from "@naveti/ai";
+import { applyImmutable, type Op } from "@naveti/chord/delta";
 import {
 	AgentDoc,
 	type Conversation,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\nested-images-bench.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\nested-images-bench.ts"
index 4d88baf..72e382f 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\nested-images-bench.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\nested-images-bench.ts"
@@ -14,10 +14,10 @@ import { randomBytes } from "node:crypto";
 import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import type { ImageContent } from "@naveti/ai";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { Type } from "typebox";
 import {
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\nested-tools-bench.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\nested-tools-bench.ts"
index a76f8b6..d0eb430 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\nested-tools-bench.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\nested-tools-bench.ts"
@@ -12,9 +12,9 @@
 import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { Type } from "typebox";
 import {
 	type Conversation,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\scheduler-fanout-bench.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\scheduler-fanout-bench.ts"
index efa66a5..5cd4881 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\scheduler-fanout-bench.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\scheduler-fanout-bench.ts"
@@ -5,9 +5,10 @@
  *
  *   node --conditions=source --experimental-strip-types test/scheduler-fanout-bench.ts [calls...]
  */
-import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
+
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { Type } from "typebox";
 import { createRegistry, defineExtension, defineTool, Harness, ToolResultEntry } from "../src/index.ts";
 import { MemoryStorage } from "../src/storage/memory.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\scheduler-memory-bench.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\scheduler-memory-bench.ts"
index f1dfa6a..847929e 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\scheduler-memory-bench.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\scheduler-memory-bench.ts"
@@ -9,8 +9,8 @@
 import { mkdtempSync, rmSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { SCHEDULER_INDEX_SIZES } from "../src/harness/harness.ts";
 import {
 	type ConversationId,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-adoption.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-adoption.test.ts"
index 4f9d732..96856c1 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-adoption.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-adoption.test.ts"
@@ -2,13 +2,7 @@ import { mkdtemp, rm } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import { basename, join } from "node:path";
 import type { Context } from "@naveti/chord";
-import {
-	type CommitPublication,
-	defineDoc,
-	MemoryStorage,
-	type Seq,
-	type StorageWrite,
-} from "@naveti/durable";
+import { type CommitPublication, defineDoc, MemoryStorage, type Seq, type StorageWrite } from "@naveti/durable";
 import { afterEach, describe, expect, it, vi } from "vitest";
 import type { FileError, Result } from "../src/env/index.ts";
 import { NodeExecutionEnv } from "../src/env/node.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-checkpoints-migrations.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-checkpoints-migrations.test.ts"
index 4d60fac..50ae0fd 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-checkpoints-migrations.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-checkpoints-migrations.test.ts"
@@ -1,11 +1,5 @@
 import type { Op } from "@naveti/chord/delta";
-import {
-	defineDoc,
-	defineDocFamily,
-	type EntryId,
-	type JsonObject,
-	type StorageWrite,
-} from "@naveti/durable";
+import { defineDoc, defineDocFamily, type EntryId, type JsonObject, type StorageWrite } from "@naveti/durable";
 import { describe, expect, it } from "vitest";
 import {
 	context,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-document-cache-bench.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-document-cache-bench.ts"
index 793e6e9..453db75 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-document-cache-bench.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-document-cache-bench.ts"
@@ -8,8 +8,8 @@
 import { mkdtempSync, rmSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { createModels } from "@naveti/ai/models";
+import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import {
 	type ConversationId,
 	createRegistry,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-document-retention.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-document-retention.test.ts"
index 0c1f081..ce0b7cb 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-document-retention.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-document-retention.test.ts"
@@ -1,7 +1,8 @@
 // The Session's document cache is bounded by use: unattached documents leave it after the retention period and load
 // from Storage again; documents with a watch or a document state never leave it.
-import type { Context } from "@naveti/chord";
+
 import { fauxAssistantMessage, fauxText, fauxToolCall, Type } from "@naveti/ai";
+import type { Context } from "@naveti/chord";
 import {
 	type ConversationId,
 	defineDoc,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-documents.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-documents.test.ts"
index bd8d552..eeccd26 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\session-documents.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\session-documents.test.ts"
@@ -1,11 +1,5 @@
 import type { Draft, JsonValue } from "@naveti/chord";
-import {
-	type ConversationId,
-	defineDoc,
-	defineDocFamily,
-	type JsonObject,
-	type TaskId,
-} from "@naveti/durable";
+import { type ConversationId, defineDoc, defineDocFamily, type JsonObject, type TaskId } from "@naveti/durable";
 import { describe, expect, it } from "vitest";
 import { idFromNumber } from "../src/ids.ts";
 import {

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\spec-usage.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\spec-usage.test.ts"
index 13327cb..0936bca 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\spec-usage.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\spec-usage.test.ts"
@@ -3,8 +3,9 @@
  * the names the spec leaves to the application declared below. Keep the two in sync; `test/examples/` runs the same
  * patterns end to end.
  */
-import type { Context, Draft } from "@naveti/chord";
+
 import { type AssistantMessage, type Models, type ToolCall, Type } from "@naveti/ai";
+import type { Context, Draft } from "@naveti/chord";
 import {
 	type Conversation,
 	type ConversationId,

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\store-storage.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\store-storage.test.ts"
index 7c0540b..2c37141 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\store-storage.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\store-storage.test.ts"
@@ -6,6 +6,7 @@ import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { setFlagsFromString } from "node:v8";
 import { runInNewContext } from "node:vm";
+import { createModels } from "@naveti/ai";
 import type { Context } from "@naveti/chord";
 import { BACKGROUND_CONTEXT, withTelemetry } from "@naveti/chord/context";
 import {
@@ -25,7 +26,6 @@ import {
 	str,
 } from "@naveti/chord/next";
 import { openNodeSqliteDatabase } from "@naveti/chord/sqlite/node";
-import { createModels } from "@naveti/ai";
 import { registerStorageConformance } from "@naveti/durable/testing";
 import { InMemoryTelemetryContext } from "@naveti/telemetry";
 import { describe, expect, it } from "vitest";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\tool-output-bench.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\tool-output-bench.ts"
index b695519..53d24f6 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\tool-output-bench.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\tool-output-bench.ts"
@@ -13,9 +13,9 @@ import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { fileURLToPath } from "node:url";
 import { promisify } from "node:util";
-import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { createModels } from "@naveti/ai/models";
 import { fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@naveti/ai/providers/faux";
+import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import { Type } from "typebox";
 import { NodeExecutionEnv } from "../src/env/node.ts";
 import { createRegistry, defineTool, Harness, LiveDoc, MemoryStorage, type Storage } from "../src/index.ts";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\tools-images.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\tools-images.test.ts"
index 104e302..7227999 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\tools-images.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\tools-images.test.ts"
@@ -3,8 +3,8 @@ import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from
 import { createRequire } from "node:module";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import type { Model } from "@naveti/ai";
+import { BACKGROUND_CONTEXT as context } from "@naveti/chord/context";
 import type { ToolDiagnostic, ToolExecutionApi, ToolExecutionResult } from "@naveti/durable";
 import { createNodePhotonImages } from "@naveti/durable/images/node";
 import { createCodingTools } from "@naveti/durable/tools";

diff --git "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\tools.test.ts" "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\tools.test.ts"
index da035de..fafb72c 100644
--- "a/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\.upstream\\durable-normalized\\test\\tools.test.ts"
+++ "b/D:\\DEVELOP\\Project-main\\TypeScript\\naveti\\packages\\durable\\test\\tools.test.ts"
@@ -6,12 +6,7 @@ import { tmpdir } from "node:os";
 import { join } from "node:path";
 import type { Context, JsonValue } from "@naveti/chord";
 import { BACKGROUND_CONTEXT, withAbortSignal } from "@naveti/chord/context";
-import type {
-	ToolDiagnostic,
-	ToolExecutionApi,
-	ToolExecutionResult,
-	ToolRegistration,
-} from "@naveti/durable";
+import type { ToolDiagnostic, ToolExecutionApi, ToolExecutionResult, ToolRegistration } from "@naveti/durable";
 import { applyPatch } from "diff";
 import { afterAll, describe, expect, it } from "vitest";
 import {

```
