// Types for a mock DELF exam (4 skills, each scored out of 25).
import type { Exercise } from '../content/schema';

export type ExamSkill = 'listening' | 'reading' | 'writing' | 'speaking';

/** Auto-graded section (listening / reading) built from objective exercises. */
export interface ObjectiveSection {
	skill: 'listening' | 'reading';
	title: string;
	instructions: string;
	items: Exercise[];
}

/** Productive section (writing / speaking): a prompt + model answer + self-rating. */
export interface ProductiveSection {
	skill: 'writing' | 'speaking';
	title: string;
	instructions: string;
	prompt: string;
	modelAnswer: string;
	/** Checklist the learner uses to self-assess. */
	rubric: string[];
}

export type ExamSection = ObjectiveSection | ProductiveSection;

export interface MockExam {
	id: string;
	title: string;
	level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
	sections: ExamSection[];
}
