# Upstream diff 2026-10-30

Compared against local checkout `../pi-main`.
Differences include the scope rename, regenerated `src/providers/data`, and any local fix.

## telemetry

Scope replacements applied to upstream tree: 1

Added locally (1):

```
vitest.config.ts
```

Upstream only (0):

```
(none)
```

Changed (4):

```
CHANGELOG.md
README.md
package.json
tsconfig.build.json
```

## ai

Scope replacements applied to upstream tree: 37

Added locally (42):

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

Upstream only (3):

```
src/providers/radius.models.ts
test/codex-websocket-cached-probe.ts
test/radius-thinking-replay-e2e.test.ts
```

Changed (77):

```
CHANGELOG.md
README.md
catalog/README.md
catalog/define.ts
catalog/providers/google-vertex.ts
catalog/providers/nvidia.ts
catalog/providers/opencode.ts
catalog/providers/openrouter.ts
catalog/providers/xai.ts
catalog/reasoning.ts
catalog/sources/index.ts
catalog/sources/models-dev.ts
catalog/sources/openrouter.ts
package.json
src/api/anthropic-messages.ts
src/api/azure-openai-config.ts
src/api/bedrock-converse-stream.ts
src/api/cloudflare-ai-binding.ts
src/api/google-shared.ts
src/api/google-vertex.ts
src/api/llama-cpp-classify.ts
src/api/openai-codex-responses.ts
src/api/openai-completions.ts
src/api/openai-responses.ts
src/api/pi-messages.ts
src/auth/oauth/anthropic.ts
src/auth/oauth/github-copilot.ts
src/auth/oauth/openai-chatgpt.ts
src/auth/oauth/openai-codex.ts
src/auth/oauth/openrouter.ts
src/auth/oauth/xai.ts
src/auth/types.ts
src/compat.ts
src/index.ts
src/models.generated.ts
src/providers/all.ts
src/providers/amazon-bedrock.ts
src/providers/compat-schema.ts
src/providers/model-schema.ts
src/providers/openrouter-api.ts
src/providers/radius-config.ts
src/providers/radius.ts
src/telemetry.ts
src/types.ts
src/utils/identity.ts
src/utils/version.ts
test/anthropic-auth-token.test.ts
test/anthropic-strict-tool-fallback.test.ts
test/anthropic-tool-name-normalization.test.ts
test/azure-openai-base-url.test.ts
test/azure-openai-completions.test.ts
test/bedrock-redacted-reasoning.test.ts
test/cache-retention.test.ts
test/catalog-generation-utils.ts
test/cloudflare-ai-binding.test.ts
test/constrained-sampling.test.ts
test/context-overflow.test.ts
test/fetch-option.test.ts
test/google-raw-stop-reason.test.ts
test/google-vertex-api-key-resolution.test.ts
test/identity.test.ts
test/mistral-http-transport.test.ts
test/openai-chatgpt-oauth.test.ts
test/openai-codex-stream.test.ts
test/openai-completions-prompt-cache.test.ts
test/openrouter-oauth.test.ts
test/pi-messages.test.ts
test/providers.test.ts
test/radius-provider.test.ts
test/stream.test.ts
test/streaming-tool-arguments.test.ts
test/system-message-replay.test.ts
test/telemetry.test.ts
test/xai-oauth.test.ts
test/xai-responses.test.ts
tsconfig.build.json
vitest.config.ts
```

## chord

Scope replacements applied to upstream tree: 15

Added locally (1):

```
vitest.config.ts
```

Upstream only (0):

```
(none)
```

Changed (45):

