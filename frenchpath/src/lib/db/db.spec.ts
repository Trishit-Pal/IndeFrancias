import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';
import { getDB, resetDatabase } from './db';
import * as srsRepo from './repositories/srs';
import * as progressRepo from './repositories/progress';
import * as settingsRepo from './repositories/settings';
import * as reviewLogRepo from './repositories/reviewLog';
import * as statsRepo from './repositories/stats';
import { DB_NAME, SETTINGS_KEY, type FrenchPathDB, type Settings, type SrsCard } from './schema';

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
