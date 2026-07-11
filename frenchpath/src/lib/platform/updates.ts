// Opt-in update check. Fully default-off: nothing here runs unless the user
// flips the `updateCheckEnabled` setting on and/or taps "check now". No
// auto-download, no auto-install — this only ever surfaces a link.
import { z } from 'zod';

// Hardcoded client-side, matching scripts/emit-version-json.mjs's DOWNLOAD_URL.
// The link target NEVER comes from the fetched version.json — that file is
// same-origin but not a trust boundary we want to render `href` from (see
// task-18-report.md fix-up: XSS via unvalidated downloadUrl scheme).
export const RELEASES_URL = 'https://github.com/Trishit-Pal/IndeFrancias/releases/latest';

export interface UpdateInfo {
	version: string;
	downloadUrl: string;
}

// downloadUrl is intentionally NOT part of this schema — even if a
// compromised/MITM'd version.json injects one, it's stripped by zod's
// default unknown-key behavior and never reaches UpdateInfo.
const updateInfoSchema = z.object({
	version: z.string()
});

export class UpdateCheckError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'UpdateCheckError';
	}
}

/** Numeric dotted-version compare; tolerates an optional leading `v`. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
	const partsA = a.replace(/^v/, '').split('.').map(Number);
	const partsB = b.replace(/^v/, '').split('.').map(Number);
	const len = Math.max(partsA.length, partsB.length);
	for (let i = 0; i < len; i++) {
		const na = partsA[i] ?? 0;
		const nb = partsB[i] ?? 0;
		if (na !== nb) return na > nb ? 1 : -1;
	}
	return 0;
}

/**
 * Fetches `${baseUrl}/version.json` and returns update info when a newer
 * version is published, `null` when current is same/newer. Throws a typed
 * `UpdateCheckError` (never a generic `Error`) on network failure, a
 * non-OK response, or a malformed payload.
 *
 * `baseUrl` defaults to `''` (relative fetch) — version.json ships inside
 * this app's own build output, so it's same-origin on every deployment
 * (Vercel, Tauri, ...) without needing a pinned absolute domain. The param
 * stays so tests can point it at a mocked absolute URL.
 */
export async function checkForUpdate(
	currentVersion: string,
	baseUrl = ''
): Promise<UpdateInfo | null> {
	let response: Response;
	try {
		// no-store: defense-in-depth alongside the workbox globIgnores exclusion
		// (vite.config.ts) — guarantees a live network check even if some
		// browser/SW config would otherwise serve a stale HTTP cache entry.
		response = await fetch(`${baseUrl}/version.json`, { cache: 'no-store' });
	} catch (error) {
		throw new UpdateCheckError('Network error while checking for updates', { cause: error });
	}
	if (!response.ok) {
		throw new UpdateCheckError(`Update check failed with status ${response.status}`);
	}
	let json: unknown;
	try {
		json = await response.json();
	} catch (error) {
		throw new UpdateCheckError('Malformed update response', { cause: error });
	}
	const parsed = updateInfoSchema.safeParse(json);
	if (!parsed.success) {
		throw new UpdateCheckError('Malformed update response shape', { cause: parsed.error });
	}
	if (compareVersions(parsed.data.version, currentVersion) <= 0) return null;
	return { version: parsed.data.version, downloadUrl: RELEASES_URL };
}
