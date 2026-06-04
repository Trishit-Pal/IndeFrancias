import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '../db';
import * as srsRepo from '../db/repositories/srs';
import * as reviewLogRepo from '../db/repositories/reviewLog';
import * as statsRepo from '../db/repositories/stats';
import { createSrsCard } from './fsrs';
import { recordReview, parseCardId } from './review';
import { todayKey } from '../utils/date';

beforeEach(async () => {
	await resetDatabase();
});

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
});
