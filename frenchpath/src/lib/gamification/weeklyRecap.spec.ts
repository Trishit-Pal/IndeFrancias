import { describe, it, expect } from 'vitest';
import { buildWeeklyRecap, weekStartMs } from './weeklyRecap';
import type { ReviewLogRecord, DailyStats } from '$lib/db/schema';

const log = (cardId: string, grade: number): ReviewLogRecord => ({
	cardId,
	ts: 1,
	grade,
	state: 2,
	stability: 1,
	difficulty: 5,
	elapsedDays: 0,
	scheduledDays: 1
});
const day = (xp: number, lessons: number): DailyStats => ({
	date: 'd',
	xp,
	minutes: 0,
	lessonsCompleted: lessons,
	reviewsDone: 0
});
const base = { streak: 0, unitsDone: 0, unitsTotal: 0 };

describe('buildWeeklyRecap', () => {
	it('counts every grade except again as correct', () => {
		const r = buildWeeklyRecap({
			...base,
			stats: [],
			logs: [log('a', 1), log('b', 2), log('c', 3), log('d', 4)]
		});
		expect(r.reviews).toBe(4);
		expect(r.accuracy).toBe(75);
	});

	it('counts distinct cards with any grade above again', () => {
		const r = buildWeeklyRecap({
			...base,
			stats: [],
			logs: [log('a', 1), log('a', 3), log('a', 4), log('b', 1)]
		});
		expect(r.wordsRecalled).toBe(1);
	});

	it('sums xp and lessons and passes through streak and units', () => {
		const r = buildWeeklyRecap({
			logs: [],
			stats: [day(10, 1), day(5, 2)],
			streak: 4,
			unitsDone: 2,
			unitsTotal: 9
		});
		expect(r).toMatchObject({ xp: 15, lessons: 3, streak: 4, unitsDone: 2, unitsTotal: 9 });
	});

	it('gives zeros, not NaN, for empty input', () => {
		const r = buildWeeklyRecap({ ...base, logs: [], stats: [] });
		expect(r).toEqual({
			reviews: 0,
			accuracy: 0,
			wordsRecalled: 0,
			xp: 0,
			lessons: 0,
			streak: 0,
			unitsDone: 0,
			unitsTotal: 0
		});
	});
});

describe('weekStartMs', () => {
	it('is local midnight six days before today, aligned with lastNDayKeys(7)', () => {
		const now = new Date(2026, 10, 6, 15, 30); // 6 Nov; window starts 31 Oct
		expect(weekStartMs(now)).toBe(new Date(2026, 9, 31).getTime());
	});
});
