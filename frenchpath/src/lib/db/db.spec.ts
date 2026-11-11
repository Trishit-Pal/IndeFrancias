import { describe, it, expect, beforeEach } from 'vitest';
import { openDB, deleteDB } from 'idb';
import {
	getDB,
	resetDatabase,
	DatabaseBlockedError,
	DatabaseNewerError,
	onDatabaseNotice
} from './db';
import * as srsRepo from './repositories/srs';
import * as progressRepo from './repositories/progress';
import * as settingsRepo from './repositories/settings';
import * as reviewLogRepo from './repositories/reviewLog';
import * as statsRepo from './repositories/stats';
import {
	DB_NAME,
	DB_VERSION,
	SETTINGS_KEY,
	type FrenchPathDB,
	type Settings,
	type SrsCard
} from './schema';

function makeCard(id: string, due: Date): SrsCard {
	return {
		cardId: id,
		contentId: id,
		cefrLevel: 'A1',
		skill: 'reading',
		due,
		stability: 1,
		difficulty: 5,
		elapsed_days: 0,
		scheduled_days: 0,
		learning_steps: 0,
		reps: 0,
		lapses: 0,
		state: 0,
		schedulerVersion: 'test'
	};
}

beforeEach(async () => {
	await resetDatabase();
});

describe('settings repository', () => {
	it('returns defaults when empty', async () => {
		const settings = await settingsRepo.getSettings();
		expect(settings.targetRetention).toBe(0.9);
		expect(settings.uiLanguage).toBe('en');
	});

	it('merges patches immutably and persists them', async () => {
		const updated = await settingsRepo.saveSettings({ dailyGoalXp: 50 });
		expect(updated.dailyGoalXp).toBe(50);
		// untouched fields keep defaults
		expect(updated.targetRetention).toBe(0.9);
		const reloaded = await settingsRepo.getSettings();
		expect(reloaded.dailyGoalXp).toBe(50);
	});

	it('keeps both of two concurrent patches', async () => {
		await Promise.all([
			settingsRepo.saveSettings({ dailyGoalXp: 70 }),
			settingsRepo.saveSettings({ reduceMotion: true })
		]);
		const reloaded = await settingsRepo.getSettings();
		expect(reloaded.dailyGoalXp).toBe(70);
		expect(reloaded.reduceMotion).toBe(true);
	});
});

describe('srs `due` index', () => {
	it('returns only due cards, soonest-due first', async () => {
		const now = new Date('2026-01-10T00:00:00Z');
		await srsRepo.putCards([
			makeCard('past', new Date('2026-01-01T00:00:00Z')),
			makeCard('future', new Date('2026-02-01T00:00:00Z')),
			makeCard('earlier', new Date('2025-12-01T00:00:00Z'))
		]);

		const due = await srsRepo.getDueCards(now);

		expect(due.map((c) => c.cardId)).toEqual(['earlier', 'past']);
		expect(await srsRepo.countDue(now)).toBe(2);
	});

	it('respects the limit', async () => {
		const now = new Date('2026-01-10T00:00:00Z');
		await srsRepo.putCards([
			makeCard('a', new Date('2026-01-01T00:00:00Z')),
			makeCard('b', new Date('2026-01-02T00:00:00Z'))
		]);
		expect(await srsRepo.getDueCards(now, 1)).toHaveLength(1);
	});
});

describe('schema migration', () => {
	it('preserves v1 data across the v2 upgrade', async () => {
		// resetDatabase() already ran in beforeEach. Open the historical v1
		// database directly with its schema pinned literally — reusing the shared
		// upgrade callback from db.ts would also run the <2 step and defeat the test.
		const v1 = await openDB<FrenchPathDB>(DB_NAME, 1, {
			upgrade(db) {
				db.createObjectStore('settings');
				db.createObjectStore('progress', { keyPath: 'lessonId' });
				const srs = db.createObjectStore('srsCards', { keyPath: 'cardId' });
				srs.createIndex('due', 'due');
				srs.createIndex('cefrLevel', 'cefrLevel');
				srs.createIndex('skill', 'skill');
				const log = db.createObjectStore('reviewLog', { keyPath: 'id', autoIncrement: true });
				log.createIndex('cardId', 'cardId');
				log.createIndex('ts', 'ts');
				db.createObjectStore('streak', { keyPath: 'id' });
				db.createObjectStore('stats', { keyPath: 'date' });
				db.createObjectStore('skillProfile', { keyPath: 'skill' });
			}
		});
		await v1.put('settings', { dailyGoalXp: 99 } as unknown as Settings, SETTINGS_KEY);
		await v1.put('progress', {
			lessonId: 'a1-u1',
			status: 'completed',
			score: 88,
			attempts: 1,
			lastVisited: 123,
			cefrLevel: 'A1'
		});
		await v1.put('srsCards', makeCard('c1', new Date('2026-01-01T00:00:00Z')));
		expect(v1.version).toBe(1);
		expect([...v1.objectStoreNames]).not.toContain('assessments');
		v1.close();

		// The production open path upgrades 1 → 2 (adds the assessments store only).
		const db = await getDB();
		expect(db.version).toBe(2);
		expect([...db.objectStoreNames]).toContain('assessments');
		expect((await db.get('progress', 'a1-u1'))?.score).toBe(88);
		expect((await db.get('srsCards', 'c1'))?.cefrLevel).toBe('A1');
		expect((await db.get('settings', SETTINGS_KEY))?.dailyGoalXp).toBe(99);
	});
});

