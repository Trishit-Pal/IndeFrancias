import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		// Reuse a preview server already running locally (CI always starts fresh).
		reuseExistingServer: !process.env.CI,
		timeout: 180_000
	},
	testMatch: '**/*.e2e.{ts,js}'
});
