// src/lib/sync/mergeFile.ts
// Encrypted device-to-device sync file: thin orchestration over the existing
// backup export/import pipeline (../pwa/backup.ts) plus Task 14's envelope
// crypto and Task 15's merge. Validation on decrypted plaintext runs through
// the EXACT same pipeline as backup import (size guard -> parse -> checksum
// -> migrate -> schema) so no new failure mode can reach the database.
import { getDB } from '../db';
import {
	SETTINGS_KEY,
	type Settings,
	type ProgressRecord,
	type ReviewLogRecord,
	type StreakRecord,
	type DailyStats,
	type SkillProfileRecord,
	type AssessmentRecord
} from '../db/schema';
import {
	exportBackup,
	assertBackupSize,
	parseBackupJson,
	reviveCard,
	STORES,
	MAX_BACKUP_BYTES
} from '../pwa/backup';
import { backupFileSchema, CURRENT_BACKUP_VERSION, type BackupPayload } from '../pwa/backupSchema';
import { sha256Hex } from '../pwa/checksum';
import { migrateBackup } from '../pwa/migrations';
import { mergePayloads, type MergeSummary } from '../pwa/merge';
import { encryptPayload, decryptPayload, type EncryptedEnvelope } from './crypto';

export const MAX_SYNC_BYTES = MAX_BACKUP_BYTES;

let importInFlight = false;

/** Encrypts the whole DB (via the existing backup exporter) into a sync file. */
export async function exportSyncFile(passphrase: string): Promise<string> {
	const plaintext = await exportBackup();
	const envelope = await encryptPayload(plaintext, passphrase);
	return JSON.stringify(envelope);
}

/** Decrypts a sync file and runs it through the same pipeline as backup import. */
async function decryptAndValidate(fileJson: string, passphrase: string): Promise<BackupPayload> {
	const envelope = JSON.parse(fileJson) as EncryptedEnvelope;
	const plaintext = await decryptPayload(envelope, passphrase);

	assertBackupSize(plaintext);
	const raw = parseBackupJson(plaintext);
	const version = raw.schemaVersion ?? raw.version;
	if (typeof version !== 'number' || version < 1 || version > CURRENT_BACKUP_VERSION) {
		throw new Error(`Unsupported backup version: ${String(version)}`);
	}
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
	return parsed.data.payload;
}

async function currentLocalPayload(): Promise<BackupPayload> {
	const json = await exportBackup();
	return (JSON.parse(json) as { payload: BackupPayload }).payload;
}

/** Decrypt + validate + dry-run merge against the current DB. Mutates nothing. */
export async function previewSyncMerge(fileJson: string, passphrase: string): Promise<MergeSummary> {
	const remote = await decryptAndValidate(fileJson, passphrase);
	const local = await currentLocalPayload();
	return mergePayloads(local, remote).summary;
}

/** Decrypt + validate + merge, then write the merged result atomically. */
export async function importSyncMerge(fileJson: string, passphrase: string): Promise<MergeSummary> {
	if (importInFlight) {
		throw new Error('Another sync import is already in progress.');
	}
	importInFlight = true;
	try {
		return await importSyncMergeInner(fileJson, passphrase);
	} finally {
		importInFlight = false;
	}
}

async function importSyncMergeInner(
	fileJson: string,
	passphrase: string
): Promise<MergeSummary> {
	const remote = await decryptAndValidate(fileJson, passphrase);
	const local = await currentLocalPayload();
	const { merged, summary } = mergePayloads(local, remote);

	// Same shape as importBackupInner: clear + put inside one transaction, so a
	// failed put rolls back the clears too and existing data survives.
	const db = await getDB();
	const tx = db.transaction(STORES, 'readwrite');
	try {
		await Promise.all(STORES.map((store) => tx.objectStore(store).clear()));

		if (merged.settings)
			await tx.objectStore('settings').put(merged.settings as Settings, SETTINGS_KEY);
		for (const r of merged.progress) await tx.objectStore('progress').put(r as ProgressRecord);
		for (const r of merged.srsCards) await tx.objectStore('srsCards').put(reviveCard(r));
		for (const r of merged.reviewLog) await tx.objectStore('reviewLog').put(r as ReviewLogRecord);
		for (const r of merged.streak) await tx.objectStore('streak').put(r as StreakRecord);
		for (const r of merged.stats) await tx.objectStore('stats').put(r as DailyStats);
		for (const r of merged.skillProfile)
			await tx.objectStore('skillProfile').put(r as SkillProfileRecord);
		for (const r of merged.assessments)
			await tx.objectStore('assessments').put(r as AssessmentRecord);

		await tx.done;
	} catch (err) {
		tx.abort();
		throw new Error('Sync merge failed — your existing data is unchanged', { cause: err });
	}
	return summary;
}
