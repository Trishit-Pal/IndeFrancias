// The one place languages are declared. Pure on purpose: build scripts run with tsx import it,
// so no `$lib` alias, no Paraglide, no Svelte, no browser API.

export const UI_LANGUAGES = [
	'en',
	'hi',
	'hinglish',
	'bn',
	'ta',
	'te',
	'kn',
	'mr',
	'gu',
	'pa',
	'ml',
	'or',
	'as'
] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

export const NATIVE_LANGUAGES = ['hi', 'bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa', 'en'] as const;
export type NativeLanguage = (typeof NATIVE_LANGUAGES)[number];

/** Everything the app needs to know about one language code. */
export interface LanguageInfo {
	/** The language's name in its own script, as shown in pickers. */
	label: string;
	/** Interface text is a draft or placeholder: the picker shows "(beta)". */
	beta: boolean;
	/** Value for <html lang>. Differs from the code only for `hinglish` (→ `en`). */
	htmlLang: string;
	/** A character of this language's script; prose in this language must match it. */
	script: RegExp;
}

const LATIN = /[A-Za-z]/;

export const LANGUAGES: Record<UiLanguage | NativeLanguage, LanguageInfo> = {
	en: { label: 'English', beta: false, htmlLang: 'en', script: LATIN },
	hi: { label: 'हिन्दी', beta: false, htmlLang: 'hi', script: /[\u0900-\u097F]/ },
	hinglish: { label: 'Hinglish', beta: false, htmlLang: 'en', script: LATIN },
	bn: { label: 'বাংলা', beta: true, htmlLang: 'bn', script: /[\u0980-\u09FF]/ },
	ta: { label: 'தமிழ்', beta: true, htmlLang: 'ta', script: /[\u0B80-\u0BFF]/ },
	te: { label: 'తెలుగు', beta: true, htmlLang: 'te', script: /[\u0C00-\u0C7F]/ },
	kn: { label: 'ಕನ್ನಡ', beta: true, htmlLang: 'kn', script: /[\u0C80-\u0CFF]/ },
	mr: { label: 'मराठी', beta: true, htmlLang: 'mr', script: /[\u0900-\u097F]/ },
	gu: { label: 'ગુજરાતી', beta: true, htmlLang: 'gu', script: /[\u0A80-\u0AFF]/ },
	pa: { label: 'ਪੰਜਾਬੀ', beta: true, htmlLang: 'pa', script: /[\u0A00-\u0A7F]/ },
	ml: { label: 'മലയാളം', beta: true, htmlLang: 'ml', script: /[\u0D00-\u0D7F]/ },
	or: { label: 'ଓଡ଼ିଆ', beta: true, htmlLang: 'or', script: /[\u0B00-\u0B7F]/ },
	as: { label: 'অসমীয়া', beta: true, htmlLang: 'as', script: /[\u0980-\u09FF]/ }
};

/** Interface languages whose picker label carries "(beta)". Same order as UI_LANGUAGES. */
export const BETA_LOCALES: readonly UiLanguage[] = UI_LANGUAGES.filter((c) => LANGUAGES[c].beta);

/** The interface language a native language selects by default in onboarding. */
export const NATIVE_TO_UI: Record<NativeLanguage, UiLanguage> = {
	hi: 'hi',
	en: 'en',
	bn: 'bn',
	ta: 'ta',
	te: 'te',
	kn: 'kn',
	mr: 'mr',
	gu: 'gu',
	pa: 'pa'
};

const GLOSS_FALLBACK: readonly NativeLanguage[] = ['hi', 'en'];

/** Languages tried, in order, when a gloss is missing in the learner's native language. */
// The argument is part of the contract: a later language may fall back differently.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function glossFallback(_lang: NativeLanguage): readonly NativeLanguage[] {
	return GLOSS_FALLBACK;
}
