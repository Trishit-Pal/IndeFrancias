import { describe, it, expect } from 'vitest';
import { computeUnitStates, isUnitLocked } from './progression';
import type { UnitSummary } from '../content/schema';
import type { ProgressRecord } from '../db/schema';

const summaries: UnitSummary[] = [
	{ id: 'a1-2', cefrLevel: 'A1', order: 2, title: '', objective: '' },
	{ id: 'a1-1', cefrLevel: 'A1', order: 1, title: '', objective: '' },
	{ id: 'a2-1', cefrLevel: 'A2', order: 1, title: '', objective: '' }
];

function completed(id: string): Record<string, ProgressRecord> {
	return {
		[id]: {
			lessonId: id,
			status: 'completed',
			score: 100,
			attempts: 1,
			lastVisited: 0,
			cefrLevel: 'A1'
		}
	};
}

describe('computeUnitStates', () => {
	it('opens only the first unit when nothing is done', () => {
		const states = computeUnitStates(summaries, {});
		expect(states.get('a1-1')).toBe('available');
		expect(states.get('a1-2')).toBe('locked');
		expect(states.get('a2-1')).toBe('locked');
	});

	it('unlocks the next unit once the previous is completed', () => {
		const states = computeUnitStates(summaries, completed('a1-1'));
		expect(states.get('a1-1')).toBe('completed');
		expect(states.get('a1-2')).toBe('available');
		expect(states.get('a2-1')).toBe('locked');
	});

	it('carries progression across CEFR levels', () => {
		const states = computeUnitStates(summaries, {
			...completed('a1-1'),
			...completed('a1-2')
		});
		expect(states.get('a2-1')).toBe('available');
	});
});

describe('isUnitLocked', () => {
	it('reports locked units', () => {
		expect(isUnitLocked('a2-1', summaries, {})).toBe(true);
		expect(isUnitLocked('a1-1', summaries, {})).toBe(false);
	});
});
