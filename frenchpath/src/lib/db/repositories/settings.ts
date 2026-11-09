import { getDB, writeAtomically } from '../db';
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '../schema';
import { xpFromPreset } from '$lib/profile/types';

function normalizeSettings(stored: Partial<Settings> | undefined): Settings {
	const merged = { ...DEFAULT_SETTINGS, ...stored };
	if (stored?.dailyGoalPreset && stored.dailyGoalXp === undefined) {
		merged.dailyGoalXp = xpFromPreset(stored.dailyGoalPreset);
	}
	return merged;
}

/** Current settings, with defaults filled in for any missing field. */
export async function getSettings(): Promise<Settings> {
	const stored = await (await getDB()).get('settings', SETTINGS_KEY);
	return normalizeSettings(stored);
}

/** Immutably merges `patch` into the stored settings and returns the result. */
export function saveSettings(patch: Partial<Settings>): Promise<Settings> {
	// Read and write in one transaction so concurrent patches cannot overwrite each other.
	return writeAtomically(['settings'], async (tx) => {
		const store = tx.objectStore('settings');
		const current = normalizeSettings(await store.get(SETTINGS_KEY));
		const next: Settings = normalizeSettings({ ...current, ...patch });
		if (patch.dailyGoalPreset !== undefined && patch.dailyGoalXp === undefined) {
			next.dailyGoalXp = xpFromPreset(patch.dailyGoalPreset);
		}
		await store.put(next, SETTINGS_KEY);
		return next;
	});
}
