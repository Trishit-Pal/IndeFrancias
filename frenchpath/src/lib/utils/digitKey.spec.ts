import { describe, it, expect } from 'vitest';
import { digitKey } from './digitKey';

const press = (key: string, extra: Partial<KeyboardEvent> = {}) =>
	({ key, target: { tagName: 'BODY' }, ...extra }) as unknown as KeyboardEvent;

describe('digitKey', () => {
	it('returns the digit for a plain 1-9 press', () => {
		expect(digitKey(press('1'))).toBe(1);
		expect(digitKey(press('4'))).toBe(4);
	});

	it('ignores other keys', () => {
		expect(digitKey(press('0'))).toBeNull();
		expect(digitKey(press('a'))).toBeNull();
		expect(digitKey(press('Enter'))).toBeNull();
	});

	it('ignores a held key and modifier chords', () => {
		expect(digitKey(press('1', { repeat: true }))).toBeNull();
		expect(digitKey(press('1', { ctrlKey: true }))).toBeNull();
		expect(digitKey(press('1', { metaKey: true }))).toBeNull();
		expect(digitKey(press('1', { altKey: true }))).toBeNull();
	});

	it('ignores digits typed into a field', () => {
		const typing = (tagName: string) =>
			press('1', { target: { tagName } as unknown as EventTarget });
		expect(digitKey(typing('INPUT'))).toBeNull();
		expect(digitKey(typing('TEXTAREA'))).toBeNull();
		expect(digitKey(typing('SELECT'))).toBeNull();
		expect(
			digitKey(press('1', { target: { isContentEditable: true } as unknown as EventTarget }))
		).toBeNull();
	});
});
