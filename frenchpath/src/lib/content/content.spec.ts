import { describe, it, expect } from 'vitest';
import { unitSchema, manifestSchema, exerciseSchema, cardSchema } from './schema';
import { listUnitSummaries, loadUnit } from './loader';

describe('authored content', () => {
	// Acts as the CI gate: every unit listed in the manifest must validate and
	// be internally consistent. A malformed card can never reach a learner.
	it('validates every unit in the manifest against the schema', async () => {
		const summaries = listUnitSummaries();
		expect(summaries.length).toBeGreaterThan(0);

		for (const summary of summaries) {
			const unit = await loadUnit(summary.id);
			expect(unit.id).toBe(summary.id);
			expect(unit.cefrLevel).toBe(summary.cefrLevel);
			expect(unit.exercises.length).toBeGreaterThanOrEqual(1);

			// every exercise that references a card references a real one
			const cardIds = new Set(unit.cards.map((c) => c.id));
			for (const ex of unit.exercises) {
				if (ex.cardId) expect(cardIds.has(ex.cardId)).toBe(true);
			}
		}
	});

	it('exposes a valid manifest sorted by level then order', () => {
		const summaries = listUnitSummaries();
		expect(summaries[0].id).toBe('a1-unit-01');
		expect(() => manifestSchema.parse(summaries)).not.toThrow();
	});

	it('throws on an unknown unit id', async () => {
		await expect(loadUnit('does-not-exist')).rejects.toThrow(/Unknown unit/);
	});
});

describe('schema acts as a validation gate', () => {
	it('rejects a cloze exercise missing the {{}} blank', () => {
		const bad = { type: 'cloze', id: 'x', text: 'no blank here', answer: 'a' };
		expect(exerciseSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects a unit with no exercises', () => {
		const bad = {
			id: 'u',
			cefrLevel: 'A1',
			order: 0,
			title: 't',
			objective: 'o',
			exercises: []
		};
		expect(unitSchema.safeParse(bad).success).toBe(false);
	});

	it('applies defaults for optional card fields', () => {
		const card = cardFixture();
		const parsed = cardSchema.parse(card);
		expect(parsed.gender).toBe('none');
		expect(parsed.fauxAmi).toBe(false);
		expect(parsed.skills).toEqual([]);
	});
});

function cardFixture() {
	return {
		id: 'c1',
		french: 'bonjour',
		hindiGloss: 'नमस्ते',
		englishGloss: 'hello',
		cefrLevel: 'A1'
	};
}
