// Thin wrapper over ts-fsrs (FSRS-6) that converts between our stored SrsCard
// and ts-fsrs's Card, and exposes a small grade API for the review UI.
import {
	createEmptyCard,
	fsrs,
	generatorParameters,
	Rating,
	State,
	FSRSVersion,
	type Card as FsrsCard,
	type Grade,
	type ReviewLog
} from 'ts-fsrs';
import type { CefrLevel, Skill, SrsCard } from '../db/schema';

export const FSRS_VERSION = FSRSVersion;

/** Four-button grading, mapped to ts-fsrs ratings. */
export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

const GRADE_TO_RATING: Record<ReviewGrade, Grade> = {
	again: Rating.Again,
	hard: Rating.Hard,
	good: Rating.Good,
	easy: Rating.Easy
};

/** Builds an FSRS scheduler; custom on-device-optimized weights when present. */
export function getScheduler(targetRetention = 0.9, weights?: number[] | null) {
	const params =
		weights && weights.length > 0
			? generatorParameters({ request_retention: targetRetention, w: weights })
			: generatorParameters({ request_retention: targetRetention });
	return fsrs(params);
}

function toFsrsCard(card: SrsCard): FsrsCard {
	return {
		due: card.due,
		stability: card.stability,
		difficulty: card.difficulty,
		elapsed_days: card.elapsed_days,
		scheduled_days: card.scheduled_days,
		learning_steps: card.learning_steps,
		reps: card.reps,
		lapses: card.lapses,
		state: card.state as State,
		last_review: card.last_review
	};
}

/** The FSRS scheduler fields, lifted out of a ts-fsrs Card. */
function extractFsrsState(c: FsrsCard) {
	return {
		due: c.due,
		stability: c.stability,
		difficulty: c.difficulty,
		elapsed_days: c.elapsed_days,
		scheduled_days: c.scheduled_days,
		learning_steps: c.learning_steps,
		reps: c.reps,
		lapses: c.lapses,
		state: c.state as number,
		last_review: c.last_review
	};
}

export interface NewCardParams {
	cardId: string;
	contentId: string;
	cefrLevel: CefrLevel;
	skill: Skill;
	now?: Date;
}

/** Creates a fresh card (state New, due now) for a content item. */
export function createSrsCard(params: NewCardParams): SrsCard {
	const empty = createEmptyCard(params.now ?? new Date());
	return {
		cardId: params.cardId,
		contentId: params.contentId,
		cefrLevel: params.cefrLevel,
		skill: params.skill,
		...extractFsrsState(empty),
		schedulerVersion: FSRS_VERSION
	};
}

export interface GradeResult {
	card: SrsCard;
	log: ReviewLog;
}

/** Applies a grade, returning the rescheduled card and the review log entry. */
export function gradeCard(
	card: SrsCard,
	grade: ReviewGrade,
	opts: { now?: Date; targetRetention?: number; weights?: number[] | null } = {}
): GradeResult {
	const now = opts.now ?? new Date();
	const scheduler = getScheduler(opts.targetRetention, opts.weights);
	const { card: nextCard, log } = scheduler.next(toFsrsCard(card), now, GRADE_TO_RATING[grade]);
	return {
		card: {
			...card,
			...extractFsrsState(nextCard),
			lastGrade: GRADE_TO_RATING[grade],
			schedulerVersion: FSRS_VERSION
		},
		log
	};
}

/** Estimated current recall probability (0–1) for display. */
export function retrievability(card: SrsCard, now: Date = new Date()): number {
	return getScheduler().get_retrievability(toFsrsCard(card), now, false);
}
