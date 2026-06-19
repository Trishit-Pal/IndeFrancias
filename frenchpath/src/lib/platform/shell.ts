// Native (Capacitor) shell setup: hide the splash once booted, theme the status
// bar for the cream UI, and wire the Android hardware back button to SvelteKit's
// history. Called once from the root layout when running natively.

export async function initNativeShell(): Promise<void> {
	try {
		const { SplashScreen } = await import('@capacitor/splash-screen');
		await SplashScreen.hide();
	} catch {
		/* no splash plugin — ignore */
	}
	try {
		const { StatusBar, Style } = await import('@capacitor/status-bar');
		// Light style = dark icons, for the light cream "Grand Voyage" surface.
		await StatusBar.setStyle({ style: Style.Light });
	} catch {
		/* no status-bar plugin — ignore */
	}
	try {
		const { App } = await import('@capacitor/app');
		await App.addListener('backButton', ({ canGoBack }) => {
			if (canGoBack) history.back();
			else void App.exitApp();
		});
	} catch {
		/* no app plugin — ignore */
	}
}
