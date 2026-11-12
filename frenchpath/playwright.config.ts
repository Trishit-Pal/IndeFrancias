import { defineConfig, devices } from '@playwright/test';

// PORT lets two checkouts run e2e side by side (default matches `vite preview`).
const port = Number(process.env.PORT ?? 4173);

export default defineConfig({
	webServer: {
		command: `npm run build && npm run preview -- --port ${port}`,
		port,
		// Reuse a preview server already running locally (CI always starts fresh).
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		// Build-time flag: enables the test-only ASR stub (src/lib/speech/asr.ts) in this build only.
		env: { VITE_E2E: '1' }
	},
	testMatch: '**/*.e2e.{ts,js}',
	use: {
		launchOptions: {
			// Let getUserMedia() succeed headlessly (no real mic in CI/automated runs).
			args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
		}
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{
			// Pixel-class viewport + touch. Curated to the specs that assert mobile
			// layout or a11y; widen testMatch once CI time is measured.
			name: 'mobile',
			use: { ...devices['Pixel 7'] },
			testMatch: ['**/accessibility.e2e.ts', '**/mobile.e2e.ts', '**/i18n-locales.e2e.ts']
		}
	]
});
