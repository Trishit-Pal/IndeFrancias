import type { Settings } from '$lib/db/schema';

// Per-device convenience (not learner data), so it lives outside IndexedDB and backups.
const LAST_NOTIFIED_KEY = 'frenchpath:lastRevisionNotifiedDay';

/** Whether a revision reminder should fire: at most one per local calendar day. */
export function shouldNotify(
	dueCount: number,
	settings: Settings,
	lastNotifiedDay: string | null,
	today: string
): boolean {
	return (settings.revisionNotifications ?? false) && dueCount > 0 && lastNotifiedDay !== today;
}

export function readLastNotifiedDay(): string | null {
	try {
		return localStorage.getItem(LAST_NOTIFIED_KEY);
	} catch {
		return null; // private mode can throw; worst case is one extra reminder
	}
}

export function writeLastNotifiedDay(day: string): void {
	try {
		localStorage.setItem(LAST_NOTIFIED_KEY, day);
	} catch {
		// ponytail: unwritable storage means the once-a-day cap degrades to once per visibility change
	}
}

export function revisionNotificationBody(dueCount: number): string {
	return `${dueCount} card${dueCount === 1 ? '' : 's'} ready for review.`;
}
