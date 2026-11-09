import { getDB, writeAtomically, type WritableStore } from '../db';
import type { DailyStats } from '../schema';

export function emptyStats(date: string): DailyStats {
	return { date, xp: 0, minutes: 0, lessonsCompleted: 0, reviewsDone: 0 };
}

export async function getStats(date: string): Promise<DailyStats> {
	return (await (await getDB()).get('stats', date)) ?? emptyStats(date);
}

export async function getAllStats(): Promise<DailyStats[]> {
	return (await getDB()).getAll('stats');
}

export type StatsDelta = Partial<Omit<DailyStats, 'date'>>;

/** Adds the given deltas onto a day's stats (creating the day if needed). */
export function addStats(date: string, delta: StatsDelta): Promise<DailyStats> {
	return writeAtomically(['stats'], (tx) => addStatsInTx(tx.objectStore('stats'), date, delta));
}

/** {@link addStats} inside a caller's transaction, so it commits with the caller's other writes. */
export async function addStatsInTx(
	store: WritableStore<'stats'>,
	date: string,
	delta: StatsDelta
): Promise<DailyStats> {
	const current = (await store.get(date)) ?? emptyStats(date);
	const next: DailyStats = {
		date,
		xp: current.xp + (delta.xp ?? 0),
		minutes: current.minutes + (delta.minutes ?? 0),
		lessonsCompleted: current.lessonsCompleted + (delta.lessonsCompleted ?? 0),
		reviewsDone: current.reviewsDone + (delta.reviewsDone ?? 0)
	};
	await store.put(next);
	return next;
}
