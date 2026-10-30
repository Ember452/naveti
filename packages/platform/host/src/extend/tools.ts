// The `tool` seat: the model-facing capabilities a feature contributes. `defineTool` comes from the kernel unchanged —
// the facade's job is to be the *only* place a feature learns that name.

export type { ToolExecutionApi, ToolExecutionResult, ToolRegistration } from "@naveti/durable";
export { defineTool } from "@naveti/durable";
