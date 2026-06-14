import { describe, it, expect } from 'vitest';
import { clipForEvent } from './orchestrator';

describe('celebration orchestrator', () => {
	it('maps lesson complete to cheer clip', () => {
		expect(clipForEvent('lesson_complete')).toBe('cheer');
	});

	it('maps checkpoint pass to wave', () => {
		expect(clipForEvent('checkpoint_pass')).toBe('wave');
	});

	it('maps milestone to dance', () => {
		expect(clipForEvent('milestone_a1')).toBe('dance');
	});
});
