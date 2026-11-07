// Native (Capacitor) shell setup: hide the splash once booted, theme the status
// bar to match the resolved light/dark theme, and wire the Android hardware back
// button to SvelteKit's history. Called once from the root layout when running
// natively; `syncNativeStatusBar` is re-run on every theme change.

// Mirrors --fp-canvas in src/lib/theme/tokens.css (status bar sits on the canvas).
const CANVAS_LIGHT = '#faf7f0';
const CANVAS_DARK = '#16142b';

/** Status-bar icons and (Android) background follow the active theme. */
export async function syncNativeStatusBar(dark: boolean): Promise<void> {
	try {
		const { StatusBar, Style } = await import('@capacitor/status-bar');
		// Capacitor's Style.Light = light bar with dark icons; Style.Dark = the inverse.
		await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
		// Android only; iOS draws the bar over the WebView and ignores this.
		await StatusBar.setBackgroundColor({ color: dark ? CANVAS_DARK : CANVAS_LIGHT }).catch(
			() => {}
		);
	} catch {
		/* no status-bar plugin — ignore */
	}
}

export async function initNativeShell(): Promise<void> {
	try {
		const { SplashScreen } = await import('@capacitor/splash-screen');
		await SplashScreen.hide();
	} catch {
		/* no splash plugin — ignore */
	}
	await syncNativeStatusBar(document.documentElement.classList.contains('dark'));
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