```
CHANGELOG.md
README.md
docs/guide.md
docs/next/benchmarks.md
docs/next/decisions.md
docs/next/design.md
docs/next/durable-observers/book.md
docs/next/explainer/book.md
docs/next/explainer/src/00-front.md
docs/next/explainer/src/01-shape.md
docs/next/explainer/src/02-first.md
docs/next/explainer/src/03-principals.md
docs/next/explainer/src/04-store.md
docs/next/explainer/src/05-documents.md
docs/next/explainer/src/06-references.md
docs/next/explainer/src/08-derives.md
docs/next/explainer/src/11-jobs.md
docs/next/explainer/src/12-flows.md
docs/next/explainer/src/13-registries.md
docs/next/explainer/src/14-agent.md
docs/next/explainer/src/16-contracts.md
docs/next/explainer/src/17-wire.md
docs/next/explainer/src/20-p2-machines.md
docs/next/explainer/src/20a-compared.md
docs/next/explainer/src/21-epilogue.md
docs/next/explainer/src/22-appendix.md
docs/next/explainer/walkthrough.md
docs/next/layer-2.md
docs/next/slice-4.md
docs/next/slice-4a.md
docs/next/slice-4b.md
docs/next/slice-6a.md
docs/next/slice-6b.md
docs/next/slices.md
docs/next/store/book.md
docs/next/store/walkthrough.md
docs/spec.md
docs/tutorial.md
package.json
src/delta/README.md
src/host.ts
test/boundary.test.ts
test/next/host/routines.test.ts
test/tutorial.test.ts
tsconfig.build.json
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

Changed (7):

```
CHANGELOG.md
README.md
examples/cloudflare/README.md
examples/cloudflare/agent/src/index.ts
package.json
tsconfig.build.json
vitest.config.ts
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

Changed (5):

```
CHANGELOG.md
README.md
package.json
tsconfig.build.json
vitest.config.ts
```

## durable

Scope replacements applied to upstream tree: 556

Added locally (2):

```
test/helpers/symlink-support.ts
vitest.retention0.config.ts
```

Upstream only (0):

```
(none)
```

Changed (129):

```
CHANGELOG.md
README.md
docs/spec.md
package.json
src/codemode/codemode.ts
src/codemode/models.ts
src/entries.ts
src/harness/agent.ts
src/harness/compaction.ts
src/harness/context.ts
src/harness/define.ts
src/harness/generation.ts
src/harness/harness.ts
src/harness/inbox.ts
src/harness/live.ts
src/harness/partial-changes.ts
src/harness/prompt.ts
src/harness/provider.ts
src/harness/scheduler.ts
src/harness/submissions.ts
src/harness/telemetry.ts
src/harness/tool.ts
src/harness/types.ts
src/harness/usage.ts
src/harness/view.ts
src/session/session.ts
src/types.ts
test/chat-support.ts
test/codemode-bench.ts
test/codemode-describe.test.ts
test/codemode-models.test.ts
test/codemode.test.ts
test/conversation-view-bench.ts
test/env-node-conformance.test.ts
test/env-node.test.ts
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
test/harness-callers.test.ts
test/harness-cancellation-barrier.test.ts
test/harness-compaction.test.ts
test/harness-context.test.ts
test/harness-continue.test.ts
test/harness-deferred-progress.test.ts
test/harness-generation-recovery.test.ts
test/harness-generation.test.ts
test/harness-hook-reads.test.ts
test/harness-inbox.test.ts
test/harness-input-entries.test.ts
test/harness-inspect.test.ts
test/harness-lifecycle.test.ts
test/harness-live-deltas.test.ts
test/harness-nested-tools-restart.test.ts
test/harness-nested-tools.test.ts
test/harness-ownership.test.ts
test/harness-partial-changes.test.ts
test/harness-prompt.test.ts
test/harness-registry-reader.test.ts
test/harness-registry.test.ts
test/harness-reports.test.ts
test/harness-restart-failure.test.ts
test/harness-run-failure.test.ts
test/harness-scheduler-retention.test.ts
test/harness-storage-failure.test.ts
test/harness-structured-output.test.ts
test/harness-structured.test.ts
test/harness-submissions.test.ts
test/harness-submit-in-commit.test.ts
test/harness-tasks-recovery.test.ts
test/harness-tasks.test.ts
test/harness-telemetry.test.ts
test/harness-tool-hooks.test.ts
test/harness-tools-recovery.test.ts
test/harness-tools.test.ts
test/harness-view-run.test.ts
test/harness-view.test.ts
test/live-support.ts
test/nested-images-bench.ts
test/nested-tools-bench.ts
test/provider-session-cache-e2e.test.ts
test/scheduler-fanout-bench.ts
test/scheduler-memory-bench.ts
test/session-adoption.test.ts
test/session-checkpoints-migrations.test.ts
test/session-document-cache-bench.ts
test/session-document-retention.test.ts
test/session-documents.test.ts
test/setup-document-retention.ts
test/spec-usage.test.ts
test/sqlite-cloudflare.test.ts
test/store-storage.test.ts
test/system-order-cache-e2e.test.ts
test/tool-output-bench.ts
test/tool-search.test.ts
test/tools-images.test.ts
test/tools.test.ts
tsconfig.build.json
vitest.config.ts
```
