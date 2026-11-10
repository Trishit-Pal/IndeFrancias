import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

// With the service worker in control, every navigation it answers gets the precached
// navigateFallback. That must be the SPA shell, not the prerendered Home page, or a
// reload / cold PWA resume / offline deep link on a lesson lands on Home.
test('reloading a lesson URL under the service worker renders the lesson, online and offline', async ({
	page,
	context
}) => {
	await gotoHome(page);
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();
	expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

	await page.goto('/learn/a1-unit-01');
	await expect(page.getByTestId('start-lesson')).toBeVisible();

	await page.reload();
	await expect(page).toHaveURL(/\/learn\/a1-unit-01$/);
	await expect(page.getByTestId('start-lesson')).toBeVisible();

	await context.setOffline(true);
	await page.reload();
	await expect(page.getByTestId('start-lesson')).toBeVisible();
	await expect(page.getByTestId('offline-banner')).toBeVisible();
	await context.setOffline(false);
});
