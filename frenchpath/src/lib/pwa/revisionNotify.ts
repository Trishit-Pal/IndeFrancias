import type { Settings } from '$lib/db/schema';

/** Whether a revision reminder notification should fire. */
export function shouldNotify(dueCount: number, settings: Settings): boolean {
	return settings.revisionNotifications && dueCount > 0;
}

export function revisionNotificationBody(dueCount: number): string {
	return `${dueCount} card${dueCount === 1 ? '' : 's'} ready for review.`;
}
