import { describe, it, expect } from 'vitest';
import { getGloss, getBridgeCopy, type GlossSource } from './gloss';
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
		ml: 'നമസ്കാരം',
		or: 'ନମସ୍କାର',
		as: 'নমস্কাৰ',
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
				pa: '',
				ml: '',
				or: '',
				as: ''
			}
		};
		const r = getGloss(partial, 'ta');
		expect(r.primary).toBe('हिंदी');
	});
});

describe('getGloss fallback for ml/or/as', () => {
	const card = { glosses: { hi: 'नमस्ते', en: 'hello' } } as unknown as GlossSource;

	it('falls back to English, not Hindi, for ml', () => {
		expect(getGloss(card, 'ml').primary).toBe('hello');
	});

	it('still falls back to Hindi for ta', () => {
		expect(getGloss(card, 'ta').primary).toBe('नमस्ते');
	});
});

describe('getBridgeCopy', () => {
	const bridge = {
		title: 'Default',
		body: 'Body',
		titleByLang: { hi: 'हिंदी शीर्षक', en: 'English title' },
		bodyByLang: { hi: 'हिंदी विवरण', en: 'English body' }
	};

	it('uses the English copy for ml, the Hindi copy for ta', () => {
		expect(getBridgeCopy(bridge, 'ml')).toEqual({ title: 'English title', body: 'English body' });
		expect(getBridgeCopy(bridge, 'ta')).toEqual({ title: 'हिंदी शीर्षक', body: 'हिंदी विवरण' });
	});

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
