import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '../db';
import * as srsRepo from '../db/repositories/srs';
import { createSrsCard } from './fsrs';
import { getReviewQueue, countDue, DEFAULT_REVIEW_BATCH } from './queue';

beforeEach(async () => {
	await resetDatabase();
});

describe('review queue', () => {
	it('returns and counts cards that are due now', async () => {
		const past = new Date(Date.now() - 60_000);
		await srsRepo.putCard(
			createSrsCard({ cardId: 'u:1', contentId: '1', cefrLevel: 'A1', skill: 'reading', now: past })
		);

		expect(await countDue()).toBe(1);
		expect(await getReviewQueue()).toHaveLength(1);
	});

	it('caps the queue at the session batch size', async () => {
		const past = new Date(Date.now() - 60_000);
		for (let i = 0; i < DEFAULT_REVIEW_BATCH + 5; i++) {
			await srsRepo.putCard(
				createSrsCard({
					cardId: `u:${i}`,
					contentId: `${i}`,
					cefrLevel: 'A1',
					skill: 'reading',
					now: past
				})
			);
		}
		expect(await getReviewQueue()).toHaveLength(DEFAULT_REVIEW_BATCH);
	});
});
