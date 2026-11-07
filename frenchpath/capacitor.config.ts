import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the built SvelteKit PWA (build/) into the Android/iOS shell.
// Run `npm run build:cap` (build + copy 200.html→index.html) before `npx cap sync`.
// See docs/product/mobile-architecture.md.
const config: CapacitorConfig = {
	appId: 'app.frenchpath',
	appName: 'FrenchPath',
	webDir: 'build',
	backgroundColor: '#faf7f0', // --fp-canvas (light); the WebView repaints for dark once the app boots
	android: {
		backgroundColor: '#faf7f0'
	},
	ios: {
		backgroundColor: '#faf7f0',
		// App is fully on-device; default WKWebView is fine.
		contentInset: 'always'
	},
	plugins: {
		SplashScreen: {
			launchShowDuration: 800,
			backgroundColor: '#faf7f0',
			showSpinner: false
		}
	}
};

export default config;
