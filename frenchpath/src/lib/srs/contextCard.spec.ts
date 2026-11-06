import { describe, expect, it } from 'vitest';
import { cardSchema, type Card } from '$lib/content/schema';
import { listUnitSummaries, loadUnit } from '$lib/content/loader';
import { buildContextPrompt, glossOnlyPrompt, type CandidateCard } from './contextCard';

function mk(
	id: string,
	french: string,
	extra: { gender?: Card['gender']; forms?: string[]; example?: string; cefr?: string } = {}
): Card {
	return cardSchema.parse({
		id,
		french,
		gender: extra.gender ?? 'none',
		forms: extra.forms,
		example: extra.example ? { french: extra.example } : undefined,
		englishGloss: 'x',
		hindiGloss: 'x',
		cefrLevel: extra.cefr ?? 'A1'
	});
}

const U = 'u';
const pool: CandidateCard[] = ['chat', 'livre', 'table', 'arbre', 'sac'].map((w, i) => ({
	card: mk(`p${i}`, w),
	unitId: U
}));

describe('buildContextPrompt', () => {
	it('blanks the target inside its example', () => {
		const dix = mk('dix', 'dix', { example: 'Il est dix heures.' });
		const p = buildContextPrompt(dix, 'a1-unit-03', pool, 'c1')!;
		expect(p.before + '___' + p.after).toBe('Il est ___ heures.');
		expect(p.answer).toBe('dix');
		expect(p.choices).toHaveLength(4);
		expect(p.choices).toContain('dix');
	});

	it('matches via forms and keeps the surface form', () => {
		const etre = mk('etre', 'être', { forms: ['suis', 'es'], example: 'Je suis indien.' });
		const withForms = ['avoir', 'aller', 'faire'].map((w, i) => ({
			card: mk(`f${i}`, w, { forms: [`f${i}a`, `f${i}b`] }),
			unitId: U
		}));
		const p = buildContextPrompt(etre, U, withForms, 's')!;
		expect(p.answer).toBe('suis');
		expect(p.accepted).toEqual(['suis', 'être', 'suis', 'es']);
	});

	it('keeps a contraction prefix outside the blank', () => {
		const homme = mk('homme', 'homme', { gender: 'masculine', example: "C'est l'homme." });
		const pool2 = pool.map((c, i) => ({
			...c,
			card: mk(`m${i}`, c.card.french, { gender: 'masculine' })
		}));
		const p = buildContextPrompt(homme, U, pool2, 's')!;
		expect(p.before).toBe("C'est l'");
		expect(p.answer).toBe('homme');
	});

	it('handles a typographic apostrophe', () => {
		const homme = mk('homme', 'homme', { example: 'C’est l’homme.' });
		const p = buildContextPrompt(homme, U, pool, 's')!;
		expect(p.before).toBe('C’est l’');
		expect(p.answer).toBe('homme');
	});

	it('capitalizes distractors when the answer is sentence-initial', () => {
		const dix = mk('dix', 'dix', { example: "Dix heures, c'est tard." });
		const p = buildContextPrompt(dix, U, pool, 's')!;
		expect(p.answer).toBe('Dix');
		expect(p.choices.every((c) => /^\p{Lu}/u.test(c))).toBe(true);
	});

	it('distractors share gender and never duplicate the answer or sentence words', () => {
		const target = mk('t', 'pomme', { gender: 'feminine', example: 'Une pomme et un sac.' });
		const cands: CandidateCard[] = [
			{ card: mk('a', 'table', { gender: 'feminine' }), unitId: U },
			{ card: mk('b', 'chaise', { gender: 'feminine' }), unitId: U },
			{ card: mk('c', 'porte', { gender: 'feminine' }), unitId: U },
			{ card: mk('d', 'livre', { gender: 'masculine' }), unitId: U },
			{ card: mk('e', 'sac', { gender: 'feminine' }), unitId: U },
			{ card: mk('f', 'pomme', { gender: 'feminine' }), unitId: U },
			{ card: mk('t', 'pomme', { gender: 'feminine' }), unitId: U }
		];
		const p = buildContextPrompt(target, U, cands, 's')!;
		expect([...p.choices].sort()).toEqual(['chaise', 'pomme', 'porte', 'table']);
	});

	it('leaves the article in before; answer is the bare noun', () => {
		const the = mk('the', 'le thé', { gender: 'masculine', example: 'Arjun aime le thé masala.' });
		const masc = pool.map((c, i) => ({
			...c,
			card: mk(`g${i}`, c.card.french, { gender: 'masculine' })
		}));
		const p = buildContextPrompt(the, U, masc, 's')!;
		expect(p.before).toBe('Arjun aime le ');
		expect(p.answer).toBe('thé');
		expect(p.choices.some((c) => /^(le|la|les) /i.test(c))).toBe(false);
	});

	it('matches " / " variants', () => {
		const vert = mk('vert', 'vert / verte', { example: 'Une robe verte.' });
		expect(buildContextPrompt(vert, U, pool, 's')!.answer).toBe('verte');
	});

	it('prefers an exact hit over an earlier fuzzy one', () => {
		const jouer = mk('jouer', 'jouer', {
			forms: ['joue'],
			example: 'Chaque jour, je joue au cricket.'
		});
		const withForms = ['avoir', 'aller', 'faire'].map((w, i) => ({
			card: mk(`f${i}`, w, { forms: [`f${i}a`] }),
			unitId: U
		}));
		expect(buildContextPrompt(jouer, U, withForms, 's')!.answer).toBe('joue');
		const jouer2 = mk('jouer', 'jouer', { example: 'Chaque jour, je joue au cricket.' });
		const verbs = ['parler', 'habiter', 'laver'].map((w, i) => ({
			card: mk(`v${i}`, w),
			unitId: U
		}));
		// no exact hit: fuzzy -er rule still blanks the inflection ("jour" is 1 char short of the stem)
		expect(buildContextPrompt(jouer2, U, verbs, 's')!.answer).toBe('joue');
	});

	it('blanks a plural inflection', () => {
		const parent = mk('p', 'parent', { example: 'Mes parents habitent à Chennai.' });
		expect(buildContextPrompt(parent, U, pool, 's')!.answer).toBe('parents');
	});

	it('conjugates -er distractors with the answer suffix (R5a)', () => {
		const parler = mk('parler', 'parler', { example: 'Je parle un peu français.' });
		const verbs = ['habiter', 'laver', 'se lever', 'chat'].map((w, i) => ({
			card: mk(`v${i}`, w),
			unitId: U
		}));
		const p = buildContextPrompt(parler, U, verbs, 's')!;
		expect(p.answer).toBe('parle');
		expect([...p.choices].sort()).toEqual(['habite', 'lave', 'leve', 'parle']);
	});

	it('uses the same forms slot for distractors (R5b)', () => {
		const etre = mk('etre', 'être', { forms: ['suis', 'es'], example: 'Tu es indien.' });
		const others = [
			mk('a', 'avoir', { forms: ['ai', 'as'] }),
			mk('b', 'aller', { forms: ['vais', 'vas'] }),
			mk('c', 'faire', { forms: ['fais', 'fais2'] }),
			mk('d', 'dire')
		].map((card) => ({ card, unitId: U }));
		const p = buildContextPrompt(etre, U, others, 's')!;
		expect(p.answer).toBe('es');
		expect([...p.choices].sort()).toEqual(['as', 'es', 'fais2', 'vas']);
	});

	it('same seed gives same order; different seeds vary', () => {
		const dix = mk('dix', 'dix', { example: 'Il est dix heures.' });
		const orders = new Set<string>();
		for (let i = 0; i < 20; i++) {
			orders.add(buildContextPrompt(dix, U, pool, `s${i}`)!.choices.join('|'));
		}
		expect(buildContextPrompt(dix, U, pool, 'a')!.choices).toEqual(
			buildContextPrompt(dix, U, pool, 'a')!.choices
		);
		expect(orders.size).toBeGreaterThan(1);
	});

	it('returns null when the word is absent from the example or no example', () => {
		expect(
			buildContextPrompt(mk('x', 'dix', { example: 'Il est tard.' }), U, pool, 's')
		).toBeNull();
		expect(buildContextPrompt(mk('y', 'dix'), U, pool, 's')).toBeNull();
	});

	it('returns null when fewer than 3 distractors qualify', () => {
		const dix = mk('dix', 'dix', { example: 'Il est dix heures.' });
		expect(buildContextPrompt(dix, U, pool.slice(0, 2), 's')).toBeNull();
	});

	it('covers >=80% of real pack cards', async () => {
		const units = await Promise.all(listUnitSummaries().map((s) => loadUnit(s.id)));
		const all: CandidateCard[] = units.flatMap((u) =>
			u.cards.map((card) => ({ card, unitId: u.id }))
		);
		let total = 0;
		const failed: string[] = [];
		// B1+ packs are generated placeholder templates (same 6 cards per unit, one example
		// that never contains its target), so coverage is measured on the authored A1/A2 packs.
		for (const { card, unitId } of all) {
			if (!['A1', 'A2'].includes(card.cefrLevel)) continue;
			total++;
			const cands = all.filter((c) => c.card.cefrLevel === card.cefrLevel);
			if (!buildContextPrompt(card, unitId, cands, card.id)) {
				failed.push(`${card.id}:${card.french}|${card.example?.french ?? '(none)'}`);
			}
		}
		const ratio = (total - failed.length) / total;
		expect(
			ratio,
			`coverage ${(ratio * 100).toFixed(1)}%; null: ${failed.join(' ; ')}`
		).toBeGreaterThanOrEqual(0.8);
	});
});

describe('glossOnlyPrompt', () => {
	it('accepts the French and its forms with no sentence or choices', () => {
		expect(glossOnlyPrompt({ french: 'manger', forms: ['mange', 'mangeons'] })).toEqual({
			before: '',
			answer: 'manger',
			after: '',
			choices: [],
			accepted: ['manger', 'mange', 'mangeons']
		});
	});
	it('works without forms', () => {
		expect(glossOnlyPrompt({ french: 'pain' }).accepted).toEqual(['pain']);
	});
});
