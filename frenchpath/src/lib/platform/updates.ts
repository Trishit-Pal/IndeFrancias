// Opt-in update check. Fully default-off: nothing here runs unless the user
// flips the `updateCheckEnabled` setting on and/or taps "check now". No
// auto-download, no auto-install — this only ever surfaces a link.
import { z } from 'zod';

// ponytail: placeholder — confirm this matches the real deployed origin
// before release (see report). One constant, one place to change.
export const UPDATE_BASE_URL = 'https://frenchpath.vercel.app';

export interface UpdateInfo {
	version: string;
	downloadUrl: string;
}

const updateInfoSchema = z.object({
	version: z.string(),
	downloadUrl: z.string()
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
 */
export async function checkForUpdate(
	currentVersion: string,
	baseUrl: string
): Promise<UpdateInfo | null> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl}/version.json`);
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
	return compareVersions(parsed.data.version, currentVersion) > 0 ? parsed.data : null;
}
