import { describe, it, expect } from 'vitest';
import { skillsForUnit } from './skillProfileUpdate';
import type { Unit } from '../content/schema';

const baseUnit: Unit = {
	id: 'test',
	cefrLevel: 'A1',
	order: 1,
	title: 'Test',
	objective: 'Test',
	cards: [
		{
			id: 'c1',
			french: 'bonjour',
			gender: 'none',
			hindiGloss: 'h',
			englishGloss: 'e',
			cefrLevel: 'A1',
			skills: ['listening'],
			fauxAmi: false
		}
	],
	exercises: [{ type: 'mcq', id: 'e1', prompt: 'p', options: ['a', 'b'], answerIndex: 0 }]
};

describe('skillsForUnit', () => {
	it('collects card skills and exercise-inferred skills', () => {
		expect(skillsForUnit(baseUnit)).toContain('listening');
		expect(skillsForUnit(baseUnit)).toContain('reading');
	});
});
