// Pure lesson logic: normalising answers, grading a response, scoring.
// No DOM, no storage — trivially unit-testable.
import type { Exercise } from '../content/schema';

export type ExerciseResponse =
	| { type: 'mcq'; selectedIndex: number }
	| { type: 'cloze'; text: string }
	| { type: 'matching'; pairs: { left: string; right: string }[] }
	| { type: 'dictation'; text: string }
	| { type: 'translation'; text: string }
	| { type: 'reorder'; words: string[] }
	| { type: 'conjugation'; text: string }
	| { type: 'gender'; choice: 'masculine' | 'feminine' }
	| { type: 'reading'; selectedIndices: number[] }
	| { type: 'listening'; text: string }
	| { type: 'productive'; checked: boolean[] }
	| { type: 'speak'; overall: 'good' | 'partial' | 'retry'; selfOk?: boolean };

/** True if `text` matches the answer or any accepted alternative (normalised). */
function matchesText(answer: string, accept: readonly string[], text: string): boolean {
	return [answer, ...accept].map(normalizeAnswer).includes(normalizeAnswer(text));
}

// Combining diacritical marks (U+0300–U+036F), left behind by NFD decomposition.
const DIACRITICS = /[̀-ͯ]/g;
// Keep letters, numbers, whitespace, apostrophes and hyphens; drop other punctuation.
const PUNCTUATION = /[^\p{L}\p{N}\s'-]/gu;

/**
 * Normalises a free-text answer for forgiving comparison: lowercased,
 * accent-stripped, punctuation-trimmed, whitespace-collapsed. So
 * "Au revoir", "au-revoir" and "  au revoir " all compare equal.
 */
export function normalizeAnswer(value: string): string {
	return value
		.normalize('NFD')
		.replace(DIACRITICS, '')
		.toLowerCase()
		.replace(PUNCTUATION, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Grades a learner's response to one exercise. */
export function gradeExercise(exercise: Exercise, response: ExerciseResponse): boolean {
	switch (exercise.type) {
		case 'mcq':
			return response.type === 'mcq' && response.selectedIndex === exercise.answerIndex;

		case 'cloze':
			return (
				response.type === 'cloze' && matchesText(exercise.answer, exercise.accept, response.text)
			);

		case 'matching': {
			if (response.type !== 'matching') return false;
			const expected = new Map(exercise.pairs.map((p) => [p.left, p.right]));
			return (
				response.pairs.length === exercise.pairs.length &&
				response.pairs.every((p) => expected.get(p.left) === p.right)
			);
		}

		case 'dictation':
			return (
				response.type === 'dictation' &&
				matchesText(exercise.answer, exercise.accept, response.text)
			);

		case 'translation':
			return (
				response.type === 'translation' &&
				matchesText(exercise.answer, exercise.accept, response.text)
			);

		case 'conjugation':
			return (
				response.type === 'conjugation' &&
				matchesText(exercise.answer, exercise.accept, response.text)
			);

		case 'reorder':
			return (
				response.type === 'reorder' &&
				normalizeAnswer(response.words.join(' ')) === normalizeAnswer(exercise.words.join(' '))
			);

		case 'gender':
			return response.type === 'gender' && response.choice === exercise.answer;

		case 'reading': {
			if (response.type !== 'reading') return false;
			return exercise.questions.every((q, i) => response.selectedIndices[i] === q.answerIndex);
		}

		case 'listening':
			return (
				response.type === 'listening' &&
				matchesText(exercise.answer, exercise.accept, response.text)
			);

		case 'productive': {
			if (response.type !== 'productive') return false;
			const checked = response.checked.filter(Boolean).length;
			return checked >= exercise.minChecks;
		}

		case 'speak':
			return (
				response.type === 'speak' &&
				(response.overall === 'good' ||
					response.overall === 'partial' ||
					response.selfOk === true)
			);
	}
}

/** Whole-percent score, rounded. */
export function scorePercent(correct: number, total: number): number {
	return total === 0 ? 0 : Math.round((correct / total) * 100);
}
