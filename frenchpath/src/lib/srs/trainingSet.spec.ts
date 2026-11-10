import { describe, it, expect } from 'vitest';
import { buildTrainingSet } from './trainingSet';
import type { ReviewLogRecord } from '../db/schema';

const DAY = 86_400_000;
const log = (cardId: string, ts: number, grade: number): ReviewLogRecord => ({
	cardId,
	ts,
	grade,
	state: 2,
	stability: 1,
	difficulty: 5,
	elapsedDays: 0,
	scheduledDays: 1
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

	it('matches the original grouping on 100k shuffled logs (ties, invalid grades, hot cards)', () => {
		// Deterministic LCG so the fixture is stable across runs.
		let seed = 42;
		const rand = (n: number): number => {
			seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
			return seed % n;
		};
		const logs = Array.from({ length: 100_000 }, () =>
			// 1 in 10 logs lands on one of 3 hot cards; ts collide often (ties keep input order).
			log(rand(10) === 0 ? `hot${rand(3)}` : `c${rand(2_000)}`, rand(50_000) * 3_600_000, rand(6))
		);
		expect(buildTrainingSet(logs)).toEqual(referenceBuildTrainingSet(logs));
	});
});

// The pre-A10 implementation (array spread per append), kept verbatim as the behaviour oracle.
function referenceBuildTrainingSet(logs: ReviewLogRecord[]) {
	const valid = logs.filter((l) => l.grade >= 1 && l.grade <= 4);
	const byCard = new Map<string, ReviewLogRecord[]>();
	for (const l of valid) {
		const existing = byCard.get(l.cardId);
		byCard.set(l.cardId, existing ? [...existing, l] : [l]);
	}
	const cardsWithMinTs = Array.from(byCard.entries()).map(([cardId, reviews]) => ({
		cardId,
		reviews,
		minTs: Math.min(...reviews.map((l) => l.ts))
	}));
	const sortedCards = cardsWithMinTs.sort((a, b) => a.minTs - b.minTs);
	const ratings: number[] = [];
	const deltaTs: number[] = [];
	const lengths: number[] = [];
	for (const { reviews } of sortedCards) {
		const sorted = [...reviews].sort((a, b) => a.ts - b.ts);
		lengths.push(sorted.length);
		sorted.forEach((l, i) => {
			ratings.push(l.grade);
			deltaTs.push(i === 0 ? 0 : Math.floor((l.ts - sorted[i - 1].ts) / DAY));
		});
	}
	return {
		ratings: Uint32Array.from(ratings),
		deltaTs: Uint32Array.from(deltaTs),
		lengths: Uint32Array.from(lengths)
	};
}
