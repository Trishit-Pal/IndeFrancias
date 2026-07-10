import { describe, it, expect } from 'vitest';
import {
	CHECKPOINT_GATES,
	assessmentIdForGate,
	availableGates,
	computeUnitStatesWithGates,
	delfUnlocked,
	delfB1Unlocked,
	delfB2Unlocked,
	dalfC1Unlocked,
	buildLockReasonMap,
	lockReasonForUnit
} from './gates';
import type { UnitSummary } from '../content/schema';
import type { ProgressRecord } from '../db/schema';

const summaries: UnitSummary[] = Array.from({ length: 10 }, (_, i) => ({
	id: `a1-unit-${String(i + 1).padStart(2, '0')}`,
	cefrLevel: 'A1' as const,
	order: i + 1,
	title: `Unit ${i + 1}`,
	objective: 'o'
}));

function completed(...ids: string[]): Record<string, ProgressRecord> {
	return Object.fromEntries(
		ids.map((id) => [
			id,
			{
				lessonId: id,
				status: 'completed' as const,
				score: 100,
				attempts: 1,
				lastVisited: 0,
				cefrLevel: 'A1' as const
			}
		])
	);
}

describe('checkpoint gates', () => {
	it('maps gate ids to assessment ids', () => {
		expect(assessmentIdForGate('g1')).toBe('checkpoint:g1');
		expect(assessmentIdForGate('mA1')).toBe('milestone:A1');
	});

	it('blocks unit 4 until checkpoint g1 passed', () => {
		const progress = completed('a1-unit-01', 'a1-unit-02', 'a1-unit-03');
		const states = computeUnitStatesWithGates(summaries, progress, new Set());
		expect(states.get('a1-unit-04')).toBe('locked');
	});

	it('unlocks unit 4 after g1 passed', () => {
		const progress = completed('a1-unit-01', 'a1-unit-02', 'a1-unit-03');
		const passed = new Set(['checkpoint:g1']);
		const states = computeUnitStatesWithGates(summaries, progress, passed);
		expect(states.get('a1-unit-04')).toBe('available');
	});

	it('lists available gates when prereq units complete', () => {
		const progress = completed('a1-unit-01', 'a1-unit-02', 'a1-unit-03');
		const gates = availableGates(progress, new Set());
		expect(gates.some((g) => g.id === 'g1')).toBe(true);
	});

	it('requires A2 milestone for DELF unlock', () => {
		expect(delfUnlocked(new Set())).toBe(false);
		expect(delfUnlocked(new Set(['milestone:A2']))).toBe(true);
	});

	it('explains lock reason after checkpoint', () => {
		const progress = completed('a1-unit-01', 'a1-unit-02', 'a1-unit-03');
		const reason = lockReasonForUnit('a1-unit-04', summaries, progress, new Set());
		expect(reason).toMatch(/Checkpoint 1/);
	});

	it('defines gates every 3 A1 units plus milestones', () => {
		const checkpointIds = CHECKPOINT_GATES.filter((g) => g.kind === 'checkpoint').map((g) => g.id);
		expect(checkpointIds).toContain('g1');
		expect(checkpointIds).toContain('g3');
		expect(CHECKPOINT_GATES.some((g) => g.id === 'mA1')).toBe(true);
	});

	it('surfaces the A2 milestone (not the already-passed checkpoint) as the lock reason', () => {
		// g16 and mA2 share afterUnitId 'a2-unit-12'. Once g16 is passed but the A2
		// milestone is not, the next unit must still explain *why* it is locked.
		const a2Summaries: UnitSummary[] = [
			...Array.from({ length: 12 }, (_, i) => ({
				id: `a2-unit-${String(i + 1).padStart(2, '0')}`,
				cefrLevel: 'A2' as const,
				order: i + 1,
				title: `A2 Unit ${i + 1}`,
				objective: 'o'
			})),
			{ id: 'b1-unit-01', cefrLevel: 'B1' as const, order: 1, title: 'B1 Unit 1', objective: 'o' }
		];
		const progress = completed(...a2Summaries.slice(0, 12).map((u) => u.id));
		const passed = new Set(['checkpoint:g16']);
		const reason = lockReasonForUnit('b1-unit-01', a2Summaries, progress, passed);
		expect(reason).toMatch(/A2 Milestone/);
	});

	it('gates A1 units 10–12 behind checkpoint g15 before the A1 milestone', () => {
		// g15 (units 10–12) and mA1 both sit after a1-unit-12, g15 first in array.
		const a1Summaries: UnitSummary[] = [
			...Array.from({ length: 12 }, (_, i) => ({
				id: `a1-unit-${String(i + 1).padStart(2, '0')}`,
				cefrLevel: 'A1' as const,
				order: i + 1,
				title: `A1 Unit ${i + 1}`,
				objective: 'o'
			})),
			{ id: 'a2-unit-01', cefrLevel: 'A2' as const, order: 1, title: 'A2 Unit 1', objective: 'o' }
		];
		const progress = completed(...a1Summaries.slice(0, 12).map((u) => u.id));
		// Nothing passed yet: the first pending gate after unit-12 is g15.
		expect(lockReasonForUnit('a2-unit-01', a1Summaries, progress, new Set())).toMatch(
			/Checkpoint 15/
		);
		// g15 passed but not the milestone: now the A1 milestone is the blocker.
		const reason = lockReasonForUnit(
			'a2-unit-01',
			a1Summaries,
			progress,
			new Set(['checkpoint:g15'])
		);
		expect(reason).toMatch(/A1 Milestone/);
	});

	it('buildLockReasonMap matches lockReasonForUnit for each unit', () => {
		const progress = completed('a1-unit-01', 'a1-unit-02', 'a1-unit-03');
		const passed = new Set<string>();
		const map = buildLockReasonMap(summaries, progress, passed);
		for (const unit of summaries) {
			expect(map.get(unit.id)).toBe(lockReasonForUnit(unit.id, summaries, progress, passed));
		}
	});

	it('requires B1 milestone for DELF B1 mock unlock', () => {
		expect(delfB1Unlocked(new Set())).toBe(false);
		expect(delfB1Unlocked(new Set(['milestone:B1']))).toBe(true);
		expect(delfB2Unlocked(new Set(['milestone:B1']))).toBe(false);
		expect(delfB2Unlocked(new Set(['milestone:B2']))).toBe(true);
		expect(dalfC1Unlocked(new Set(['milestone:C1']))).toBe(true);
		expect(dalfC1Unlocked(new Set(['milestone:B2']))).toBe(false);
	});
});
