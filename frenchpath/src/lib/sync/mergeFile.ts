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
	validateAndParseBackup,
	reviveCard,
	STORES,
	MAX_BACKUP_BYTES
} from '../pwa/backup';
import { type BackupPayload } from '../pwa/backupSchema';
import { mergePayloads, type MergeSummary } from '../pwa/merge';
import { encryptPayload, decryptPayload, type EncryptedEnvelope } from './crypto';

/** Envelope carries the backup as base64 ciphertext (~4/3 of plaintext) plus
 *  header fields, so a legitimate max-size backup exceeds MAX_BACKUP_BYTES. */
export const MAX_SYNC_BYTES = Math.ceil(MAX_BACKUP_BYTES * 1.5);

function assertSyncFileSize(json: string): void {
	const bytes = new TextEncoder().encode(json).byteLength;
	if (bytes > MAX_SYNC_BYTES) {
		throw new Error(
			`Sync file is too large (${Math.round(bytes / 1024)} KB). Maximum is ${Math.round(MAX_SYNC_BYTES / 1024 / 1024)} MB.`
		);
	}
}

let importInFlight = false;

/** Encrypts the whole DB (via the existing backup exporter) into a sync file. */
export async function exportSyncFile(passphrase: string): Promise<string> {
	const plaintext = await exportBackup();
	const envelope = await encryptPayload(plaintext, passphrase);
	return JSON.stringify(envelope);
}

/** Decrypts a sync file and runs it through the same pipeline as backup import. */
async function decryptAndValidate(fileJson: string, passphrase: string): Promise<BackupPayload> {
	assertSyncFileSize(fileJson); // outer envelope guard — before any parse
	let envelope: EncryptedEnvelope;
	try {
		envelope = JSON.parse(fileJson) as EncryptedEnvelope;
	} catch {
		throw new Error('Sync file is not valid JSON.');
	}
	const plaintext = await decryptPayload(envelope, passphrase);
	return (await validateAndParseBackup(plaintext)).payload;
}

async function currentLocalPayload(): Promise<BackupPayload> {
	const json = await exportBackup();
	return (JSON.parse(json) as { payload: BackupPayload }).payload;
}

/** Decrypt + validate + dry-run merge against the current DB. Mutates nothing. */
export async function previewSyncMerge(
	fileJson: string,
	passphrase: string
): Promise<MergeSummary> {
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

async function importSyncMergeInner(fileJson: string, passphrase: string): Promise<MergeSummary> {
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
		// The tx may have already auto-aborted (a failed put rejects tx.done);
		// abort() on a finished transaction throws and would mask `err`.
		try {
			tx.abort();
		} catch {
			/* already aborted */
		}
		throw new Error('Sync merge failed — your existing data is unchanged', { cause: err });
	}
	return summary;
}
