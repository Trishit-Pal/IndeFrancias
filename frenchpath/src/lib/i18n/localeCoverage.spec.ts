import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import hi from '../../../messages/hi.json';
import { BETA_LOCALES, uiLanguageLabel } from '$lib/profile/types';

type Messages = Record<string, string>;

const EN: Messages = en;
const LOCALES: Record<string, Messages> = Object.fromEntries(
	Object.entries(
		import.meta.glob<Messages>('../../../messages/*.json', { eager: true, import: 'default' })
	)
		.map(([path, messages]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), messages] as const)
		.filter(([locale]) => locale !== 'en')
);
const KEYS = Object.keys(EN).filter((key) => key !== '$schema');

/**
 * hi values allowed to equal English: not prose, so there is nothing to translate.
 * Anything else identical to en.json is an untranslated placeholder.
 */
const HI_SAME_AS_EN_ALLOWED = new Set([
	'onb_title', // French greeting + emoji ("Bonjour ! 👋")
	'settings_retention_85', // number ("85%")
	'settings_goal_xp' // placeholder + unit ("{xp} XP")
]);

describe('locale coverage', () => {
	// Paraglide silently falls back to English for a missing key, so nothing else catches this.
	it.each(Object.keys(LOCALES))('%s.json has every key in en.json', (locale) => {
		const missing = KEYS.filter((key) => !(key in LOCALES[locale]!));
		expect(missing).toEqual([]);
	});

	// A renamed or dropped {placeholder} renders literally (or loses the value) in that locale only.
	it.each(Object.keys(LOCALES))('%s.json uses the same {placeholders} as en.json', (locale) => {
		const names = (value: string | undefined) =>
			[...new Set((value ?? '').match(/\{\w+\}/g) ?? [])].sort();
		const mismatched = KEYS.filter(
			(key) => names(LOCALES[locale]![key]).join() !== names(EN[key]).join()
		);
		expect(mismatched).toEqual([]);
	});

	it('hi.json translates every prose string (no English placeholders)', () => {
		const untranslated = KEYS.filter(
			(key) => hi[key as keyof typeof hi] === EN[key] && !HI_SAME_AS_EN_ALLOWED.has(key)
		);
		expect(untranslated).toEqual([]);
	});

	it('hi allowlist only names keys that still exist', () => {
		expect([...HI_SAME_AS_EN_ALLOWED].filter((key) => !(key in EN))).toEqual([]);
	});
});

describe('language picker labels', () => {
	it('suffixes only beta locales with "(beta)"', () => {
		expect(uiLanguageLabel('bn')).toBe('বাংলা (beta)');
		expect(uiLanguageLabel('pa')).toBe('ਪੰਜਾਬੀ (beta)');
		expect(uiLanguageLabel('hi')).toBe('हिन्दी');
		expect(uiLanguageLabel('hinglish')).toBe('Hinglish');
		expect(uiLanguageLabel('en')).toBe('English');
	});

	it('labels the Dravidian, Odia and Assamese additions as beta', () => {
		expect(uiLanguageLabel('ml')).toBe('മലയാളം (beta)');
		expect(uiLanguageLabel('or')).toBe('ଓଡ଼ିଆ (beta)');
		expect(uiLanguageLabel('as')).toBe('অসমীয়া (beta)');
	});

	it('marks exactly the ten Indic locales as beta', () => {
		expect([...BETA_LOCALES].sort()).toEqual([
			'as',
			'bn',
			'gu',
			'kn',
			'ml',
			'mr',
			'or',
			'pa',
			'ta',
			'te'
		]);
	});
});
