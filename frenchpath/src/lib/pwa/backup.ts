// src/lib/pwa/backup.ts
// Account-free backup: export/import all on-device data as a JSON file. Import
// VALIDATES before it destroys — a corrupt or malformed file can never reach the
// clear() step, so existing data survives any bad import.
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
import { backupFileSchema, CURRENT_BACKUP_VERSION, type BackupPayload } from './backupSchema';
import { sha256Hex } from './checksum';
import { migrateBackup } from './migrations';

const STORES = [
	'settings',
	'progress',
	'srsCards',
	'reviewLog',
	'streak',
	'stats',
	'skillProfile'
] as const;

/** Serialises the whole database to a JSON string with an integrity checksum. */
export async function exportBackup(): Promise<string> {
	const db = await getDB();
	const payload = {
		settings: (await db.get('settings', SETTINGS_KEY)) ?? null,
		progress: await db.getAll('progress'),
		srsCards: await db.getAll('srsCards'),
		reviewLog: await db.getAll('reviewLog'),
		streak: await db.getAll('streak'),
		stats: await db.getAll('stats'),
		skillProfile: await db.getAll('skillProfile')
	};
	const file = {
		schemaVersion: CURRENT_BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		checksum: await sha256Hex(JSON.stringify(payload)),
		payload
	};
	return JSON.stringify(file, null, 2);
}

// JSON has no Date type, so SRS card dates come back as ISO strings on import.
function reviveCard(c: BackupPayload['srsCards'][number]): SrsCard {
	return {
		...c,
		due: new Date(c.due),
		last_review: c.last_review ? new Date(c.last_review) : undefined
	} as SrsCard;
}

/** Replaces all data with a previously exported backup, after full validation. */
export async function importBackup(json: string): Promise<void> {
	const raw = JSON.parse(json) as {
		version?: number;
		schemaVersion?: number;
		checksum?: string;
		payload?: unknown;
	};
	const version = raw.schemaVersion ?? raw.version;
	if (version !== 1 && version !== CURRENT_BACKUP_VERSION) {
		throw new Error(`Unsupported backup version: ${String(version)}`);
	}

	// For natively-v2 files, verify integrity over the RAW payload (stable key
	// order matches what exportBackup hashed). v1 files have no checksum to check.
	if (version === CURRENT_BACKUP_VERSION) {
		const expected = await sha256Hex(JSON.stringify(raw.payload ?? null));
		if (expected !== raw.checksum) {
			throw new Error(
				'Backup integrity check failed: checksum mismatch (corrupted or edited file).'
			);
		}
	}

	const migrated = await migrateBackup(raw);
	const parsed = backupFileSchema.safeParse(migrated);
	if (!parsed.success) {
		throw new Error(`Invalid backup file: ${parsed.error.issues[0]?.message ?? 'schema mismatch'}`);
	}
	const p = parsed.data.payload;

	// Validation passed — only now mutate the database, atomically.
	const db = await getDB();
	const tx = db.transaction(STORES, 'readwrite');
	await Promise.all(STORES.map((store) => tx.objectStore(store).clear()));

	if (p.settings) await tx.objectStore('settings').put(p.settings as Settings, SETTINGS_KEY);
	for (const r of p.progress) await tx.objectStore('progress').put(r as ProgressRecord);
	for (const r of p.srsCards) await tx.objectStore('srsCards').put(reviveCard(r));
	for (const r of p.reviewLog) await tx.objectStore('reviewLog').put(r as ReviewLogRecord);
	for (const r of p.streak) await tx.objectStore('streak').put(r as StreakRecord);
	for (const r of p.stats) await tx.objectStore('stats').put(r as DailyStats);
	for (const r of p.skillProfile) await tx.objectStore('skillProfile').put(r as SkillProfileRecord);

	await tx.done;
}
