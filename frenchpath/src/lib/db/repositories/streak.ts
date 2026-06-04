import { getDB } from '../db';
import { STREAK_KEY, type StreakRecord } from '../schema';

export const INITIAL_STREAK: Readonly<StreakRecord> = {
	id: STREAK_KEY,
	currentStreak: 0,
	longestStreak: 0,
	lastActiveDate: '',
	freezesAvailable: 3,
	freezesUsed: 0
};

/** Current streak record, or a fresh initial one if none stored yet. */
export async function getStreak(): Promise<StreakRecord> {
	const stored = await (await getDB()).get('streak', STREAK_KEY);
	return stored ?? { ...INITIAL_STREAK };
}

export async function putStreak(record: StreakRecord): Promise<void> {
	await (await getDB()).put('streak', record);
}
