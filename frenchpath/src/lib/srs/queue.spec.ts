import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '../db';
import * as srsRepo from '../db/repositories/srs';
import { createSrsCard } from './fsrs';
import { getReviewQueue, countDue, getNextDueMs, DEFAULT_REVIEW_BATCH } from './queue';

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

	it('includes cards due exactly at now', async () => {
		const now = new Date();
		await srsRepo.putCard(
			createSrsCard({ cardId: 'u:now', contentId: '1', cefrLevel: 'A1', skill: 'reading', now })
		);
		expect(await countDue()).toBe(1);
	});

	it('getNextDueMs uses index scan for future due cards', async () => {
		const now = new Date('2026-06-01T12:00:00Z');
		const future = new Date(now.getTime() + 2 * 3_600_000);
		await srsRepo.putCard(
			createSrsCard({
				cardId: 'u:future',
				contentId: '1',
				cefrLevel: 'A1',
				skill: 'reading',
				now: future
			})
		);
		expect(await getNextDueMs(now)).toBe('2h');
		expect(await getNextDueMs(now)).not.toBeNull();
	});

	it('getNextDueMs returns null when no future cards', async () => {
		const past = new Date(Date.now() - 60_000);
		await srsRepo.putCard(
			createSrsCard({
				cardId: 'u:due',
				contentId: '1',
				cefrLevel: 'A1',
				skill: 'reading',
				now: past
			})
		);
		expect(await getNextDueMs()).toBeNull();
	});
});
