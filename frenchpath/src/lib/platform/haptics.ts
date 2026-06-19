// Native (Capacitor) haptic feedback — the reliable cross-platform replacement
// for `navigator.vibrate` (which iOS WebViews ignore).

export async function tapHaptic(): Promise<void> {
	try {
		const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
		await Haptics.impact({ style: ImpactStyle.Light });
	} catch {
		// Haptics unavailable — ignore.
	}
}
