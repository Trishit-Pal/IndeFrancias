import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetDatabase } from '../db';
import * as srsRepo from '../db/repositories/srs';
import * as reviewLogRepo from '../db/repositories/reviewLog';
import * as statsRepo from '../db/repositories/stats';
import * as streakRepo from '../db/repositories/streak';
import { createSrsCard } from './fsrs';
import { recordReview, parseCardId } from './review';
import { todayKey } from '../utils/date';

beforeEach(async () => {
	await resetDatabase();
});

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * Makes the browser abort the transaction as soon as `storeName` is written —
 * what a quota error, tab kill or iOS suspension does mid-operation.
 */
function abortTransactionOnPut(storeName: string): void {
	const put = IDBObjectStore.prototype.put;
	vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
		this: IDBObjectStore,
		...args: Parameters<IDBObjectStore['put']>
	) {
		const request = put.apply(this, args);
		if (this.name === storeName) this.transaction.abort();
		return request;
	});
}

describe('parseCardId', () => {
	it('splits the unit id from the content id', () => {
		expect(parseCardId('a1-unit-01:w1')).toEqual({ unitId: 'a1-unit-01', contentId: 'w1' });
	});

	it('handles ids without a separator', () => {
		expect(parseCardId('plain')).toEqual({ unitId: '', contentId: 'plain' });
	});
});

describe('recordReview', () => {
	it('reschedules + persists the card, logs the review, and credits stats', async () => {
		const now = new Date('2026-01-01T00:00:00Z');
		const card = createSrsCard({
			cardId: 'u:1',
			contentId: '1',
			cefrLevel: 'A1',
			skill: 'reading',
			now
		});
		await srsRepo.putCard(card);

		const updated = await recordReview(card, 'good', { now });
		expect(updated.reps).toBe(1);

		const stored = await srsRepo.getCard('u:1');
		expect(stored?.reps).toBe(1);

		const logs = await reviewLogRepo.getLogsForCard('u:1');
		expect(logs).toHaveLength(1);
		expect(logs[0].grade).toBe(3); // Rating.Good

		expect((await statsRepo.getStats(todayKey(now))).reviewsDone).toBe(1);
	});

	it('persists nothing when a write fails mid-operation', async () => {
		const now = new Date('2026-01-01T00:00:00Z');
		const card = createSrsCard({
			cardId: 'u:1',
			contentId: '1',
			cefrLevel: 'A1',
			skill: 'reading',
			now
		});
		await srsRepo.putCard(card);
		abortTransactionOnPut('stats');

		await expect(recordReview(card, 'good', { now })).rejects.toThrow();
		vi.restoreAllMocks();

		expect((await srsRepo.getCard('u:1'))?.reps).toBe(0);
		expect(await reviewLogRepo.getLogsForCard('u:1')).toHaveLength(0);
		expect((await statsRepo.getStats(todayKey(now))).reviewsDone).toBe(0);
		expect((await streakRepo.getStreak()).currentStreak).toBe(0);
	});
});
