/**
 * Regional gloss derivation and script validation for content packs.
 */
export const NATIVE_LANGS = ['hi', 'bn', 'ta', 'te', 'kn', 'mr', 'gu', 'pa', 'en'] as const;
export type NativeLang = (typeof NATIVE_LANGS)[number];

/** Expected Unicode blocks per gloss language key. */
export const SCRIPT_RANGES: Record<NativeLang, RegExp> = {
	hi: /[\u0900-\u097F]/,
	bn: /[\u0980-\u09FF]/,
	ta: /[\u0B80-\u0BFF]/,
	te: /[\u0C00-\u0C7F]/,
	kn: /[\u0C80-\u0CFF]/,
	mr: /[\u0900-\u097F]/,
	gu: /[\u0A80-\u0AFF]/,
	pa: /[\u0A00-\u0A7F]/,
	en: /[A-Za-z]/
};

const DEVANAGARI = /[\u0900-\u097F]/;

/** Devanagari to Gujarati (+0x180 offset for shared letters). */
export function devanagariToGujarati(text: string): string {
	return [...text]
		.map((ch) => {
			const code = ch.codePointAt(0)!;
			if (code >= 0x0900 && code <= 0x097f) return String.fromCodePoint(code + 0x180);
			return ch;
		})
		.join('');
}

/** Devanagari consonants/vowels map to Bengali (+0x80) for most codepoints. */
export function devanagariToBengali(text: string): string {
	return [...text]
		.map((ch) => {
			const code = ch.codePointAt(0)!;
			if (code >= 0x0900 && code <= 0x097f) return String.fromCodePoint(code + 0x80);
			return ch;
		})
		.join('');
}

/** Devanagari to Gurmukhi (+0x100 offset for Gurmukhi block alignment on shared letters). */
export function devanagariToGurmukhi(text: string): string {
	return [...text]
		.map((ch) => {
			const code = ch.codePointAt(0)!;
			if (code >= 0x0915 && code <= 0x0939) return String.fromCodePoint(code + 0x100);
			if (code >= 0x093e && code <= 0x094d) return String.fromCodePoint(code + 0x100);
			if (code === 0x0902) return '\u0A02';
			if (code === 0x0905) return '\u0A05';
			if (code === 0x0906) return '\u0A06';
			if (code === 0x0907) return '\u0A07';
			if (code === 0x0908) return '\u0A08';
			if (code === 0x0909) return '\u0A09';
			if (code === 0x090a) return '\u0A0A';
			if (code === 0x090f) return '\u0A0F';
			if (code === 0x0910) return '\u0A10';
			if (code === 0x0913) return '\u0A13';
			if (code === 0x0914) return '\u0A14';
			return ch;
		})
		.join('');
}

export type DravidianOverrides = Partial<Record<NativeLang, Record<string, string>>>;

export function buildRegionalGlosses(
	hi: string,
	en: string,
	overrides: DravidianOverrides = {}
): Record<NativeLang, string> {
	const bn = overrides.bn?.[en] ?? devanagariToBengali(hi);
	const ta = overrides.ta?.[en] ?? overrides.ta?.[hi] ?? en;
	const te = overrides.te?.[en] ?? overrides.te?.[hi] ?? en;
	const kn = overrides.kn?.[en] ?? overrides.kn?.[hi] ?? en;
	return {
		hi,
		en,
		bn,
		mr: hi,
		gu: devanagariToGujarati(hi),
		pa: overrides.pa?.[en] ?? devanagariToGurmukhi(hi),
		ta,
		te,
		kn
	};
}

export function glossHasExpectedScript(lang: NativeLang, text: string): boolean {
	if (!text.trim()) return false;
	if (lang === 'en') return SCRIPT_RANGES.en.test(text);
	return SCRIPT_RANGES[lang].test(text);
}

export function validateGlossScripts(
	glosses: Partial<Record<NativeLang, string>>,
	context: string
): string[] {
	const issues: string[] = [];
	for (const lang of NATIVE_LANGS) {
		const text = glosses[lang];
		if (!text?.trim()) {
			issues.push(`${context}: missing glosses.${lang}`);
			continue;
		}
		if (!glossHasExpectedScript(lang, text)) {
			issues.push(`${context}: glosses.${lang} lacks expected script — "${text.slice(0, 40)}"`);
		}
		if (lang === 'bn' && DEVANAGARI.test(text)) {
			issues.push(`${context}: glosses.bn contains Devanagari (expected Bengali)`);
		}
		if ((lang === 'ta' || lang === 'te' || lang === 'kn') && DEVANAGARI.test(text)) {
			issues.push(`${context}: glosses.${lang} contains Devanagari`);
		}
	}
	return issues;
}