describe('progress + reviewLog + stats', () => {
	it('persists progress records', async () => {
		await progressRepo.putProgress({
			lessonId: 'a1-u1',
			status: 'completed',
			score: 90,
			attempts: 1,
			lastVisited: Date.now(),
			cefrLevel: 'A1'
		});
		expect((await progressRepo.getProgress('a1-u1'))?.status).toBe('completed');
	});

	it('appends review logs with autoIncrement ids', async () => {
		const id = await reviewLogRepo.appendReviewLog({
			cardId: 'x',
			ts: Date.now(),
			grade: 3,
			state: 1,
			stability: 1,
			difficulty: 5,
			elapsedDays: 0,
			scheduledDays: 1
		});
		expect(id).toBeGreaterThan(0);
		expect(await reviewLogRepo.countReviews()).toBe(1);
	});

	it('accumulates daily stats deltas', async () => {
		await statsRepo.addStats('2026-01-10', { xp: 10, reviewsDone: 5 });
		const after = await statsRepo.addStats('2026-01-10', { xp: 15, lessonsCompleted: 1 });
		expect(after.xp).toBe(25);
		expect(after.reviewsDone).toBe(5);
		expect(after.lessonsCompleted).toBe(1);
	});
});

describe('connection lifecycle', () => {
	it('closes its connection when another tab needs the database and reopens on the next call', async () => {
		const first = await getDB();

		// Another tab deletes the database: it only completes if our connection steps aside.
		await deleteDB(DB_NAME);

		const second = await getDB();
		expect(second).not.toBe(first);
		expect(second.version).toBe(DB_VERSION);
		await expect(second.get('settings', SETTINGS_KEY)).resolves.toBeUndefined();
	});

	it('retries the open after a failed one', async () => {
		// A higher-versioned database makes the DB_VERSION open fail with VersionError.
		const newer = await openDB(DB_NAME, DB_VERSION + 1, {
			upgrade(db) {
				db.createObjectStore('settings');
			}
		});
		newer.close();
		await expect(getDB()).rejects.toThrow();

		await deleteDB(DB_NAME); // the cause goes away; the cached rejection must not stick
		expect((await getDB()).version).toBe(DB_VERSION);
	});

	it('resetDatabase rejects instead of hanging while another connection stays open', async () => {
		await getDB();
		const stubborn = await openDB(DB_NAME); // no blocking handler: never closes itself
		await expect(resetDatabase()).rejects.toBeInstanceOf(DatabaseBlockedError);
		stubborn.close(); // lets the pending delete finish so later tests start clean
	});

	it('resetDatabase still deletes when the cached open is a rejected promise', async () => {
		const newer = await openDB(DB_NAME, DB_VERSION + 1, {
			upgrade(db) {
				db.createObjectStore('settings');
			}
		});
		newer.close();
		const failing = getDB(); // not yet rejected: resetDatabase sees the cached promise
		failing.catch(() => undefined);
		await expect(resetDatabase()).resolves.toBeUndefined();
		expect((await getDB()).version).toBe(DB_VERSION);
	});

	it('DatabaseBlockedError.completed settles once the other connection closes', async () => {
		await getDB();
		const stubborn = await openDB(DB_NAME);
		const error = await resetDatabase().catch((e: unknown) => e);
		expect(error).toBeInstanceOf(DatabaseBlockedError);
		stubborn.close();
		await expect((error as DatabaseBlockedError).completed).resolves.toBeUndefined();
	});

	it('resetDatabase succeeds when other tabs close on versionchange', async () => {
		await getDB();
		const polite = await openDB(DB_NAME, undefined, {
			blocking() {
				polite.close();
			}
		});
		await expect(resetDatabase()).resolves.toBeUndefined();
	});
});

