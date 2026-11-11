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

	describe('with completed units', () => {
		const manyUnits: UnitSummary[] = Array.from({ length: 8 }, (_, i) => ({
			id: `a1-unit-0${i + 1}`,
			cefrLevel: 'A1',
			order: i + 1,
			title: `Unit ${i + 1}`,
			objective: 'general practice'
		}));
		const weakReading = [
			{ skill: 'reading' as const, estimatedLevel: 'A1' as const, updatedAt: 0 }
		];

		it('skips completed units and suggests the first one still open', () => {
			const states = new Map<string, 'locked' | 'available' | 'completed'>([
				...[1, 2, 3, 4, 5].map((n) => [`a1-unit-0${n}`, 'completed'] as const),
				['a1-unit-06', 'available']
			]);
			const suggestion = suggestUnitForWeakSkill(manyUnits, weakReading, states);
			expect(suggestion?.unit.id).toBe('a1-unit-06');
		});

		it('returns null when every unlocked unit is completed', () => {
			const states = new Map<string, 'locked' | 'available' | 'completed'>([
				['a1-unit-01', 'completed'],
				['a1-unit-02', 'completed']
			]);
			expect(suggestUnitForWeakSkill(manyUnits, weakReading, states)).toBeNull();
		});

		it('never returns a completed unit even when its objective matches the weak skill', () => {
			const matching: UnitSummary[] = [
				{ ...manyUnits[0]!, objective: 'reading basics' },
				manyUnits[1]!
			];
			const states = new Map<string, 'locked' | 'available' | 'completed'>([
				['a1-unit-01', 'completed'],
				['a1-unit-02', 'available']
			]);
			expect(suggestUnitForWeakSkill(matching, weakReading, states)?.unit.id).toBe('a1-unit-02');
		});
	});

	it('matches "speaking" objectives for a spoken skill', () => {
		const spoken: UnitSummary[] = [
			{ ...units[0]!, objective: 'reading basics' },
			{ ...units[1]!, objective: 'Speaking about yourself' }
		];
		const states = new Map([
			['a1-unit-01', 'available' as const],
			['a1-unit-02', 'available' as const]
		]);
		const suggestion = suggestUnitForWeakSkill(
			spoken,
			[{ skill: 'spokenInteraction', estimatedLevel: 'A1', updatedAt: 0 }],
			states
		);
		expect(suggestion?.unit.id).toBe('a1-unit-02');
		expect(suggestion?.skill).toBe('spokenInteraction');
	});
});
