// The types a feature may name without importing a kernel package. Kept to what features actually annotate: the
// request context, the harness they were given, the model they create conversations with, and the JSON object shape
// their documents hold.
export type { Context } from "@naveti/chord";
export type { ConversationId, Harness, JsonObject, ModelRef } from "@naveti/durable";