describe('database notices', () => {
	async function createNewerDatabase(): Promise<void> {
		const newer = await openDB(DB_NAME, DB_VERSION + 1, {
			upgrade(db) {
				db.createObjectStore('settings');
			}
		});
		newer.close();
	}

	it('rejects with DatabaseNewerError and notifies "newer" when the database is newer than the app', async () => {
		await createNewerDatabase();
		const notices: string[] = [];
		const off = onDatabaseNotice((kind) => notices.push(kind));

		await expect(getDB()).rejects.toBeInstanceOf(DatabaseNewerError);
		off();

		expect(notices).toEqual(['newer']);
	});

	it('does not cache the newer-database failure', async () => {
		await createNewerDatabase();
		const off = onDatabaseNotice(() => undefined);
		await expect(getDB()).rejects.toBeInstanceOf(DatabaseNewerError);
		off();

		await deleteDB(DB_NAME);
		expect((await getDB()).version).toBe(DB_VERSION);
	});

	it('notifies once per failed open even when callers share the failing open', async () => {
		await createNewerDatabase();
		const notices: string[] = [];
		const off = onDatabaseNotice((kind) => notices.push(kind));

		const results = await Promise.allSettled([getDB(), getDB(), getDB()]);
		off();

		expect(results.every((r) => r.status === 'rejected')).toBe(true);
		expect(notices).toEqual(['newer']);
	});

	it('notifies "blocked" while another connection holds an older version, then opens once it closes', async () => {
		const stubborn = await openDB(DB_NAME, DB_VERSION - 1, {
			upgrade(db) {
				db.createObjectStore('settings');
			}
		}); // never closes on versionchange, like a tab running older code
		const notices: string[] = [];
		let blockedSeen: () => void = () => undefined;
		const blocked = new Promise<void>((resolve) => (blockedSeen = resolve));
		const off = onDatabaseNotice((kind) => {
			notices.push(kind);
			if (kind === 'blocked') blockedSeen();
		});

		const opening = getDB();
		await blocked;
		expect(notices).toEqual(['blocked']);

		stubborn.close(); // the open was not cancelled: it completes now
		expect((await opening).version).toBe(DB_VERSION);
		off();

		// Exactly one 'ready', after 'blocked', once the blocked open has resolved.
		expect(notices).toEqual(['blocked', 'ready']);
	});

	it('emits no "ready" for an ordinary, unblocked open', async () => {
		const notices: string[] = [];
		const off = onDatabaseNotice((kind) => notices.push(kind));

		await getDB();
		off();

		expect(notices).toEqual([]);
	});

	it('does not tell a listener that unsubscribed before the blocked open resolved', async () => {
		const stubborn = await openDB(DB_NAME, DB_VERSION - 1, {
			upgrade(db) {
				db.createObjectStore('settings');
			}
		});
		const notices: string[] = [];
		let blockedSeen: () => void = () => undefined;
		const blocked = new Promise<void>((resolve) => (blockedSeen = resolve));
		const off = onDatabaseNotice((kind) => {
			notices.push(kind);
			if (kind === 'blocked') blockedSeen();
		});

		const opening = getDB();
		await blocked;
		off();
		stubborn.close();
		await opening;

		expect(notices).toEqual(['blocked']);
	});

	it('still rejects with DatabaseNewerError and reaches later listeners when a listener throws', async () => {
		await createNewerDatabase();
		const calls: string[] = [];
		const offThrowing = onDatabaseNotice(() => {
			throw new Error('listener bug');
		});
		const offRecording = onDatabaseNotice((kind) => calls.push(kind));

		const error = await getDB().catch((e: unknown) => e);
		offThrowing();
		offRecording();

		expect(error).toBeInstanceOf(DatabaseNewerError);
		expect((error as DatabaseNewerError).name).toBe('DatabaseNewerError');
		expect(calls).toEqual(['newer']);
	});

	it('does not call a listener after it unsubscribes', async () => {
		await createNewerDatabase();
		const calls: string[] = [];
		const off = onDatabaseNotice((kind) => calls.push(kind));
		off();

		await expect(getDB()).rejects.toBeInstanceOf(DatabaseNewerError);

		expect(calls).toEqual([]);
	});
});
