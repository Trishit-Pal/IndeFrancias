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
	type SkillProfileRecord,
	type AssessmentRecord
} from '../db/schema';
import { backupFileSchema, CURRENT_BACKUP_VERSION, type BackupPayload } from './backupSchema';
import { sha256Hex } from './checksum';
import { migrateBackup } from './migrations';

/** Reject imports larger than this before JSON.parse (DoS guard). */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export const STORES = [
	'settings',
	'progress',
	'srsCards',
	'reviewLog',
	'streak',
	'stats',
	'skillProfile',
	'assessments'
] as const;

let importInFlight = false;

export interface BackupPreview {
	exportedAt: string;
	lessonCount: number;
	cardCount: number;
}

/** Lightweight parse for the import confirmation UI — does not mutate the database. */
export async function previewBackup(json: string): Promise<BackupPreview> {
	assertBackupSize(json);
	const raw = parseBackupJson(json);
	const version = raw.schemaVersion ?? raw.version;
	if (typeof version !== 'number' || version < 1 || version > CURRENT_BACKUP_VERSION) {
		throw new Error(`Unsupported backup version: ${String(version)}`);
	}
	// v2+ files carry a checksum; verify before any migration or mutation.
	if (version >= 2) {
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
	return {
		exportedAt: String(raw.exportedAt ?? 'unknown'),
		lessonCount: p.progress.length,
		cardCount: p.srsCards.length
	};
}

export function assertBackupSize(json: string): void {
	const bytes = new TextEncoder().encode(json).byteLength;
	if (bytes > MAX_BACKUP_BYTES) {
		throw new Error(
			`Backup file is too large (${Math.round(bytes / 1024)} KB). Maximum is ${Math.round(MAX_BACKUP_BYTES / 1024 / 1024)} MB.`
		);
	}
}

export function parseBackupJson(json: string): {
	version?: number;
	schemaVersion?: number;
	checksum?: string;
	exportedAt?: string;
	payload?: unknown;
} {
	if (!json.trim()) {
		throw new Error('Backup file is empty.');
	}
	try {
		return JSON.parse(json) as {
			version?: number;
			schemaVersion?: number;
			checksum?: string;
			exportedAt?: string;
			payload?: unknown;
		};
	} catch {
		throw new Error('Backup file is not valid JSON.');
	}
}

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
		skillProfile: await db.getAll('skillProfile'),
		assessments: await db.getAll('assessments')
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
export function reviveCard(c: BackupPayload['srsCards'][number]): SrsCard {
	return {
		...c,
		due: new Date(c.due),
		last_review: c.last_review ? new Date(c.last_review) : undefined
	} as SrsCard;
}

/** Replaces all data with a previously exported backup, after full validation. */
export async function importBackup(json: string): Promise<void> {
	if (importInFlight) {
		throw new Error('Another backup import is already in progress.');
	}
	importInFlight = true;
	try {
		await importBackupInner(json);
	} finally {
		importInFlight = false;
	}
}

async function importBackupInner(json: string): Promise<void> {
	assertBackupSize(json);
	const raw = parseBackupJson(json);
	const version = raw.schemaVersion ?? raw.version;
	if (typeof version !== 'number' || version < 1 || version > CURRENT_BACKUP_VERSION) {
		throw new Error(`Unsupported backup version: ${String(version)}`);
	}
	// v2+ files carry a checksum; verify before any migration or mutation.
	if (version >= 2) {
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
	// All clears + puts are inside one transaction: if any put throws, IDB rolls
	// back the entire transaction (including the clears), leaving data unchanged.
	const db = await getDB();
	const tx = db.transaction(STORES, 'readwrite');
	try {
		await Promise.all(STORES.map((store) => tx.objectStore(store).clear()));

		if (p.settings) await tx.objectStore('settings').put(p.settings as Settings, SETTINGS_KEY);
		for (const r of p.progress) await tx.objectStore('progress').put(r as ProgressRecord);
		for (const r of p.srsCards) await tx.objectStore('srsCards').put(reviveCard(r));
		for (const r of p.reviewLog) await tx.objectStore('reviewLog').put(r as ReviewLogRecord);
		for (const r of p.streak) await tx.objectStore('streak').put(r as StreakRecord);
		for (const r of p.stats) await tx.objectStore('stats').put(r as DailyStats);
		for (const r of p.skillProfile)
			await tx.objectStore('skillProfile').put(r as SkillProfileRecord);
		for (const r of p.assessments) await tx.objectStore('assessments').put(r as AssessmentRecord);

		await tx.done;
	} catch (err) {
		tx.abort();
		throw new Error('Restore failed — your existing data is unchanged', { cause: err });
	}
}
