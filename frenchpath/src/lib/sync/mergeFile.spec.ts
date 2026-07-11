import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '../db';
import * as progressRepo from '../db/repositories/progress';
import * as reviewLogRepo from '../db/repositories/reviewLog';
import { exportBackup } from '../pwa/backup';
import { encryptPayload, WrongPassphraseError } from './crypto';
import { exportSyncFile, previewSyncMerge, importSyncMerge, MAX_SYNC_BYTES } from './mergeFile';

const PASSPHRASE = 'correct horse battery staple';

beforeEach(async () => {
	await resetDatabase();
});

describe('sync file export/preview/import', () => {
	it('round-trips: export then import on a reset DB reproduces the data', async () => {
		await progressRepo.putProgress({
			lessonId: 'a1-u1',
			status: 'completed',
			score: 90,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const fileJson = await exportSyncFile(PASSPHRASE);

		await resetDatabase();
		expect(await progressRepo.getProgress('a1-u1')).toBeUndefined();

		await importSyncMerge(fileJson, PASSPHRASE);

		expect((await progressRepo.getProgress('a1-u1'))?.score).toBe(90);
	});

	it('merges instead of replacing: local review A and remote review B both survive', async () => {
		// Build the "remote" sync file from a DB that only has review B.
		await reviewLogRepo.appendReviewLog({
			cardId: 'card-b',
			ts: 200,
			grade: 3,
			state: 1,
			stability: 1,
			difficulty: 5,
			elapsedDays: 0,
			scheduledDays: 1
		});
		const remoteFile = await exportSyncFile(PASSPHRASE);

		// Reset and seed the "local" DB with review A only.
		await resetDatabase();
		await reviewLogRepo.appendReviewLog({
			cardId: 'card-a',
			ts: 100,
			grade: 2,
			state: 1,
			stability: 1,
			difficulty: 5,
			elapsedDays: 0,
			scheduledDays: 1
		});

		const summary = await importSyncMerge(remoteFile, PASSPHRASE);

		expect(summary.newReviews).toBe(1);
		const logs = await reviewLogRepo.getAllReviewLogs();
		expect(logs.map((r) => r.cardId).sort()).toEqual(['card-a', 'card-b']);
	});

	it('wrong passphrase throws WrongPassphraseError and leaves the DB untouched', async () => {
		await progressRepo.putProgress({
			lessonId: 'keep',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const fileJson = await exportSyncFile(PASSPHRASE);

		await expect(importSyncMerge(fileJson, 'wrong passphrase')).rejects.toBeInstanceOf(
			WrongPassphraseError
		);

		expect((await progressRepo.getProgress('keep'))?.score).toBe(80);
	});

	it('tampered inner checksum is rejected and leaves the DB untouched', async () => {
		await progressRepo.putProgress({
			lessonId: 'keep',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});

		// Tamper the plaintext backup checksum BEFORE encrypting, so decryption
		// (GCM auth) succeeds but the inner integrity check must still catch it.
		const plaintext = await exportBackup();
		const file = JSON.parse(plaintext);
		file.checksum = 'deadbeef';
		const envelope = await encryptPayload(JSON.stringify(file), PASSPHRASE);
		const tamperedFileJson = JSON.stringify(envelope);

		await expect(importSyncMerge(tamperedFileJson, PASSPHRASE)).rejects.toThrow(
			/checksum|integrity/i
		);

		expect((await progressRepo.getProgress('keep'))?.score).toBe(80);
	});

	it('previewSyncMerge returns a summary without mutating the database', async () => {
		await progressRepo.putProgress({
			lessonId: 'local',
			status: 'completed',
			score: 50,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const remoteFile = await exportSyncFile(PASSPHRASE);

		await resetDatabase();
		await progressRepo.putProgress({
			lessonId: 'other',
			status: 'completed',
			score: 60,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});

		const summary = await previewSyncMerge(remoteFile, PASSPHRASE);

		expect(summary.newProgress).toBe(1);
		// Nothing was written: only the pre-existing local record is present.
		expect(await progressRepo.getProgress('local')).toBeUndefined();
		expect((await progressRepo.getProgress('other'))?.score).toBe(60);
	});

	it('exports MAX_SYNC_BYTES aliased from the backup size limit', () => {
		expect(MAX_SYNC_BYTES).toBeGreaterThan(0);
	});

	it('rejects a concurrent import while one is already in flight', async () => {
		await progressRepo.putProgress({
			lessonId: 'a1-u1',
			status: 'completed',
			score: 90,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const fileJson = await exportSyncFile(PASSPHRASE);
		await resetDatabase();

		// Fire both without awaiting the first — the guard must reject the second
		// while the first is still mid-flight, so neither call clobbers the other.
		const first = importSyncMerge(fileJson, PASSPHRASE);
		const second = importSyncMerge(fileJson, PASSPHRASE);

		await expect(second).rejects.toThrow('Another sync import is already in progress.');
		await expect(first).resolves.toBeDefined();
		expect((await progressRepo.getProgress('a1-u1'))?.score).toBe(90);
	});

	it('rejects an oversized sync file before parsing (outer envelope guard)', async () => {
		const huge = 'x'.repeat(MAX_SYNC_BYTES + 1);
		await expect(importSyncMerge(huge, 'any-passphrase')).rejects.toThrow(/too large/i);
	});

	it('rejects a non-JSON sync file with a friendly message', async () => {
		// Exact message, not a regex: V8's raw SyntaxError also ends in
		// "is not valid JSON", which must NOT satisfy this test.
		await expect(previewSyncMerge('not json at all', 'any-passphrase')).rejects.toThrow(
			'Sync file is not valid JSON.'
		);
	});
});
