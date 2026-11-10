import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '$lib/db/schema';
import { revisionNotificationBody, shouldNotify, showLocalNotification } from './revisionNotify';

describe('showLocalNotification', () => {
	afterEach(() => vi.unstubAllGlobals());
	const opts = { body: 'b', tag: 't' };

	it('uses the service worker registration when there is one', async () => {
		const showNotification = vi.fn(() => Promise.resolve());
		const ctor = vi.fn();
		vi.stubGlobal('navigator', {
			serviceWorker: { getRegistration: () => Promise.resolve({ showNotification }) }
		});
		vi.stubGlobal('Notification', ctor);
		await expect(showLocalNotification('Title', opts)).resolves.toBe(true);
		expect(showNotification).toHaveBeenCalledWith('Title', opts);
		expect(ctor).not.toHaveBeenCalled();
	});

	it('falls back to the Notification constructor without a registration', async () => {
		const ctor = vi.fn();
		vi.stubGlobal('navigator', {
			serviceWorker: { getRegistration: () => Promise.resolve(undefined) }
		});
		vi.stubGlobal('Notification', ctor);
		await expect(showLocalNotification('Title', opts)).resolves.toBe(true);
		expect(ctor).toHaveBeenCalledWith('Title', opts);
	});

	it('falls back when the registration cannot show (no active worker)', async () => {
		const ctor = vi.fn();
		vi.stubGlobal('navigator', {
			serviceWorker: {
				getRegistration: () =>
					Promise.resolve({ showNotification: () => Promise.reject(new TypeError('no worker')) })
			}
		});
		vi.stubGlobal('Notification', ctor);
		await expect(showLocalNotification('Title', opts)).resolves.toBe(true);
		expect(ctor).toHaveBeenCalledOnce();
	});

	it('returns false instead of throwing when the constructor is illegal (Chrome for Android)', async () => {
		vi.stubGlobal('navigator', {});
		vi.stubGlobal(
			'Notification',
			vi.fn(() => {
				throw new TypeError('Illegal constructor');
			})
		);
		await expect(showLocalNotification('Title', opts)).resolves.toBe(false);
	});
});

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
