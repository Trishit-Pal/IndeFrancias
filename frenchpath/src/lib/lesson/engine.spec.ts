import { describe, it, expect } from 'vitest';
import { normalizeAnswer, gradeExercise, scorePercent } from './engine';
import type { Exercise } from '../content/schema';

describe('normalizeAnswer', () => {
	it('lowercases, strips accents and punctuation, collapses spaces', () => {
		expect(normalizeAnswer('Café !')).toBe('cafe');
		expect(normalizeAnswer('  Au revoir. ')).toBe('au revoir');
		expect(normalizeAnswer('Garçon')).toBe('garcon');
	});
});

describe('gradeExercise', () => {
	it('grades multiple choice', () => {
		const mcq: Exercise = {
			type: 'mcq',
			id: 'm',
			prompt: '?',
			options: ['a', 'b'],
			answerIndex: 1
		};
		expect(gradeExercise(mcq, { type: 'mcq', selectedIndex: 1 })).toBe(true);
		expect(gradeExercise(mcq, { type: 'mcq', selectedIndex: 0 })).toBe(false);
	});

	it('grades cloze with normalisation and accepted alternates', () => {
		const cloze: Exercise = {
			type: 'cloze',
			id: 'c',
			text: 'say {{}}',
			answer: 'Au revoir',
			accept: ['au-revoir']
		};
		expect(gradeExercise(cloze, { type: 'cloze', text: 'au revoir' })).toBe(true);
		expect(gradeExercise(cloze, { type: 'cloze', text: 'AU REVOIR' })).toBe(true);
		expect(gradeExercise(cloze, { type: 'cloze', text: 'au-revoir' })).toBe(true);
		expect(gradeExercise(cloze, { type: 'cloze', text: 'bonjour' })).toBe(false);
	});

	it('returns false when the response type does not match the exercise', () => {
		const cloze: Exercise = { type: 'cloze', id: 'c', text: 'x {{}}', answer: 'a', accept: [] };
		const matching: Exercise = {
			type: 'matching',
			id: 'm',
			pairs: [
				{ left: 'a', right: '1' },
				{ left: 'b', right: '2' }
			]
		};
		const mcq: Exercise = {
			type: 'mcq',
			id: 'q',
			prompt: 'p',
			options: ['a', 'b'],
			answerIndex: 0
		};
		expect(gradeExercise(cloze, { type: 'mcq', selectedIndex: 0 })).toBe(false);
		expect(gradeExercise(matching, { type: 'cloze', text: 'x' })).toBe(false);
		expect(gradeExercise(mcq, { type: 'cloze', text: 'x' })).toBe(false);
	});

	it('grades matching only when every pair is correct', () => {
		const matching: Exercise = {
			type: 'matching',
			id: 'mt',
			pairs: [
				{ left: 'a', right: '1' },
				{ left: 'b', right: '2' }
			]
		};
		expect(
			gradeExercise(matching, {
				type: 'matching',
				pairs: [
					{ left: 'a', right: '1' },
					{ left: 'b', right: '2' }
				]
			})
		).toBe(true);
		expect(
			gradeExercise(matching, {
				type: 'matching',
				pairs: [
					{ left: 'a', right: '2' },
					{ left: 'b', right: '1' }
				]
			})
		).toBe(false);
	});
});

describe('gradeExercise — added types', () => {
	it('grades dictation against normalised text', () => {
		const ex: Exercise = {
			type: 'dictation',
			id: 'd',
			audioText: 'Bonjour',
			answer: 'Bonjour',
			accept: []
		};
		expect(gradeExercise(ex, { type: 'dictation', text: 'bonjour' })).toBe(true);
		expect(gradeExercise(ex, { type: 'dictation', text: 'merci' })).toBe(false);
	});

	it('grades translation against the answer or accepts', () => {
		const ex: Exercise = {
			type: 'translation',
			id: 't',
			prompt: 'Bonjour',
			direction: 'fr-en',
			answer: 'Hello',
			accept: ['hi']
		};
		expect(gradeExercise(ex, { type: 'translation', text: 'hello' })).toBe(true);
		expect(gradeExercise(ex, { type: 'translation', text: 'Hi' })).toBe(true);
		expect(gradeExercise(ex, { type: 'translation', text: 'bye' })).toBe(false);
	});

	it('grades reorder against the full ordered sentence', () => {
		const ex: Exercise = { type: 'reorder', id: 'r', words: ['Je', 'suis', 'Priya'] };
		expect(gradeExercise(ex, { type: 'reorder', words: ['Je', 'suis', 'Priya'] })).toBe(true);
		expect(gradeExercise(ex, { type: 'reorder', words: ['Priya', 'suis', 'Je'] })).toBe(false);
	});

	it('grades conjugation against the normalised form', () => {
		const ex: Exercise = {
			type: 'conjugation',
			id: 'c',
			verb: 'être',
			pronoun: 'je',
			answer: 'suis',
			accept: []
		};
		expect(gradeExercise(ex, { type: 'conjugation', text: 'suis' })).toBe(true);
		expect(gradeExercise(ex, { type: 'conjugation', text: 'es' })).toBe(false);
	});

	it('grades gender against the chosen value', () => {
		const ex: Exercise = {
			type: 'gender',
			id: 'g',
			noun: 'livre',
			answer: 'masculine',
			articleStyle: 'definite'
		};
		expect(gradeExercise(ex, { type: 'gender', choice: 'masculine' })).toBe(true);
		expect(gradeExercise(ex, { type: 'gender', choice: 'feminine' })).toBe(false);
	});
});

describe('scorePercent', () => {
	it('rounds to whole percent and handles empty', () => {
		expect(scorePercent(1, 3)).toBe(33);
		expect(scorePercent(5, 5)).toBe(100);
		expect(scorePercent(0, 0)).toBe(0);
	});
});
