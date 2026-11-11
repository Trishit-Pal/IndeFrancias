import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openDB, type IDBPDatabase } from 'idb';
import { resetDatabase } from '../db';
import { DB_NAME, type FrenchPathDB } from '../db/schema';
import type { MergeResult } from '../pwa/merge';

// Wraps the real mergePayloads so a test can run code at the instant the import merges
// (the moment between its local read and its write) and tamper with the merged result.
const mergeHook = vi.hoisted(() => ({
	before: null as (() => void) | null,
	after: null as ((result: MergeResult) => MergeResult) | null
}));
vi.mock('../pwa/merge', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../pwa/merge')>();
	return {
		...actual,
		mergePayloads: (...args: Parameters<typeof actual.mergePayloads>) => {
			mergeHook.before?.();
			const result = actual.mergePayloads(...args);
			return mergeHook.after ? mergeHook.after(result) : result;
		}
	};
});
import * as progressRepo from '../db/repositories/progress';
import * as reviewLogRepo from '../db/repositories/reviewLog';
import { exportBackup } from '../pwa/backup';
import { encryptPayload, WrongPassphraseError } from './crypto';
import * as srsRepo from '../db/repositories/srs';
import { todayKey } from '../utils/date';
import type { BackupPayload } from '../pwa/backupSchema';
import {
	exportSyncFile,
	previewSyncMerge,
	importSyncMerge,
	assertNoFutureDates,
	FutureDatedSyncError,
	MAX_FUTURE_SKEW_MS,
	MAX_SYNC_BYTES
} from './mergeFile';

const PASSPHRASE = 'correct horse battery staple';

beforeEach(async () => {
	mergeHook.before = null;
	mergeHook.after = null;
	await resetDatabase();
});

const review = (cardId: string, ts: number) => ({
	cardId,
	ts,
	grade: 3,
	state: 1,
	stability: 1,
	difficulty: 5,
	elapsedDays: 0,
	scheduledDays: 1
});

