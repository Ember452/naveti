import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "vitest";

/**
 * Symlink support is a property of the host, not of the code under test.
 *
 * Windows refuses `symlink` without Developer Mode or elevation (`EPERM`), so the
 * durable tests that create links as a precondition cannot run there. They are
 * skipped instead of failing, but the skip is visible in the test name: a silent
 * skip would read as "green" on a machine that never exercised the path.
 *
 * File and directory links take different permission paths on Windows, so they are
 * probed separately. The probe runs in the same temp root the tests use and is
 * cached per process.
 */
const support = new Map<"file" | "dir", boolean>();

function probe(kind: "file" | "dir"): boolean {
	const cached = support.get(kind);
	if (cached !== undefined) return cached;

	const root = mkdtempSync(join(tmpdir(), `naveti-symlink-${kind}-`));
	let ok = false;
	try {
		if (kind === "file") {
			writeFileSync(join(root, "target.txt"), "x");
			symlinkSync(join(root, "target.txt"), join(root, "link.txt"));
		} else {
			mkdirSync(join(root, "target"));
			symlinkSync(join(root, "target"), join(root, "link"), "dir");
		}
		ok = true;
	} catch {
		ok = false;
	} finally {
		rmSync(root, { recursive: true, force: true });
	}

	support.set(kind, ok);
	return ok;
}

export function canCreateSymlinkFile(): boolean {
	return probe("file");
}

export function canCreateSymlinkDir(): boolean {
	return probe("dir");
}

/** `it` for a test whose body creates a file symlink. */
export function itSymlinkFile(name: string, fn: () => unknown): void {
	const ok = canCreateSymlinkFile();
	it.skipIf(!ok)(ok ? name : `${name} (symlink unavailable)`, fn);
}

/** `it` for a test whose body creates a directory symlink. */
export function itSymlinkDir(name: string, fn: () => unknown): void {
	const ok = canCreateSymlinkDir();
	it.skipIf(!ok)(ok ? name : `${name} (symlink unavailable)`, fn);
}
