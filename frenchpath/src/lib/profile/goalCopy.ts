import type { LearningGoal } from './types';

const GOAL_SUBTITLES: Record<LearningGoal, string> = {
	travel: 'Build practical French for trips and everyday conversations.',
	delf_a2: 'Structured path toward DELF A2 certification.',
	delf_b2: 'Advanced track toward DELF B2 proficiency.',
	work: 'Professional French for meetings, email, and interviews.',
	heritage: 'Reconnect with French culture and family heritage.',
	general: 'French for Indian learners · A1 → C1'
};

export function homeSubtitleForGoal(goal: LearningGoal, examDate: string | null): string {
	if (goal === 'delf_a2' && examDate) {
		const days = Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000));
		if (days > 0) return `DELF A2 prep · ${days} days to your target date`;
	}
	return GOAL_SUBTITLES[goal];
}

export const LEARNING_GOAL_LABELS: Record<LearningGoal, string> = {
	travel: 'Travel & conversation',
	delf_a2: 'DELF A2 exam',
	delf_b2: 'DELF B2 exam',
	work: 'Work & career',
	heritage: 'Heritage & culture',
	general: 'General learning'
};
