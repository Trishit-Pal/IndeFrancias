import { describe, expect, it } from 'vitest';
import { SLOW_MS, gradeChoice, gradeSpoken, gradeTyped } from './contextGrade';

describe('gradeChoice', () => {
	it('wrong → again', () => expect(gradeChoice(false, 1000)).toBe('again'));
	it('correct & quick → good', () => expect(gradeChoice(true, 2000)).toBe('good'));
	it('correct & slow → hard', () => expect(gradeChoice(true, SLOW_MS + 1)).toBe('hard'));
});
describe('gradeTyped', () => {
	const accepted = ['dix'];
	it('exact (accent/case-insensitive) → good', () =>
		expect(gradeTyped('  DIX ', accepted)).toBe('good'));
	it('typo → hard', () => expect(gradeTyped('dis', ['diz', 'dix'])).toBe('hard'));
	it('wrong → again', () => expect(gradeTyped('onze', accepted)).toBe('again'));
	it('empty → again', () => expect(gradeTyped('', accepted)).toBe('again'));
	it('any accepted form → good', () =>
		expect(gradeTyped('suis', ['être', 'suis', 'es'])).toBe('good'));
});
describe('gradeSpoken', () => {
	it.each([
		['good', 'good'],
		['partial', 'hard'],
		['retry', 'again']
	] as const)('%s → %s', (o, g) => expect(gradeSpoken(o)).toBe(g));
});
it('never returns easy', () => {
	const all = [gradeChoice(true, 0), gradeTyped('dix', ['dix']), gradeSpoken('good')];
	expect(all).not.toContain('easy');
});
