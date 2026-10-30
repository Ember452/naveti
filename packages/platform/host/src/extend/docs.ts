// The `doc` seat: a feature's state. The scope choice is the whole design — `session` is one per store and shared by
// every conversation, `conversation` is one per conversation (docs/kernel/seats.md §4). The token is defined at module
// scope by the feature and passed explicitly to every typed access, so there is no registry of kinds to keep in sync.

export type {
	ConversationDocFamilyToken,
	ConversationDocToken,
	DocFamilyToken,
	DocToken,
	JsonObject,
	SessionDocFamilyToken,
	SessionDocToken,
	TaskDocToken,
} from "@naveti/durable";
export { defineDoc, defineDocFamily } from "@naveti/durable";
