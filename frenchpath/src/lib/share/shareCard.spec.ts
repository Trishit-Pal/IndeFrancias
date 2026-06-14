import { describe, it, expect } from 'vitest';
import { buildShareText } from './shareCard';

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
});
