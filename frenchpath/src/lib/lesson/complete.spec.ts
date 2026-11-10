import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetDatabase } from '../db';
import * as progressRepo from '../db/repositories/progress';
import * as srsRepo from '../db/repositories/srs';
import * as statsRepo from '../db/repositories/stats';
import * as streakRepo from '../db/repositories/streak';
import { completeLesson, srsCardId } from './complete';
import { todayKey } from '../utils/date';
import type { Unit } from '../content/schema';

const unit: Unit = {
	id: 'a1-test',
	cefrLevel: 'A1',
	order: 0,
	title: 'Test unit',
	objective: 'objective',
	cards: [
		{
			id: 'w1',
			french: 'bonjour',
			gender: 'none',
			hindiGloss: 'h',
			englishGloss: 'hello',
			fauxAmi: false,
			cefrLevel: 'A1',
			skills: ['reading']
		},
		{
			id: 'w2',
			french: 'merci',
			gender: 'none',
			hindiGloss: 'h',
			englishGloss: 'thanks',
			fauxAmi: false,
			cefrLevel: 'A1',
			skills: []
		}
	],
	exercises: [{ type: 'mcq', id: 'e1', prompt: 'p', options: ['a', 'b'], answerIndex: 0 }]
};

beforeEach(async () => {
	await resetDatabase();
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** Makes every put on `storeName` throw synchronously, as IDB does for an unclonable value. */
function throwOnPut(storeName: string): void {
	const put = IDBObjectStore.prototype.put;
	vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
		this: IDBObjectStore,
		...args: Parameters<IDBObjectStore['put']>
	) {
		if (this.name === storeName) throw new DOMException('cannot clone', 'DataCloneError');
		return put.apply(this, args);
	});
}

