// Native (Capacitor) local notification for revision reminders. Requests
// permission on first use; schedules a near-immediate local notification
// (the native analogue of the web Notification used on the layout).

// Fixed id so a new reminder REPLACES the pending one — mirroring the web
// path's stable `tag: 'frenchpath-revision'` de-dupe (avoids stacking).
const REVISION_NOTIFICATION_ID = 1;
const SCHEDULE_DELAY_MS = 1500;

export async function showRevisionNotification(title: string, body: string): Promise<void> {
	try {
		const { LocalNotifications } = await import('@capacitor/local-notifications');
		let perm = await LocalNotifications.checkPermissions();
		if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
		if (perm.display !== 'granted') return;
		await LocalNotifications.schedule({
			notifications: [
				{
					id: REVISION_NOTIFICATION_ID,
					title,
					body,
					schedule: { at: new Date(Date.now() + SCHEDULE_DELAY_MS) }
				}
			]
		});
	} catch {
		// Notifications unavailable — ignore (matches the web's silent no-op).
	}
}
