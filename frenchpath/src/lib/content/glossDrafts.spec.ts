import { describe, expect, it } from 'vitest';
import { containsIndicScript } from '../../../scripts/lib/regionalGloss';

describe('containsIndicScript', () => {
	const samples: Record<string, string> = {
		Devanagari: 'नमस्ते',
		Bengali: 'নমস্কার',
		Gurmukhi: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
		Gujarati: 'નમસ્તે',
		Tamil: 'வணக்கம்',
		Telugu: 'నమస్కారం',
		Kannada: 'ನಮಸ್ಕಾರ',
		Malayalam: 'നമസ്കാരം',
		Odia: 'ନମସ୍କାର'
	};
	it.each(Object.entries(samples))('detects %s', (_name, text) => {
		expect(containsIndicScript(text)).toBe(true);
	});
	it('ignores accented French', () => {
		expect(containsIndicScript('Ça coûte déjà 20 € — où ?')).toBe(false);
	});
});
