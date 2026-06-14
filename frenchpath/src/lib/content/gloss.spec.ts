import { describe, it, expect } from 'vitest';
import { getGloss, getBridgeCopy } from './gloss';
import { NATIVE_LANGUAGES } from '$lib/profile/types';

const baseCard = {
	hindiGloss: 'नमस्ते',
	englishGloss: 'hello'
};

const glossesCard = {
	glosses: {
		hi: 'नमस्ते',
		bn: 'নমস্কার',
		ta: 'வணக்கம்',
		te: 'నమస్కారం',
		kn: 'ನಮಸ್ಕಾರ',
		mr: 'नमस्कार',
		gu: 'નમસ્તે',
		pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
		en: 'hello'
	}
};

describe('getGloss', () => {
	it('returns hindi primary for hi native language with legacy fields', () => {
		const r = getGloss(baseCard, 'hi');
		expect(r.primary).toBe('नमस्ते');
		expect(r.secondary).toBe('hello');
	});

	it('returns english primary for en native language with legacy fields', () => {
		const r = getGloss(baseCard, 'en');
		expect(r.primary).toBe('hello');
	});

	for (const lang of NATIVE_LANGUAGES) {
		it(`resolves glosses map for ${lang}`, () => {
			const r = getGloss(glossesCard, lang);
			expect(r.primary).toBe(glossesCard.glosses[lang]);
		});
	}

	it('falls back to hi then en when requested lang missing in glosses', () => {
		const partial = {
			glosses: {
				hi: 'हिंदी',
				en: 'English',
				bn: '',
				ta: '',
				te: '',
				kn: '',
				mr: '',
				gu: '',
				pa: ''
			}
		};
		const r = getGloss(partial, 'ta');
		expect(r.primary).toBe('हिंदी');
	});
});

describe('getBridgeCopy', () => {
	it('prefers native language bridge copy when available', () => {
		const r = getBridgeCopy(
			{
				title: 'English title',
				body: 'English body',
				titleByLang: { hi: 'हिंदी शीर्षक', en: 'English title' } as Record<
					import('$lib/db/schema').NativeLanguage,
					string
				>,
				bodyByLang: { hi: 'हिंदी विवरण', en: 'English body' } as Record<
					import('$lib/db/schema').NativeLanguage,
					string
				>
			},
			'hi'
		);
		expect(r.title).toBe('हिंदी शीर्षक');
		expect(r.body).toBe('हिंदी विवरण');
	});

	it('falls back to default title/body', () => {
		const r = getBridgeCopy({ title: 'Default', body: 'Body' }, 'ta');
		expect(r.title).toBe('Default');
		expect(r.body).toBe('Body');
	});
});
