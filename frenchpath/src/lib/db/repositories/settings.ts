import { getDB } from '../db';
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '../schema';

/** Current settings, with defaults filled in for any missing field. */
export async function getSettings(): Promise<Settings> {
	const stored = await (await getDB()).get('settings', SETTINGS_KEY);
	return { ...DEFAULT_SETTINGS, ...stored };
}

/** Immutably merges `patch` into the stored settings and returns the result. */
export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
	const current = await getSettings();
	const next: Settings = { ...current, ...patch };
	await (await getDB()).put('settings', next, SETTINGS_KEY);
	return next;
}
