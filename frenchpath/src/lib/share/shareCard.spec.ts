import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildShareText, renderWeeklyPostcardPng, shareBlob } from './shareCard';

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

describe('shareBlob', () => {
	const blob = new Blob(['x'], { type: 'image/png' });
	const stubShare = (share: () => Promise<void>) => {
		vi.stubGlobal('navigator', { share });
		const click = vi.fn();
		vi.stubGlobal('document', { createElement: () => ({ click }) });
		vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
		return click;
	};
	afterEach(() => vi.unstubAllGlobals());

	it('returns false on cancel without downloading the PNG', async () => {
		const click = stubShare(() => Promise.reject(new DOMException('cancelled', 'AbortError')));
		expect(await shareBlob(blob, 't', 'T', 'a.png', 'a.png')).toBe(false);
		expect(click).not.toHaveBeenCalled();
	});

	it('falls back to the PNG download on other share errors', async () => {
		const click = stubShare(() => Promise.reject(new Error('NotAllowedError')));
		expect(await shareBlob(blob, 't', 'T', 'a.png', 'a.png')).toBe(true);
		expect(click).toHaveBeenCalled();
	});
});
