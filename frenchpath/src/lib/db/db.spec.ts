import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from './db';
import * as srsRepo from './repositories/srs';
import * as progressRepo from './repositories/progress';
import * as settingsRepo from './repositories/settings';
import * as reviewLogRepo from './repositories/reviewLog';
import * as statsRepo from './repositories/stats';
import type { SrsCard } from './schema';

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
