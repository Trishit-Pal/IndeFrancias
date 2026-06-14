import { describe, expect, it } from 'vitest';
import { buildLexicon, lookupLexicon, normalizeFrenchToken, tokenizeFrench } from './lexicon';
import type { Card } from './schema';

const sampleCard: Card = {
	id: 'test-bonjour',
	french: 'bonjour',
	gender: 'none',
	hindiGloss: 'नमस्ते',
	englishGloss: 'hello',
	cefrLevel: 'A1',
	skills: [],
	fauxAmi: false,
	forms: ['Bonjour']
};

describe('lexicon', () => {
	it('normalizes accents and case', () => {
		expect(normalizeFrenchToken('Été')).toBe('ete');
	});

	it('looks up card by french form', () => {
		const lex = buildLexicon([sampleCard], 'en');
		expect(lookupLexicon(lex, 'Bonjour')?.gloss.primary).toBe('hello');
	});

	it('handles contractions', () => {
		const card: Card = {
			...sampleCard,
			id: 'test-homme',
			french: 'homme',
			englishGloss: 'man',
			hindiGloss: 'आदमी',
			forms: ["l'homme"]
		};
		const lex = buildLexicon([card], 'en');
		expect(lookupLexicon(lex, "l'homme")?.french).toBe('homme');
	});

	it('tokenizes French sentences', () => {
		const tokens = tokenizeFrench('Bonjour, ça va ?');
		expect(tokens.filter((t) => t.type === 'word').map((t) => t.value)).toEqual([
			'Bonjour',
			'ça',
			'va'
		]);
	});
});
