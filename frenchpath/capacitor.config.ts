import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the built SvelteKit PWA (build/) into the Android/iOS shell.
// Run `npm run build:cap` (build + copy 200.html→index.html) before `npx cap sync`.
// See docs/product/mobile-architecture.md.
const config: CapacitorConfig = {
	appId: 'app.frenchpath',
	appName: 'FrenchPath',
	webDir: 'build',
	backgroundColor: '#E5DACF', // Grand Voyage canvas
	android: {
		backgroundColor: '#E5DACF'
	},
	ios: {
		backgroundColor: '#E5DACF',
		// App is fully on-device; default WKWebView is fine.
		contentInset: 'always'
	},
	plugins: {
		SplashScreen: {
			launchShowDuration: 800,
			backgroundColor: '#E5DACF',
			showSpinner: false
		}
	}
};

export default config;
