import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// `vite preview` server-renders an unknown path as a 404 through +error.svelte. Static hosts
// (Vercel, Capacitor) instead answer with the 200.html SPA shell and the client router renders
// the same page, so the second half replays that by serving the built shell for an unknown path.
test('an unknown route renders the error page with a way home', async ({ page }) => {
	await page.goto('/does-not-exist');

	const errorPage = page.getByTestId('error-page');
	await expect(errorPage.getByRole('heading', { name: 'Page not found' })).toBeVisible();
	await expect(errorPage.getByRole('button', { name: 'Reload' })).toBeVisible();

	await errorPage.getByRole('link', { name: 'Back to home' }).click();
	await expect(page).toHaveURL('/');

	const shell = readFileSync('build/200.html', 'utf8');
	await page.route('**/static-fallback', (route) =>
		route.fulfill({ status: 200, contentType: 'text/html', body: shell })
	);
	await page.goto('/static-fallback');
	await expect(errorPage.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