describe('sync import is one transaction (M3)', () => {
	let second: IDBPDatabase<FrenchPathDB> | null = null;
	afterEach(() => {
		second?.close(); // an open second connection would block the next resetDatabase()
		second = null;
	});

	it('keeps a review another writer commits between the local read and the write', async () => {
		await reviewLogRepo.appendReviewLog(review('card-b', 200));
		const remoteFile = await exportSyncFile(PASSPHRASE);
		await resetDatabase();
		await reviewLogRepo.appendReviewLog(review('card-a', 100));

		// A second connection to the same database, opened up front so that the wrapper below
		// can issue its write synchronously.
		second = await openDB<FrenchPathDB>(DB_NAME);
		const secondConn = second;
		let otherWrite: Promise<unknown> = Promise.resolve();
		mergeHook.before = () => {
			// Created while the import runs its merge. Transactions with overlapping scope run in
			// creation order, so it commits first if the import holds no transaction here, and
			// queues behind the import's transaction if it does. Deliberately not awaited.
			otherWrite = secondConn
				.transaction('reviewLog', 'readwrite')
				.objectStore('reviewLog')
				.add(review('card-other-tab', 300));
		};

		const summary = await importSyncMerge(remoteFile, PASSPHRASE);
		await otherWrite;

		expect(summary.newReviews).toBe(1);
		const logs = await reviewLogRepo.getAllReviewLogs();
		expect(logs.map((r) => r.cardId).sort()).toEqual(['card-a', 'card-b', 'card-other-tab']);
	});

	it('a failed write rolls the whole import back and keeps the existing message', async () => {
		await progressRepo.putProgress({
			lessonId: 'remote',
			status: 'completed',
			score: 70,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const remoteFile = await exportSyncFile(PASSPHRASE);
		await resetDatabase();
		await reviewLogRepo.appendReviewLog(review('card-a', 100));
		await progressRepo.putProgress({
			lessonId: 'keep',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
		const before = await exportBackup();

		// A progress row without its key makes the put fail after every store was cleared.
		mergeHook.after = (result) => ({
			...result,
			merged: { ...result.merged, progress: [{} as never] }
		});

		await expect(importSyncMerge(remoteFile, PASSPHRASE)).rejects.toThrow(
			'Sync merge failed — your existing data is unchanged'
		);

		const after = JSON.parse(await exportBackup()) as { payload: unknown };
		expect(after.payload).toEqual((JSON.parse(before) as { payload: unknown }).payload);
	});
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

// 23:30 local, so +24h and +25h fall on different calendar days (date-key fields).
const NOW = new Date(2026, 5, 15, 23, 30).getTime();
const HOUR = 60 * 60 * 1000;
const PAST = NOW - 10 * HOUR;
const PAST_KEY = todayKey(new Date(PAST));

function pastPayload(): BackupPayload {
	return {
		settings: null,
		progress: [
			{
				lessonId: 'a1-u1',
				status: 'completed',
				score: 90,
				attempts: 1,
				lastVisited: PAST,
				cefrLevel: 'A1'
			}
		],
		srsCards: [
			{
				cardId: 'c1',
				contentId: 'v1',
				cefrLevel: 'A1',
				skill: 'reading',
				due: new Date(PAST).toISOString(),
				stability: 1,
				difficulty: 5,
				elapsed_days: 0,
				scheduled_days: 1,
				learning_steps: 0,
				reps: 1,
				lapses: 0,
				state: 1,
				last_review: new Date(PAST).toISOString(),
				schedulerVersion: 'v1'
			}
		],
		reviewLog: [
			{
				cardId: 'c1',
				ts: PAST,
				grade: 3,
				state: 1,
				stability: 1,
				difficulty: 5,
				elapsedDays: 0,
				scheduledDays: 1
			}
		],
		streak: [
			{
				id: 'streak',
				currentStreak: 1,
				longestStreak: 1,
				lastActiveDate: PAST_KEY,
				freezesAvailable: 0,
				freezesUsed: 0
			}
		],
		stats: [{ date: PAST_KEY, xp: 10, minutes: 5, lessonsCompleted: 1, reviewsDone: 1 }],
		skillProfile: [{ skill: 'reading', estimatedLevel: 'A1', updatedAt: PAST }],
		assessments: [
			{
				assessmentId: 'as1',
				kind: 'unit_checkpoint',
				refId: 'a1-u1',
				score: 80,
				xpAwarded: 10,
				completedAt: PAST,
				lastFailedAt: PAST
			}
		]
	};
}

describe('assertNoFutureDates', () => {
	const future = NOW + 25 * HOUR;
	const futureKey = todayKey(new Date(future));
	const cases: [string, (p: BackupPayload) => BackupPayload][] = [
		[
			'progress.lastVisited',
			(p) => ({ ...p, progress: [{ ...p.progress[0], lastVisited: future }] })
		],
		[
			'srsCards.last_review',
			(p) => ({
				...p,
				srsCards: [{ ...p.srsCards[0], last_review: new Date(future).toISOString() }]
			})
		],
		['reviewLog.ts', (p) => ({ ...p, reviewLog: [{ ...p.reviewLog[0], ts: future }] })],
		[
			'skillProfile.updatedAt',
			(p) => ({ ...p, skillProfile: [{ ...p.skillProfile[0], updatedAt: future }] })
		],
		[
			'assessments.completedAt',
			(p) => ({ ...p, assessments: [{ ...p.assessments[0], completedAt: future }] })
		],
		[
			'assessments.lastFailedAt',
			(p) => ({ ...p, assessments: [{ ...p.assessments[0], lastFailedAt: future }] })
		],
		[
			'streak.lastActiveDate',
			(p) => ({ ...p, streak: [{ ...p.streak[0], lastActiveDate: futureKey }] })
		],
		['stats.date', (p) => ({ ...p, stats: [{ ...p.stats[0], date: futureKey }] })]
	];

	it('accepts a payload whose dates are all in the past', () => {
		expect(() => assertNoFutureDates(pastPayload(), NOW)).not.toThrow();
	});

	it('uses a 24 hour skew', () => {
		expect(MAX_FUTURE_SKEW_MS).toBe(24 * HOUR);
	});

	it('refuses a last_review in the year 9999', () => {
		const p = pastPayload();
		const bad = {
			...p,
			srsCards: [{ ...p.srsCards[0], last_review: '9999-12-31T00:00:00.000Z' }]
		};
		expect(() => assertNoFutureDates(bad, NOW)).toThrow(FutureDatedSyncError);
	});

	it.each(cases)('refuses %s 25 hours ahead', (_field, mutate) => {
		expect(() => assertNoFutureDates(mutate(pastPayload()), NOW)).toThrow(FutureDatedSyncError);
	});

	it('boundary: 23 hours ahead passes, 25 hours ahead throws', () => {
		const p = pastPayload();
		const at = (ms: number): BackupPayload => ({
			...p,
			progress: [{ ...p.progress[0], lastVisited: ms }],
			stats: [{ ...p.stats[0], date: todayKey(new Date(ms)) }]
		});
		expect(() => assertNoFutureDates(at(NOW + 23 * HOUR), NOW)).not.toThrow();
		expect(() => assertNoFutureDates(at(NOW + 25 * HOUR), NOW)).toThrow(FutureDatedSyncError);
	});

	it('does not check srsCards.due (legitimately far in the future)', () => {
		const p = pastPayload();
		const ok = { ...p, srsCards: [{ ...p.srsCards[0], due: '2099-01-01T00:00:00.000Z' }] };
		expect(() => assertNoFutureDates(ok, NOW)).not.toThrow();
	});

	it('skips an empty streak.lastActiveDate ("never")', () => {
		const p = pastPayload();
		const ok = { ...p, streak: [{ ...p.streak[0], lastActiveDate: '' }] };
		expect(() => assertNoFutureDates(ok, NOW)).not.toThrow();
	});

	it('uses the exact user-facing message', () => {
		const p = pastPayload();
		const bad = { ...p, reviewLog: [{ ...p.reviewLog[0], ts: NOW + 25 * HOUR }] };
		expect(() => assertNoFutureDates(bad, NOW)).toThrow(
			'This sync file has dates in the future. Check the date and time on both devices, then try again. If it still fails, use a backup file to move your progress.'
		);
		expect(new FutureDatedSyncError().message).toMatch(/both devices/);
		expect(new FutureDatedSyncError().name).toBe('FutureDatedSyncError');
	});
});

describe('sync file with future dates', () => {
	async function futureDatedFile(): Promise<string> {
		await srsRepo.putCard({
			cardId: 'far',
			contentId: 'v-far',
			cefrLevel: 'A1',
			skill: 'reading',
			due: new Date('9999-12-31T00:00:00.000Z'),
			stability: 1,
			difficulty: 5,
			elapsed_days: 0,
			scheduled_days: 1,
			learning_steps: 0,
			reps: 1,
			lapses: 0,
			state: 1,
			last_review: new Date('9999-12-30T00:00:00.000Z'),
			schedulerVersion: 'v1'
		});
		const fileJson = await exportSyncFile(PASSPHRASE);
		await resetDatabase();
		return fileJson;
	}

	async function localPayload(): Promise<BackupPayload> {
		return (JSON.parse(await exportBackup()) as { payload: BackupPayload }).payload;
	}

	async function seedLocal(): Promise<void> {
		await progressRepo.putProgress({
			lessonId: 'keep',
			status: 'completed',
			score: 80,
			attempts: 1,
			lastVisited: 1,
			cefrLevel: 'A1'
		});
	}

	it('previewSyncMerge refuses it and writes nothing', async () => {
		const fileJson = await futureDatedFile();
		await seedLocal();
		const before = await localPayload();

		await expect(previewSyncMerge(fileJson, PASSPHRASE)).rejects.toBeInstanceOf(
			FutureDatedSyncError
		);

		expect(await localPayload()).toEqual(before);
	});

	it('importSyncMerge refuses it and leaves local data identical', async () => {
		const fileJson = await futureDatedFile();
		await seedLocal();
		const before = await localPayload();

		await expect(importSyncMerge(fileJson, PASSPHRASE)).rejects.toBeInstanceOf(
			FutureDatedSyncError
		);

		expect(await localPayload()).toEqual(before);
		expect(await srsRepo.getCard('far')).toBeUndefined();
	});
});
