import { describe, expect, it } from 'vitest';
import { cardSchema, type Card } from '$lib/content/schema';
import { listUnitSummaries, loadUnit } from '$lib/content/loader';
import { buildContextPrompt, type CandidateCard } from './contextCard';

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
		const p = buildContextPrompt(etre, U, pool, 's')!;
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
