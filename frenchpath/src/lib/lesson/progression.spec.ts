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

	it('blocks next segment when checkpoint not passed', () => {
		const gated: UnitSummary[] = [
			{ id: 'a1-unit-01', cefrLevel: 'A1', order: 1, title: '', objective: '' },
			{ id: 'a1-unit-02', cefrLevel: 'A1', order: 2, title: '', objective: '' },
			{ id: 'a1-unit-03', cefrLevel: 'A1', order: 3, title: '', objective: '' },
			{ id: 'a1-unit-04', cefrLevel: 'A1', order: 4, title: '', objective: '' }
		];
		const progress = {
			...completed('a1-unit-01'),
			...completed('a1-unit-02'),
			...completed('a1-unit-03')
		};
		const states = computeUnitStates(gated, progress, new Set());
		expect(states.get('a1-unit-04')).toBe('locked');
	});
});

describe('isUnitLocked', () => {
	it('reports locked units', () => {
		expect(isUnitLocked('a2-1', summaries, {})).toBe(true);
		expect(isUnitLocked('a1-1', summaries, {})).toBe(false);
	});

	it('unlocks first A2 unit after all prior A1 units complete', () => {
		const a1Only: UnitSummary[] = [
			{ id: 'a1-10', cefrLevel: 'A1', order: 10, title: '', objective: '' },
			{ id: 'a2-01', cefrLevel: 'A2', order: 1, title: '', objective: '' }
		];
		const progress = completed('a1-10');
		expect(computeUnitStates(a1Only, progress).get('a2-01')).toBe('available');
	});
});
