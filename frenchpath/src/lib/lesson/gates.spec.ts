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
		expect(dalfC1Unlocked(new Set(['milestone:B2']))).toBe(true);
		expect(dalfC1Unlocked(new Set(['milestone:B1']))).toBe(false);
	});
});
