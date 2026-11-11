// src/lib/sync/mergeFile.ts
// Encrypted device-to-device sync file: thin orchestration over the existing
// backup export/import pipeline (../pwa/backup.ts) plus Task 14's envelope
// crypto and Task 15's merge. Validation on decrypted plaintext runs through
// the EXACT same pipeline as backup import (size guard -> parse -> checksum
// -> migrate -> schema) so no new failure mode can reach the database.
import {
	exportBackup,
	validateAndParseBackup,
	mergeAllDataAtomically,
	readLocalPayload,
	MAX_BACKUP_BYTES
} from '../pwa/backup';
import { type BackupPayload } from '../pwa/backupSchema';
import { mergePayloads, type MergeSummary } from '../pwa/merge';
import { todayKey } from '../utils/date';
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

/** How far past "now" a sync file's activity dates may be (covers clock skew and time zones). */
export const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;

export class FutureDatedSyncError extends Error {
	constructor() {
		super(
			'This sync file has dates in the future. Check the date and time on both devices, then try again. If it still fails, use a backup file to move your progress.'
		);
		this.name = 'FutureDatedSyncError';
	}
}

/** Sync only (backup restore must stay unrestricted): refuses the whole file if any
 *  activity date is past now + skew. `srsCards[].due` and `settings` are not checked. */
export function assertNoFutureDates(payload: BackupPayload, now: number): void {
	const limitMs = now + MAX_FUTURE_SKEW_MS;
	const limitKey = todayKey(new Date(limitMs));
	const msFields: (number | undefined)[] = [
		...payload.progress.map((r) => r.lastVisited),
		...payload.reviewLog.map((r) => r.ts),
		...payload.skillProfile.map((r) => r.updatedAt),
		...payload.assessments.flatMap((r) => [r.completedAt, r.lastFailedAt]),
		...payload.srsCards.map((r) => (r.last_review ? Date.parse(r.last_review) : undefined))
	];
	const dateKeys = [
		...payload.streak.map((r) => r.lastActiveDate).filter((k) => k !== ''),
		...payload.stats.map((r) => r.date)
	];
	const isFuture =
		msFields.some((ms) => ms !== undefined && ms > limitMs) || dateKeys.some((k) => k > limitKey);
	if (isFuture) throw new FutureDatedSyncError();
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
	const { payload } = await validateAndParseBackup(plaintext);
	assertNoFutureDates(payload, Date.now());
	return payload;
}

/** Decrypt + validate + dry-run merge against the current DB. Mutates nothing. */
export async function previewSyncMerge(
	fileJson: string,
	passphrase: string
): Promise<MergeSummary> {
	const remote = await decryptAndValidate(fileJson, passphrase);
	// A preview must not depend on the local data being exportable as a backup.
	const local = await readLocalPayload();
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

	// Read, merge and write in ONE transaction: a write another tab commits meanwhile is
	// queued until after it (and is kept), never wiped by the clear. A failure anywhere rolls
	// back the clears too, so existing data survives.
	try {
		return await mergeAllDataAtomically((local) => {
			const { merged, summary } = mergePayloads(local, remote);
			return { merged, result: summary };
		});
	} catch (err) {
		throw new Error('Sync merge failed — your existing data is unchanged', { cause: err });
	}
}
