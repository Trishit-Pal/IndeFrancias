import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyTheme, isDarkTheme } from './apply';

class FakeClassList {
	private classes = new Set<string>();
	add(...tokens: string[]) {
		for (const t of tokens) this.classes.add(t);
	}
	remove(...tokens: string[]) {
		for (const t of tokens) this.classes.delete(t);
	}
	contains(token: string) {
		return this.classes.has(token);
	}
}

describe('isDarkTheme', () => {
	it('returns true for dark and false for light', () => {
		expect(isDarkTheme('dark')).toBe(true);
		expect(isDarkTheme('light')).toBe(false);
	});
});

describe('applyTheme', () => {
	let classList: FakeClassList;
	let meta: { setAttribute: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		classList = new FakeClassList();
		meta = { setAttribute: vi.fn() };
		vi.stubGlobal('document', {
			documentElement: { classList },
			querySelector: vi.fn(() => meta)
		});
		vi.stubGlobal('window', {
			matchMedia: vi.fn(() => ({
				matches: true,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		});
	});

	it('applies light class for light theme', () => {
		applyTheme('light');
		expect(classList.contains('light')).toBe(true);
		expect(classList.contains('dark')).toBe(false);
	});

	it('applies dark class for dark theme', () => {
		applyTheme('dark');
		expect(classList.contains('dark')).toBe(true);
		expect(classList.contains('light')).toBe(false);
	});

	it('follows system preference for system theme', () => {
		applyTheme('system');
		expect(classList.contains('dark')).toBe(true);
	});
});
