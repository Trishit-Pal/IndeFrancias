import { describe, it, expect } from 'vitest';
import { buildShareText, renderWeeklyPostcardPng } from './shareCard';

describe('shareCard', () => {
	it('builds share text with streak and xp', () => {
		const text = buildShareText({
			title: 'Lesson complete',
			subtitle: 'A1 Unit 1',
			streak: 7,
			xp: 40
		});
		expect(text).toContain('Lesson complete');
		expect(text).toContain('7-day streak');
		expect(text).toContain('+40 XP');
		expect(text).toContain('FrenchPath');
	});

	it('renders the weekly postcard to a Blob or null (null without a DOM)', async () => {
		const recap = {
			reviews: 3,
			accuracy: 67,
			wordsRecalled: 2,
			xp: 30,
			lessons: 1,
			streak: 2,
			unitsDone: 1,
			unitsTotal: 5
		};
		const out = await renderWeeklyPostcardPng(recap, { title: 'This week' });
		expect(out === null || out instanceof Blob).toBe(true);
	});
});
