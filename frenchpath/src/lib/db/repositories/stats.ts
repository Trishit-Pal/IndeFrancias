import { getDB } from '../db';
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

/** Adds the given deltas onto a day's stats (creating the day if needed). */
export async function addStats(
	date: string,
	delta: Partial<Omit<DailyStats, 'date'>>
): Promise<DailyStats> {
	const db = await getDB();
	const tx = db.transaction('stats', 'readwrite');
	const current = (await tx.store.get(date)) ?? emptyStats(date);
	const next: DailyStats = {
		date,
		xp: current.xp + (delta.xp ?? 0),
		minutes: current.minutes + (delta.minutes ?? 0),
		lessonsCompleted: current.lessonsCompleted + (delta.lessonsCompleted ?? 0),
		reviewsDone: current.reviewsDone + (delta.reviewsDone ?? 0)
	};
	await tx.store.put(next);
	await tx.done;
	return next;
}
