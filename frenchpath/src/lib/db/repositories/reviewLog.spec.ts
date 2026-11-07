import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import * as reviewLogRepo from './reviewLog';

const rec = (cardId: string, ts: number) => ({
	cardId,
	ts,
	grade: 3,
	state: 2,
	stability: 1,
	difficulty: 5,
	elapsedDays: 0,
	scheduledDays: 1
});

describe('reviewLog repository immutability', () => {
	it('exposes append-only APIs (no update or delete)', () => {
		const exports = Object.keys(reviewLogRepo).sort();
		expect(exports).toEqual([
			'appendReviewLog',
			'countReviews',
			'getAllReviewLogs',
			'getLogsForCard',
			'getLogsSince'
		]);
	});

	it('getLogsSince returns only logs at or after the bound', async () => {
		await reviewLogRepo.appendReviewLog(rec('a', 1000));
		await reviewLogRepo.appendReviewLog(rec('b', 2000));
		await reviewLogRepo.appendReviewLog(rec('c', 3000));
		const logs = await reviewLogRepo.getLogsSince(2000);
		expect(logs.map((l) => l.cardId).sort()).toEqual(['b', 'c']);
	});
});
