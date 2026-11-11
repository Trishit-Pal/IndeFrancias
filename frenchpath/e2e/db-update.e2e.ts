import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

// A tab still running old code next to one that already upgraded the database. The "newer tab" is
// played from the page itself: the app's own connection steps aside (its `blocking` handler), then
// the next database use fails with a VersionError, which must say "reload", not fail silently.
test('a database newer than the app asks for a reload, and the button reloads', async ({
	page
}) => {
	await gotoHome(page);

	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const req = indexedDB.open('frenchpath', 99);
				req.onerror = () => reject(req.error);
				req.onsuccess = () => {
					req.result.close();
					resolve();
				};
			})
	);

	// Client-side navigation to a page that reads the database.
	await page.getByRole('link', { name: 'Settings' }).first().click();

	const banner = page.getByTestId('db-update-banner');
	await expect(banner).toBeVisible();
	await expect(banner).toContainText('FrenchPath was updated in another tab');
	await expect(banner).toHaveAttribute('role', 'alert');
	const reload = page.getByTestId('db-update-reload');
	await expect(reload).toBeVisible();
	expect((await reload.boundingBox())?.height).toBeGreaterThanOrEqual(44);

	// The generic banner is not shown for the same failure, and nothing reloads by itself.
	await page.waitForTimeout(500); // an unhandled rejection arrives a tick after the failure
	await expect(page.getByText('Something went wrong. Your saved progress is safe.')).toHaveCount(0);
	await expect(banner).toBeVisible();

	await Promise.all([page.waitForEvent('load'), reload.click()]);
});
