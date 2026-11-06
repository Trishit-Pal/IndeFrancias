import { describe, it, expect } from 'vitest';
import { parseReviewMode } from './reviewMode';

describe('parseReviewMode', () => {
	it.each([null, '', 'EASY', '<script>', 'Read'])('falls back to read for %j', (raw) => {
		expect(parseReviewMode(raw)).toBe('read');
	});
	it.each(['read', 'listen', 'type', 'speak'] as const)('passes %s through', (mode) => {
		expect(parseReviewMode(mode)).toBe(mode);
	});
});
