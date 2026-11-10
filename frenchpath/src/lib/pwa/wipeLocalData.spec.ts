import { afterEach, describe, expect, it, vi } from 'vitest';
import { wipeLocalData } from './wipeLocalData';

function stubBrowser(overrides: { localStorage?: unknown; caches?: unknown; navigator?: unknown }) {
	const clear = vi.fn();
	const deleted: string[] = [];
	const unregister = vi.fn(() => Promise.resolve(true));
	vi.stubGlobal('localStorage', overrides.localStorage ?? { clear });
	vi.stubGlobal(
		'caches',
		overrides.caches ?? {
			keys: () => Promise.resolve(['fp-asr-model', 'workbox-precache']),
			delete: (name: string) => {
				deleted.push(name);
				return Promise.resolve(true);
			}
		}
	);
	vi.stubGlobal(
		'navigator',
		overrides.navigator ?? {
			serviceWorker: { getRegistrations: () => Promise.resolve([{ unregister }, { unregister }]) }
		}
	);
	return { clear, deleted, unregister };
}

afterEach(() => vi.unstubAllGlobals());

describe('wipeLocalData', () => {
	it('clears localStorage, every cache and every service-worker registration', async () => {
		const spies = stubBrowser({});
		await wipeLocalData();
		expect(spies.clear).toHaveBeenCalledOnce();
		expect(spies.deleted).toEqual(['fp-asr-model', 'workbox-precache']);
		expect(spies.unregister).toHaveBeenCalledTimes(2);
	});

	it('keeps going when one step throws', async () => {
		const spies = stubBrowser({
			localStorage: {
				clear: () => {
					throw new DOMException('denied', 'SecurityError');
				}
			}
		});
		await expect(wipeLocalData()).resolves.toBeUndefined();
		expect(spies.deleted).toHaveLength(2);
		expect(spies.unregister).toHaveBeenCalledTimes(2);
	});

	it('tolerates features that do not exist (no caches, no service worker)', async () => {
		vi.stubGlobal('localStorage', { clear: vi.fn() });
		vi.stubGlobal('caches', undefined);
		vi.stubGlobal('navigator', {});
		await expect(wipeLocalData()).resolves.toBeUndefined();
		expect(localStorage.clear).toHaveBeenCalledOnce();
	});

	it('still unregisters when cache deletion rejects', async () => {
		const spies = stubBrowser({
			caches: { keys: () => Promise.reject(new Error('boom')), delete: vi.fn() }
		});
		await wipeLocalData();
		expect(spies.unregister).toHaveBeenCalledTimes(2);
	});
});