describe('completeLesson', () => {
	it('writes progress, seeds one SRS card per vocab item, and adds stats', async () => {
		await completeLesson(unit, { correct: 2, total: 3, score: 67 });

		const progress = await progressRepo.getProgress('a1-test');
		expect(progress?.status).toBe('completed');
		expect(progress?.score).toBe(67);
		expect(progress?.attempts).toBe(1);

		expect(await srsRepo.getAllCards()).toHaveLength(2);
		expect(await srsRepo.hasCard(srsCardId('a1-test', 'w1'))).toBe(true);

		const stats = await statsRepo.getStats(todayKey());
		expect(stats.xp).toBe(20); // 2 correct * 10
		expect(stats.lessonsCompleted).toBe(1);
	});

	it('records daily activity, starting the streak', async () => {
		expect((await streakRepo.getStreak()).currentStreak).toBe(0);
		await completeLesson(unit, { correct: 1, total: 1, score: 100 });
		expect((await streakRepo.getStreak()).currentStreak).toBe(1);
	});

	it('keeps the best score and does not duplicate cards on replay', async () => {
		await completeLesson(unit, { correct: 3, total: 3, score: 100 });
		await completeLesson(unit, { correct: 1, total: 3, score: 33 });

		const progress = await progressRepo.getProgress('a1-test');
		expect(progress?.score).toBe(100);
		expect(progress?.attempts).toBe(2);
		expect(await srsRepo.getAllCards()).toHaveLength(2);
	});

	it('leaves already-reviewed SRS cards untouched when a completed lesson is replayed', async () => {
		await completeLesson(unit, { correct: 3, total: 3, score: 100 });
		const id = srsCardId('a1-test', 'w1');
		const seeded = (await srsRepo.getCard(id))!;
		const reviewed = {
			...seeded,
			reps: 4,
			stability: 12.5,
			due: new Date('2030-01-01T00:00:00Z')
		};
		await srsRepo.putCard(reviewed);

		await completeLesson(unit, { correct: 2, total: 3, score: 67 });

		const after = (await srsRepo.getCard(id))!;
		expect(after.reps).toBe(4);
		expect(after.stability).toBe(12.5);
		expect(after.due.toISOString()).toBe('2030-01-01T00:00:00.000Z');
	});

	it('awards improvement-delta XP across replays and caps at one full completion', async () => {
		await completeLesson(unit, { correct: 1, total: 3, score: 33 }); // first: +10
		await completeLesson(unit, { correct: 3, total: 3, score: 100 }); // improve by 2: +20
		const stats = await statsRepo.getStats(todayKey());
		expect(stats.xp).toBe(30); // == total(3) * 10, the lifetime ceiling
		expect((await progressRepo.getProgress('a1-test'))?.bestCorrect).toBe(3);
	});

	it('grants 0 XP for a no-improvement replay', async () => {
		await completeLesson(unit, { correct: 2, total: 2, score: 100 }); // +20
		await completeLesson(unit, { correct: 1, total: 2, score: 50 }); // worse: +0
		expect((await statsRepo.getStats(todayKey())).xp).toBe(20);
	});

	it('does not advance the streak on a no-improvement replay', async () => {
		const day1 = new Date('2026-03-01T10:00:00');
		const day2 = new Date('2026-03-02T10:00:00');
		await completeLesson(unit, { correct: 2, total: 2, score: 100 }, { now: day1 });
		await completeLesson(unit, { correct: 1, total: 2, score: 50 }, { now: day2 });
		const streak = await streakRepo.getStreak();
		expect(streak.currentStreak).toBe(1);
		expect(streak.lastActiveDate).toBe(todayKey(day1)); // day2 replay did NOT count
	});

	it('advances the streak when a replay sets a new best', async () => {
		const day1 = new Date('2026-03-01T10:00:00');
		const day2 = new Date('2026-03-02T10:00:00');
		await completeLesson(unit, { correct: 1, total: 2, score: 50 }, { now: day1 });
		await completeLesson(unit, { correct: 2, total: 2, score: 100 }, { now: day2 });
		expect((await streakRepo.getStreak()).currentStreak).toBe(2);
	});

	it('does not update skill profiles when score is below 60%', async () => {
		const { skillProfileRepo } = await import('../db');
		await completeLesson(unit, { correct: 1, total: 3, score: 33 });
		expect(await skillProfileRepo.getSkillProfile('reading')).toBeUndefined();
	});

	it('updates skill profiles when score is at least 60%', async () => {
		const { skillProfileRepo } = await import('../db');
		await completeLesson(unit, { correct: 2, total: 3, score: 67 });
		expect((await skillProfileRepo.getSkillProfile('reading'))?.estimatedLevel).toBe('A1');
	});

	it('persists nothing when the stats write fails, so the XP is not lost on retry', async () => {
		await completeLesson(unit, { correct: 1, total: 3, score: 33 }); // +10, bestCorrect 1
		throwOnPut('stats');

		await expect(completeLesson(unit, { correct: 3, total: 3, score: 100 })).rejects.toThrow();
		vi.restoreAllMocks();

		const progress = await progressRepo.getProgress('a1-test');
		expect(progress?.bestCorrect).toBe(1);
		expect(progress?.attempts).toBe(1);
		expect((await statsRepo.getStats(todayKey())).xp).toBe(10);

		// The retry still earns the improvement XP the failed attempt would have.
		const retry = await completeLesson(unit, { correct: 3, total: 3, score: 100 });
		expect(retry.goalXp).toBe(20);
		expect((await statsRepo.getStats(todayKey())).xp).toBe(30);
	});

	it('does not seed SRS cards when the operation fails', async () => {
		throwOnPut('stats');
		await expect(completeLesson(unit, { correct: 2, total: 3, score: 67 })).rejects.toThrow();
		vi.restoreAllMocks();
		expect(await srsRepo.getAllCards()).toHaveLength(0);
		expect(await progressRepo.getProgress('a1-test')).toBeUndefined();
	});

	it('awards 0 XP when the same result is recorded twice in a row', async () => {
		const first = await completeLesson(unit, { correct: 2, total: 3, score: 67 });
		const second = await completeLesson(unit, { correct: 2, total: 3, score: 67 });
		expect(first.goalXp).toBe(20);
		expect(second.goalXp).toBe(0);
		const stats = await statsRepo.getStats(todayKey());
		expect(stats.xp).toBe(20);
		expect(stats.lessonsCompleted).toBe(2);
		expect((await progressRepo.getProgress('a1-test'))?.attempts).toBe(2);
	});
});
