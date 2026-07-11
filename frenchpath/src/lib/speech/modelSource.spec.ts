import { describe, it, expect, vi, beforeEach } from 'vitest';

// Force the "web" branch: mock the platform module BEFORE importing modelSource.
vi.mock('../platform', () => ({
	isNativePlatform: () => false,
	isDesktopPlatform: () => false
}));

import { getModelStatus, downloadModel } from './modelSource';
import { MODEL_SHA256 } from './modelManifest';

const bytes = new TextEncoder().encode('fake-model');

function mockCaches(hasModel: boolean) {
	const put = vi.fn();
	globalThis.caches = {
		open: vi.fn(async () => ({
			match: vi.fn(async () => (hasModel ? new Response(bytes) : undefined)),
			put
		}))
	} as unknown as CacheStorage;
	return { put };
}

describe('modelSource (web)', () => {
	beforeEach(() => vi.restoreAllMocks());

	it('reports needs-download when cache is empty', async () => {
		mockCaches(false);
		expect(await getModelStatus()).toBe('needs-download');
	});

	it('reports ready when the model is cached', async () => {
		mockCaches(true);
		expect(await getModelStatus()).toBe('ready');
	});

	it('downloadModel rejects on hash mismatch and stores nothing', async () => {
		const { put } = mockCaches(false);
		globalThis.fetch = vi.fn(async () => new Response(bytes)) as unknown as typeof fetch;
		// MODEL_SHA256 is the hash of the real model, not of 'fake-model'.
		await expect(downloadModel()).rejects.toThrow(/integrity|hash/i);
		expect(put).not.toHaveBeenCalled();
		expect(MODEL_SHA256).toMatch(/^[a-f0-9]{64}$/);
	});
});
