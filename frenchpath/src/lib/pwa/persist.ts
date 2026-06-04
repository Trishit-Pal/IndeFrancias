// Requests persistent storage so the browser won't evict the learner's
// progress under storage pressure. Best called on the first meaningful write.
import { settingsRepo } from '../db';

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
