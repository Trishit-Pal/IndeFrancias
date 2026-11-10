// Requests persistent storage so the browser won't evict the learner's
// progress under storage pressure. Best called on the first meaningful write.
import { settingsRepo } from '../db';
import type { Settings } from '../db/schema';

const BACKUP_NUDGE_AFTER_DAYS = 14;
const DAY_MS = 86_400_000;
const LEGACY_LAST_EXPORT_KEY = 'frenchpath:lastExportAt';

export async function ensurePersistence(): Promise<boolean> {
	if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;

	const already = (await navigator.storage.persisted?.()) ?? false;
	const granted = already || (await navigator.storage.persist());
	await settingsRepo.saveSettings({ persistGranted: granted });
	return granted;
}

/** Current persistence status without requesting it. */
export async function isPersisted(): Promise<boolean> {
	if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return false;
	return navigator.storage.persisted();
}

/** Calm Home nudge: unprotected storage, progress worth saving, and no recent export. */
export function shouldShowBackupNudge(input: {
	persisted: boolean;
	lastExportAt: string | null;
	hasProgress: boolean;
	now: number;
}): boolean {
	if (input.persisted || !input.hasProgress) return false;
	const last = input.lastExportAt ? Date.parse(input.lastExportAt) : NaN;
	return Number.isNaN(last) || input.now - last > BACKUP_NUDGE_AFTER_DAYS * DAY_MS;
}

/** One-time move of `lastExportAt` from localStorage into settings (so it is backed up). */
export async function migrateLegacyLastExport(settings: Settings): Promise<Settings> {
	try {
		const legacy = localStorage.getItem(LEGACY_LAST_EXPORT_KEY);
		if (legacy === null) return settings;
		const next = settings.lastExportAt
			? settings
			: await settingsRepo.saveSettings({ lastExportAt: legacy });
		localStorage.removeItem(LEGACY_LAST_EXPORT_KEY);
		return next;
	} catch {
		return settings; // storage unavailable: nothing to migrate
	}
}
