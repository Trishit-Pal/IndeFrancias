// src/lib/pwa/backup.ts
// Account-free backup: export/import all on-device data as a JSON file. Import
// VALIDATES before it destroys — a corrupt or malformed file can never reach the
// clear() step, so existing data survives any bad import.
import type { IDBPTransaction, StoreNames } from 'idb';
import { getDB, writeAtomically } from '../db';
import {
	SETTINGS_KEY,
	type FrenchPathDB,
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

/**
 * Reject imports larger than this before JSON.parse (DoS guard on a file the user
 * chooses). Sized for years of reviews: a compact review log is a few hundred bytes,
 * so 50 MB leaves room for well over 100k reviews.
 */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

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
	const { payload, exportedAt } = await validateAndParseBackup(json);
	return {
		exportedAt,
		lessonCount: payload.progress.length,
		cardCount: payload.srsCards.length
	};
}

export interface ValidatedBackup {
	payload: BackupPayload;
	exportedAt: string;
}

/**
 * The single validation gate for anything that becomes database content:
 * size guard → JSON parse → version bounds → checksum → migrate → schema.
 * Used by backup preview/import AND sync import so the pipelines can't drift.
 */
export async function validateAndParseBackup(json: string): Promise<ValidatedBackup> {
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
	return { payload: parsed.data.payload, exportedAt: String(raw.exportedAt ?? 'unknown') };
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

/** True when a restore would overwrite learner progress (cheap per-store counts). */
export async function hasDataToLose(): Promise<boolean> {
	const db = await getDB();
	const counts = await Promise.all([
		db.count('progress'),
		db.count('srsCards'),
		db.count('reviewLog')
	]);
	return counts.some((n) => n > 0);
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
	const json = JSON.stringify(file);
	// An export we could not re-import must fail loudly, not hand the learner a dead file.
	assertBackupSize(json);
	try {
		await validateAndParseBackup(json); // read-only: the same gate a restore will apply
	} catch (err) {
		throw new Error(
			'Backup could not be created because some saved data is not in the expected format. Your progress on this device is unchanged.',
			{ cause: err }
		);
	}
	return json;
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
	const { payload: p } = await validateAndParseBackup(json);

	// Validation passed — only now mutate the database, atomically.
	try {
		await replaceAllData(p);
	} catch (err) {
		throw new Error('Restore failed — your existing data is unchanged', { cause: err });
	}
}

/**
 * Replaces every store's contents with `p` in ONE transaction. All-or-nothing: if any
 * clear or put fails, IDB rolls back the whole transaction (including the clears),
 * leaving data unchanged, and this rejects with the underlying error.
 */
export async function replaceAllData(p: BackupPayload): Promise<void> {
	await writeAtomically([...STORES], (tx) => writeAllStores(tx, p));
}

type AllStoresTx = IDBPTransaction<FrenchPathDB, StoreNames<FrenchPathDB>[], 'readwrite'>;
type ReadableStoresTx = IDBPTransaction<
	FrenchPathDB,
	StoreNames<FrenchPathDB>[],
	'readonly' | 'readwrite'
>;

/** Clears every store and writes `p`, inside the caller's transaction (only IDB requests are awaited). */
async function writeAllStores(tx: AllStoresTx, p: BackupPayload): Promise<void> {
	await Promise.all(STORES.map((store) => tx.objectStore(store).clear()));

	// ponytail: puts are awaited one at a time on purpose. Measured on a 20k-log restore,
	// firing them all and awaiting only `tx.done` was ~1.7x slower in Chromium and ~3x
	// in fake-indexeddb. Re-measure before switching patterns.
	if (p.settings) await tx.objectStore('settings').put(p.settings as Settings, SETTINGS_KEY);
	for (const r of p.progress) await tx.objectStore('progress').put(r as ProgressRecord);
	for (const r of p.srsCards) await tx.objectStore('srsCards').put(reviveCard(r));
	// The file's own ids are dropped so the store assigns fresh ones: an explicit id at or
	// above the key generator's value advances it, and one past 2^53 makes every later add fail.
	for (const row of p.reviewLog) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropping `id`, autoIncrement reassigns it
		const { id, ...r } = row;
		await tx.objectStore('reviewLog').put(r as ReviewLogRecord);
	}
	for (const r of p.streak) await tx.objectStore('streak').put(r as StreakRecord);
	for (const r of p.stats) await tx.objectStore('stats').put(r as DailyStats);
	for (const r of p.skillProfile) await tx.objectStore('skillProfile').put(r as SkillProfileRecord);
	for (const r of p.assessments) await tx.objectStore('assessments').put(r as AssessmentRecord);
}

/** Reads every store inside the caller's transaction, in the plain shape an export file carries. */
async function readAllStores(tx: ReadableStoresTx): Promise<BackupPayload> {
	const rows = {
		settings: (await tx.objectStore('settings').get(SETTINGS_KEY)) ?? null,
		progress: await tx.objectStore('progress').getAll(),
		srsCards: await tx.objectStore('srsCards').getAll(),
		reviewLog: await tx.objectStore('reviewLog').getAll(),
		streak: await tx.objectStore('streak').getAll(),
		stats: await tx.objectStore('stats').getAll(),
		skillProfile: await tx.objectStore('skillProfile').getAll(),
		assessments: await tx.objectStore('assessments').getAll()
	};
	// Same JSON round trip an export goes through (dates become ISO strings, undefined fields drop).
	// Synchronous, so the transaction stays alive.
	return JSON.parse(JSON.stringify(rows)) as BackupPayload;
}

/** Reads all local data in one read-only transaction, in the shape the merge receives. Writes nothing and does not validate. */
export async function readLocalPayload(): Promise<BackupPayload> {
	const db = await getDB();
	const tx = db.transaction([...STORES], 'readonly');
	const payload = await readAllStores(tx);
	await tx.done;
	return payload;
}

/**
 * Reads all data, lets `merge` (pure and synchronous) combine it with something else, and
 * writes the merged result, all in ONE readwrite transaction. IndexedDB runs any other writer
 * wholly before or wholly after it, so nothing committed meanwhile is lost. A throw anywhere
 * rolls everything back and rejects with that error.
 */
export async function mergeAllDataAtomically<T>(
	merge: (local: BackupPayload) => { merged: BackupPayload; result: T }
): Promise<T> {
	return writeAtomically([...STORES], async (tx) => {
		const { merged, result } = merge(await readAllStores(tx));
		await writeAllStores(tx, merged);
		return result;
	});
}
