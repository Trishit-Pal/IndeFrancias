// Native (Capacitor) local notification for revision reminders. Requests
// permission on first use; schedules a near-immediate local notification
// (the native analogue of the web Notification used on the layout).

export async function showRevisionNotification(title: string, body: string): Promise<void> {
	try {
		const { LocalNotifications } = await import('@capacitor/local-notifications');
		let perm = await LocalNotifications.checkPermissions();
		if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
		if (perm.display !== 'granted') return;
		await LocalNotifications.schedule({
			notifications: [
				{
					id: Math.floor(Date.now() % 100000),
					title,
					body,
					schedule: { at: new Date(Date.now() + 1500) }
				}
			]
		});
	} catch {
		// Notifications unavailable — ignore (matches the web's silent no-op).
	}
}
