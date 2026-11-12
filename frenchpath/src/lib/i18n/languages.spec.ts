import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	BETA_LOCALES,
	LANGUAGES,
	NATIVE_LANGUAGES,
	NATIVE_TO_UI,
	UI_LANGUAGES,
	glossFallback
} from './languages';

const ROOT = process.cwd();
const LATIN = LANGUAGES.en.script;

describe('language registry', () => {
	it('UI_LANGUAGES matches the locales in project.inlang/settings.json, in order', () => {
		const settings = JSON.parse(
			readFileSync(resolve(ROOT, 'project.inlang/settings.json'), 'utf8')
		) as { locales: string[] };
		expect([...UI_LANGUAGES]).toEqual(settings.locales);
	});

	it('UI_LANGUAGES matches the messages/*.json files', () => {
		const files = readdirSync(resolve(ROOT, 'messages'))
			.filter((f) => f.endsWith('.json'))
			.map((f) => f.replace(/\.json$/, ''));
		expect([...files].sort()).toEqual([...UI_LANGUAGES].sort());
	});

	it('every non-Latin interface language has an html[lang] rule in tokens.css', () => {
		const css = readFileSync(resolve(ROOT, 'src/lib/theme/tokens.css'), 'utf8');
		const missing = UI_LANGUAGES.filter(
			(code) =>
				LANGUAGES[code].script.source !== LATIN.source && !css.includes(`html[lang='${code}']`)
		);
		expect(missing).toEqual([]);
	});

	it('has an entry for every code in both lists', () => {
		for (const code of [...UI_LANGUAGES, ...NATIVE_LANGUAGES]) {
			expect(LANGUAGES[code], code).toBeDefined();
		}
	});

	it('BETA_LOCALES is exactly the ten Indic locales, in UI order', () => {
		expect([...BETA_LOCALES]).toEqual(['bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa', 'ml', 'or', 'as']);
	});

	it('NATIVE_LANGUAGES is the nine original languages plus ml, or and as, English last', () => {
		expect([...NATIVE_LANGUAGES]).toEqual([
			'hi',
			'bn',
			'ta',
			'te',
			'kn',
			'mr',
			'gu',
			'pa',
			'ml',
			'or',
			'as',
			'en'
		]);
	});

	it('ml, or and as select their own interface language', () => {
		expect(NATIVE_TO_UI.ml).toBe('ml');
		expect(NATIVE_TO_UI.or).toBe('or');
		expect(NATIVE_TO_UI.as).toBe('as');
	});

	it('NATIVE_TO_UI maps every native language to an interface language', () => {
		for (const code of NATIVE_LANGUAGES) {
			expect(UI_LANGUAGES).toContain(NATIVE_TO_UI[code]);
		}
	});

	it('glossFallback tries hi then en', () => {
		expect(glossFallback('ta')).toEqual(['hi', 'en']);
	});

	it('glossFallback skips Hindi for ml, or and as', () => {
		for (const code of ['ml', 'or', 'as'] as const) expect(glossFallback(code)).toEqual(['en']);
	});

	it('hinglish renders as html lang en', () => {
		expect(LANGUAGES.hinglish.htmlLang).toBe('en');
		expect(LANGUAGES.bn.htmlLang).toBe('bn');
	});
});
