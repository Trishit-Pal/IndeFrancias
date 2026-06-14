export type CelebrationEvent =
	| 'lesson_complete'
	| 'checkpoint_pass'
	| 'milestone_a1'
	| 'milestone_a2'
	| 'milestone_b1'
	| 'milestone_b2'
	| 'milestone_c1'
	| 'delf_pass'
	| 'streak_7'
	| 'streak_30';

export interface CelebrationRequest {
	event: CelebrationEvent;
	title: string;
	subtitle?: string;
}

const CLIP_BY_EVENT: Record<CelebrationEvent, string> = {
	lesson_complete: 'cheer',
	checkpoint_pass: 'wave',
	milestone_a1: 'dance',
	milestone_a2: 'dance',
	milestone_b1: 'dance',
	milestone_b2: 'dance',
	milestone_c1: 'dance',
	delf_pass: 'dance',
	streak_7: 'wave',
	streak_30: 'dance'
};

export function clipForEvent(event: CelebrationEvent): string {
	return CLIP_BY_EVENT[event];
}

export function shouldUseFullCelebration(
	celebrationLevel: 'full' | 'minimal',
	reduceMotion: boolean,
	webglOk: boolean
): boolean {
	return celebrationLevel === 'full' && !reduceMotion && webglOk;
}

export function canUseWebGL(): boolean {
	if (typeof document === 'undefined') return false;
	try {
		const canvas = document.createElement('canvas');
		return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
	} catch {
		return false;
	}
}
