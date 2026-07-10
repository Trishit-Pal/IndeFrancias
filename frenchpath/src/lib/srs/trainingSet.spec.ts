import { describe, it, expect } from 'vitest';
import { buildTrainingSet } from './trainingSet';
import type { ReviewLogRecord } from '../db/schema';

const DAY = 86_400_000;
const log = (cardId: string, ts: number, grade: number): ReviewLogRecord => ({
	cardId, ts, grade, state: 2, stability: 1, difficulty: 5, elapsedDays: 0, scheduledDays: 1
});

describe('buildTrainingSet', () => {
	it('groups by card, sorts by ts, computes day deltas', () => {
		const logs = [
			log('b', 10 * DAY, 3),
			log('a', 0, 3),
			log('a', 3 * DAY, 4),
			log('a', 10 * DAY, 2)
		];
		const t = buildTrainingSet(logs);
		expect(Array.from(t.lengths)).toEqual([3, 1]); // card a (first seen at ts 0), then b
		expect(Array.from(t.ratings)).toEqual([3, 4, 2, 3]);
		expect(Array.from(t.deltaTs)).toEqual([0, 3, 7, 0]);
	});

	it('clamps sub-day gaps to 0 and ignores grades outside 1..4', () => {
		const logs = [log('a', 0, 3), log('a', DAY / 2, 9), log('a', DAY, 4)];
		const t = buildTrainingSet(logs);
		expect(Array.from(t.ratings)).toEqual([3, 4]);
		expect(Array.from(t.deltaTs)).toEqual([0, 1]);
	});

	it('handles empty input', () => {
		const t = buildTrainingSet([]);
		expect(t.lengths.length).toBe(0);
	});
});
