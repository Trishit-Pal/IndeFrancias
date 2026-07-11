import { describe, it, expect } from 'vitest';
import { scorePronunciation } from './score';

const w = (word: string, conf = 1) => ({ word, conf });

describe('scorePronunciation', () => {
	it('all words recognized confidently → all good', () => {
		const r = scorePronunciation('je voudrais un café', [
			w('je'),
			w('voudrais'),
			w('un'),
			w('café')
		]);
		expect(r.words.map((x) => x.verdict)).toEqual(['good', 'good', 'good', 'good']);
		expect(r.overall).toBe('good');
	});

	it('missing word → missed; low confidence → unclear', () => {
		const r = scorePronunciation('je voudrais un café', [w('je'), w('voudrais', 0.4), w('café')]);
		expect(r.words).toEqual([
			{ expected: 'je', verdict: 'good' },
			{ expected: 'voudrais', verdict: 'unclear' },
			{ expected: 'un', verdict: 'missed' },
			{ expected: 'café', verdict: 'good' }
		]);
		expect(r.overall).toBe('partial');
	});

	it('accents/case do not penalize (normalized comparison)', () => {
		const r = scorePronunciation('Où est la gare ?', [w('ou'), w('est'), w('la'), w('gare')]);
		expect(r.overall).toBe('good');
	});

	it('close-but-not-exact word counts as unclear, not missed', () => {
		const r = scorePronunciation('bonjour', [w('bonjou')]);
		expect(r.words[0].verdict).toBe('unclear');
	});

	it('nothing recognized → retry', () => {
		const r = scorePronunciation('bonjour madame', []);
		expect(r.overall).toBe('retry');
		expect(r.words.every((x) => x.verdict === 'missed')).toBe(true);
	});

	it('mid-phrase punctuation-only token does not shift later expected labels', () => {
		// "..." is its own whitespace-separated token and normalizes to '', so it
		// must be dropped from BOTH the comparison and label sequences together —
		// not just the comparison one — or every word after it gets mislabeled.
		const r = scorePronunciation('Alors ... vous venez ?', [w('alors'), w('vous'), w('venez')]);
		expect(r.words).toEqual([
			{ expected: 'Alors', verdict: 'good' },
			{ expected: 'vous', verdict: 'good' },
			{ expected: 'venez', verdict: 'good' }
		]);
	});

	it("elided expected word (j'ai) matches Vosk splitting it into two tokens", () => {
		const r = scorePronunciation("J'ai froid", [w('j'), w('ai'), w('froid')]);
		expect(r.words).toEqual([
			{ expected: "J'ai", verdict: 'good' },
			{ expected: 'froid', verdict: 'good' }
		]);
		expect(r.overall).toBe('good');
	});

	it('elided expected word also matches Vosk emitting it as a single token', () => {
		const r = scorePronunciation("J'ai froid", [w("j'ai"), w('froid')]);
		expect(r.overall).toBe('good');
	});

	it('curly-apostrophe elision (content-pack style) splits the same way', () => {
		const r = scorePronunciation('J’ai froid', [w('j'), w('ai'), w('froid')]);
		expect(r.overall).toBe('good');
	});

	it('hyphenated expected word (est-ce) matches split recognition', () => {
		const r = scorePronunciation('Est-ce que ça va ?', [
			w('est'),
			w('ce'),
			w('que'),
			w('ça'),
			w('va')
		]);
		expect(r.overall).toBe('good');
	});

	it('partially heard elision counts as unclear, not missed', () => {
		const r = scorePronunciation("J'ai froid", [w('ai'), w('froid')]);
		expect(r.words[0]).toEqual({ expected: "J'ai", verdict: 'unclear' });
	});
});
