import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '$lib/db/schema';
import { revisionNotificationBody, shouldNotify } from './revisionNotify';

describe('revisionNotify', () => {
	it('shouldNotify returns false when notifications disabled', () => {
		expect(
			shouldNotify(5, { ...DEFAULT_SETTINGS, revisionNotifications: false }, null, '2026-01-02')
		).toBe(false);
	});

	it('shouldNotify returns false when no cards due', () => {
		expect(
			shouldNotify(0, { ...DEFAULT_SETTINGS, revisionNotifications: true }, null, '2026-01-02')
		).toBe(false);
	});

	it('shouldNotify returns true when enabled and cards due', () => {
		expect(
			shouldNotify(3, { ...DEFAULT_SETTINGS, revisionNotifications: true }, null, '2026-01-02')
		).toBe(true);
	});

	it('shouldNotify returns false when already notified today', () => {
		const on = { ...DEFAULT_SETTINGS, revisionNotifications: true };
		expect(shouldNotify(3, on, '2026-01-02', '2026-01-02')).toBe(false);
	});

	it('shouldNotify returns true when last notified on an earlier day', () => {
		const on = { ...DEFAULT_SETTINGS, revisionNotifications: true };
		expect(shouldNotify(3, on, '2026-01-01', '2026-01-02')).toBe(true);
	});

	it('revisionNotificationBody pluralises correctly', () => {
		expect(revisionNotificationBody(1)).toContain('1 card');
		expect(revisionNotificationBody(2)).toContain('2 cards');
	});
});
