/**
 * The upstream-to-local scope mapping, shared by `rename-scope.mjs` (applies it)
 * and `sync-upstream.mjs` (normalizes an upstream tree before diffing).
 *
 * Longest prefixes first so no shorter rule can shadow a longer one.
 */
export const REPLACEMENTS = [
	["@earendil-works/pi-telemetry", "@naveti/telemetry"],
	["@earendil-works/pi-codemode", "@naveti/codemode"],
	["@earendil-works/pi-durable", "@naveti/durable"],
	["@earendil-works/pi-ai", "@naveti/ai"],
	["@earendil-works/pi-mcp", "@naveti/mcp"],
	["@earendil-works/chord", "@naveti/chord"],
];

/** Local package directory -> upstream package name. */
export const PACKAGES = {
	telemetry: "@earendil-works/pi-telemetry",
	ai: "@earendil-works/pi-ai",
	chord: "@earendil-works/chord",
	codemode: "@earendil-works/pi-codemode",
	mcp: "@earendil-works/pi-mcp",
	durable: "@earendil-works/pi-durable",
};

/** The same mapping as it appears inside regular expressions (escaped slashes). */
export const ESCAPED_REPLACEMENTS = REPLACEMENTS.map(([from, to]) => [
	from.replace("/", "\\/"),
	to.replace("/", "\\/"),
]);

/** Applies the scope mapping to plain and regex-escaped forms; idempotent. */
export function renameScope(text) {
	let result = text;
	let total = 0;
	for (const [from, to] of [...REPLACEMENTS, ...ESCAPED_REPLACEMENTS]) {
		const parts = result.split(from);
		if (parts.length === 1) continue;
		total += parts.length - 1;
		result = parts.join(to);
	}
	return { text: result, total };
}
