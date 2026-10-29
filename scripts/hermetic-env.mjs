import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

/**
 * A hermetic environment for the test run, ported from upstream's `test.sh`.
 *
 * The vendored `run-tests.mjs` used to inherit the whole process environment, so
 * the suite measured "this machine" rather than "this repository": credential-gated
 * tests skipped or ran depending on whose keys were exported, locale and time zone
 * leaked into assertions, and tests could read the user's git config.
 *
 * Upstream solved that with `env -i` plus an explicit allowlist and a throwaway
 * home. Windows cannot use `env -i`, so the same list is built here in Node: the
 * runner replaces `process.env` wholesale instead of patching it.
 *
 * Only `PATH` and the Windows loader variables are inherited. Everything else is
 * either fixed (TZ/LANG), redirected into the temporary root (HOME, TEMP, git and
 * npm config), or dropped (API keys, provider endpoints, AWS metadata).
 */

/** Environment variables a Windows child process cannot start without. */
const WINDOWS_LOADER = ["SystemRoot", "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT"];

/** Both are read by the test reporter and by code that branches on CI. */
const CI_PASSTHROUGH = ["CI", "GITHUB_ACTIONS"];

/** Corporate proxies that inspect HTTPS need their CA; dropping it fails network tests. */
const CA_PASSTHROUGH = ["NODE_EXTRA_CA_CERTS"];

function passthrough(source, names, target) {
	for (const name of names) {
		const value = source[name];
		if (value !== undefined && value !== "") target[name] = value;
	}
}

/**
 * @param {{ pathPrefix?: string, baseEnv?: NodeJS.ProcessEnv }} [options]
 * @returns {{ env: Record<string, string>, root: string, cleanup: () => void }}
 */
export function createHermeticEnvironment(options = {}) {
	const baseEnv = options.baseEnv ?? process.env;
	const root = mkdtempSync(join(tmpdir(), "naveti-test-"));
	const home = join(root, "home");
	const tmp = join(root, "tmp");
	const cache = join(root, "cache");
	const npmCache = join(cache, "npm");
	for (const directory of [join(home, ".config"), tmp, npmCache]) mkdirSync(directory, { recursive: true });

	// Ownership marker, so cleanup refuses to delete anything it did not create.
	const marker = join(root, ".naveti-test-owned");
	writeFileSync(marker, "");
	const emptyGitConfig = join(root, "gitconfig");
	writeFileSync(emptyGitConfig, "");

	const env = {
		PATH: options.pathPrefix ? `${options.pathPrefix}${delimiter}${baseEnv.PATH ?? ""}` : (baseEnv.PATH ?? ""),
		HOME: home,
		USERPROFILE: home,
		TMPDIR: tmp,
		TMP: tmp,
		TEMP: tmp,
		XDG_CONFIG_HOME: join(home, ".config"),
		XDG_CACHE_HOME: cache,
		LANG: "C",
		LC_ALL: "C",
		TZ: "UTC",
		GIT_CONFIG_NOSYSTEM: "1",
		GIT_CONFIG_GLOBAL: emptyGitConfig,
		GIT_TERMINAL_PROMPT: "0",
		GIT_EDITOR: "true",
		GIT_SEQUENCE_EDITOR: "true",
		NPM_CONFIG_USERCONFIG: join(root, "npm-userconfig"),
		NPM_CONFIG_GLOBALCONFIG: join(root, "npm-globalconfig"),
		NPM_CONFIG_CACHE: npmCache,
		PI_NO_LOCAL_LLM: "1",
		AWS_EC2_METADATA_DISABLED: "true",
	};
	passthrough(baseEnv, WINDOWS_LOADER, env);
	passthrough(baseEnv, CI_PASSTHROUGH, env);
	passthrough(baseEnv, CA_PASSTHROUGH, env);
	// npm/pnpm still need a real temp directory for the paths they compute.
	env.PWD = baseEnv.PWD ?? process.cwd();

	let cleaned = false;
	function cleanup() {
		if (cleaned) return;
		cleaned = true;
		// Verify ownership before deleting: a wrong root would take user data with it.
		if (!root.startsWith(join(tmpdir(), "naveti-test-")) || !existsSync(marker)) {
			console.error(`Refusing to remove unverified test directory: ${root}`);
			return;
		}
		try {
			// Windows keeps handles on SQLite `-wal` files and on files a scanner has
			// open, so the first attempt can fail with EPERM/EBUSY. Retry, then give up.
			rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
		} catch (error) {
			// A leftover temp directory is hygiene, not a test failure: reporting it as
			// an error would turn a green run into a red one for no reason.
			console.warn(`Could not remove hermetic root ${root}: ${error.code ?? error.message}`);
		}
	}

	return { env, root, cleanup };
}
