import { normalizeAnswer } from '../lesson/engine';
import { isClose } from '../speech/score';
import type { ReviewGrade } from './fsrs';

export const SLOW_MS = 8000;

// Context graders never return 'easy': self-rating is the only path to it.
export function gradeChoice(correct: boolean, durationMs: number): ReviewGrade {
	if (!correct) return 'again';
	return durationMs > SLOW_MS ? 'hard' : 'good';
}

export function gradeTyped(input: string, accepted: readonly string[]): ReviewGrade {
	const typed = normalizeAnswer(input);
	if (!typed) return 'again';
	const forms = accepted.map(normalizeAnswer);
	if (forms.includes(typed)) return 'good';
	return forms.some((f) => isClose(typed, f)) ? 'hard' : 'again';
}

const SPOKEN: Record<'good' | 'partial' | 'retry', ReviewGrade> = {
	good: 'good',
	partial: 'hard',
	retry: 'again'
};
export const gradeSpoken = (overall: 'good' | 'partial' | 'retry'): ReviewGrade => SPOKEN[overall];
