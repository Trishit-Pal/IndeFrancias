import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '$lib/db/schema';
import { revisionNotificationBody, shouldNotify } from './revisionNotify';

describe('revisionNotify', () => {
	it('shouldNotify returns false when notifications disabled', () => {
		expect(shouldNotify(5, { ...DEFAULT_SETTINGS, revisionNotifications: false })).toBe(false);
	});

	it('shouldNotify returns false when no cards due', () => {
		expect(shouldNotify(0, { ...DEFAULT_SETTINGS, revisionNotifications: true })).toBe(false);
	});

	it('shouldNotify returns true when enabled and cards due', () => {
		expect(shouldNotify(3, { ...DEFAULT_SETTINGS, revisionNotifications: true })).toBe(true);
	});

	it('revisionNotificationBody pluralises correctly', () => {
		expect(revisionNotificationBody(1)).toContain('1 card');
		expect(revisionNotificationBody(2)).toContain('2 cards');
	});
});
