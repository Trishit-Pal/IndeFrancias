import { describe, it, expect } from 'vitest';
import { suggestUnitForWeakSkill } from './adaptiveSuggestions';
import type { UnitSummary } from '$lib/content/schema';

const units: UnitSummary[] = [
	{ id: 'a1-unit-01', cefrLevel: 'A1', order: 1, title: 'Greetings', objective: 'reading basics' },
	{
		id: 'a1-unit-02',
		cefrLevel: 'A1',
		order: 2,
		title: 'Listening drill',
		objective: 'listening practice'
	}
];

describe('suggestUnitForWeakSkill', () => {
	it('returns null when no skill profiles exist', () => {
		const states = new Map([['a1-unit-01', 'available' as const]]);
		expect(suggestUnitForWeakSkill(units, [], states)).toBeNull();
	});

	it('suggests an available unit for the weakest skill', () => {
		const states = new Map([
			['a1-unit-01', 'available' as const],
			['a1-unit-02', 'available' as const]
		]);
		const suggestion = suggestUnitForWeakSkill(
			units,
			[{ skill: 'listening', estimatedLevel: 'A1', updatedAt: 0 }],
			states
		);
		expect(suggestion?.unit.id).toBe('a1-unit-02');
	});
});
