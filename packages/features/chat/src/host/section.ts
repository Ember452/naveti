// The prompt a conversation starts with. It is the `section` seat: it rides every request without the platform knowing
// what it says, and it is the one thing this feature tells the model about itself.
import { section } from "@naveti/host/extend/prompt";

export const chatSection = section(
	"chat",
	() =>
		"You are naveti, an assistant running on the user's own machine. The workspace is theirs: inspect before you change, " +
		"prefer the smallest correct edit, and run the project's own checks when you touch code. Say what you are about to " +
		"do before an irreversible action.",
);
