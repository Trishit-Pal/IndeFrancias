import { describe, it, expect } from 'vitest';
import { evaluateRubric } from './rubric';
import type { Exercise } from '../content/schema';

const cloze = (rules: unknown[]): Exercise =>
	({
		type: 'cloze',
		id: 'x1',
		text: 'J\'ai {{}} ans.',
		answer: 'vingt',
		accept: [],
		rubricRules: rules
	}) as unknown as Exercise;

const AGE_RULE = {
	id: 'age-etre',
	match: "\\bje suis \\d+\\b",
	hint: 'In French, age uses avoir: "j\'ai 25 ans".',
	severity: 'correction'
};

describe('evaluateRubric', () => {
	it('returns a hint when a rule pattern matches the answer', () => {
		const hints = evaluateRubric('je suis 25', cloze([AGE_RULE]));
		expect(hints).toEqual([
			{ ruleId: 'age-etre', hint: AGE_RULE.hint, severity: 'correction' }
		]);
	});

	it('matches accent- and case-insensitively (normalized like grading)', () => {
		const hints = evaluateRubric('Je Suis 25 !', cloze([AGE_RULE]));
		expect(hints).toHaveLength(1);
	});

	it('returns [] when nothing matches', () => {
		expect(evaluateRubric("j'ai 25 ans", cloze([AGE_RULE]))).toEqual([]);
	});

	it('returns [] for exercises without rules', () => {
		expect(evaluateRubric('je suis 25', cloze([]))).toEqual([]);
	});

	it('caps hints at 2 per answer (most severe first)', () => {
		const rules = [
			{ id: 'r1', match: 'aaa', hint: 'h1', severity: 'gentle' },
			{ id: 'r2', match: 'bbb', hint: 'h2', severity: 'correction' },
			{ id: 'r3', match: 'ccc', hint: 'h3', severity: 'gentle' }
		];
		const hints = evaluateRubric('aaa bbb ccc', cloze(rules));
		expect(hints).toHaveLength(2);
		expect(hints[0].ruleId).toBe('r2'); // correction outranks gentle
	});

	it('never throws on an invalid regex in content (skips the rule)', () => {
		const bad = { id: 'bad', match: '(unclosed', hint: 'x', severity: 'gentle' };
		expect(evaluateRubric('anything', cloze([bad, AGE_RULE]))).toEqual([]);
	});
});
