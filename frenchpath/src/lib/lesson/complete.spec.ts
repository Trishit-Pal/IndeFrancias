import { describe, it, expect, beforeEach } from 'vitest';
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
});
