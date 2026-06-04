// Account-free backup: export/import all on-device data as a JSON file so a
// learner can move progress between devices without any server.
import { getDB } from '../db';
import {
	SETTINGS_KEY,
	type Settings,
	type ProgressRecord,
	type SrsCard,
	type ReviewLogRecord,
	type StreakRecord,
	type DailyStats,
	type SkillProfileRecord
} from '../db/schema';

const BACKUP_VERSION = 1;
const STORES = [
	'settings',
	'progress',
	'srsCards',
	'reviewLog',
	'streak',
	'stats',
	'skillProfile'
] as const;

interface BackupFile {
	version: number;
	exportedAt: string;
	settings: unknown;
	progress: unknown[];
	srsCards: unknown[];
	reviewLog: unknown[];
	streak: unknown[];
	stats: unknown[];
	skillProfile: unknown[];
}

/** Serialises the whole database to a JSON string. */
export async function exportBackup(): Promise<string> {
	const db = await getDB();
	const backup: BackupFile = {
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		settings: (await db.get('settings', SETTINGS_KEY)) ?? null,
		progress: await db.getAll('progress'),
		srsCards: await db.getAll('srsCards'),
		reviewLog: await db.getAll('reviewLog'),
		streak: await db.getAll('streak'),
		stats: await db.getAll('stats'),
		skillProfile: await db.getAll('skillProfile')
	};
	return JSON.stringify(backup, null, 2);
}

// JSON has no Date type, so SRS card dates come back as ISO strings on import.
function reviveCard(raw: unknown): SrsCard {
	const c = raw as SrsCard & { due: string | Date; last_review?: string | Date };
	return {
		...c,
		due: new Date(c.due),
		last_review: c.last_review ? new Date(c.last_review) : undefined
	};
}

/** Replaces all data with the contents of a previously exported backup. */
export async function importBackup(json: string): Promise<void> {
	const data = JSON.parse(json) as Partial<BackupFile>;
	if (data.version !== BACKUP_VERSION) {
		throw new Error(`Unsupported backup version: ${String(data.version)}`);
	}

	const db = await getDB();
	const tx = db.transaction(STORES, 'readwrite');
	await Promise.all(STORES.map((store) => tx.objectStore(store).clear()));

	if (data.settings) await tx.objectStore('settings').put(data.settings as Settings, SETTINGS_KEY);
	for (const r of (data.progress ?? []) as ProgressRecord[])
		await tx.objectStore('progress').put(r);
	for (const r of data.srsCards ?? []) await tx.objectStore('srsCards').put(reviveCard(r));
	for (const r of (data.reviewLog ?? []) as ReviewLogRecord[])
		await tx.objectStore('reviewLog').put(r);
	for (const r of (data.streak ?? []) as StreakRecord[]) await tx.objectStore('streak').put(r);
	for (const r of (data.stats ?? []) as DailyStats[]) await tx.objectStore('stats').put(r);
	for (const r of (data.skillProfile ?? []) as SkillProfileRecord[])
		await tx.objectStore('skillProfile').put(r);

	await tx.done;
}
