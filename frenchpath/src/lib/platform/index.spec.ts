import { describe, it, expect, vi, afterEach } from 'vitest';
import { isDesktopPlatform } from './index';

describe('isDesktopPlatform', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns false when no Tauri internals are present', () => {
		vi.stubGlobal('window', {});
		expect(isDesktopPlatform()).toBe(false);
	});

	it('returns true when Tauri internals are injected', () => {
		vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
		expect(isDesktopPlatform()).toBe(true);
	});
});
