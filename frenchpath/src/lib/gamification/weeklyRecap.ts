import { lastNDayKeys } from '$lib/utils/date';
import type { DailyStats, ReviewLogRecord } from '$lib/db/schema';

export interface WeeklyRecap {
	reviews: number;
	/** 0-100: share of reviews graded above Again (Hard/Good/Easy). */
	accuracy: number;
	wordsRecalled: number;
	xp: number;
	lessons: number;
	streak: number;
	unitsDone: number;
	unitsTotal: number;
}

export function buildWeeklyRecap(input: {
	logs: readonly ReviewLogRecord[];
	stats: readonly DailyStats[];
	streak: number;
	unitsDone: number;
	unitsTotal: number;
}): WeeklyRecap {
	const { logs, stats } = input;
	const recalled = new Set(logs.filter((l) => l.grade > 1).map((l) => l.cardId));
	const correct = logs.filter((l) => l.grade > 1).length;
	return {
		reviews: logs.length,
		accuracy: logs.length ? Math.round((correct / logs.length) * 100) : 0,
		wordsRecalled: recalled.size,
		xp: stats.reduce((s, d) => s + (d.xp ?? 0), 0),
		lessons: stats.reduce((s, d) => s + (d.lessonsCompleted ?? 0), 0),
		streak: input.streak,
		unitsDone: input.unitsDone,
		unitsTotal: input.unitsTotal
	};
}

/** Epoch ms of local midnight on the first day of `lastNDayKeys(7)`, so logs and daily stats share one window. */
export function weekStartMs(now: Date = new Date()): number {
	return new Date(`${lastNDayKeys(7, now)[0]}T00:00:00`).getTime();
}
