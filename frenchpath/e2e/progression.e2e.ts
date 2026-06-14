import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson } from './helpers';

test('direct URL to locked unit shows blocked screen', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/learn/a2-unit-01');
	await expect(page.getByTestId('locked')).toBeVisible();
	await expect(page.getByTestId('start-lesson')).toHaveCount(0);
});

test('completing unit 1 unlocks unit 2 on the path map', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();
	await page.reload();

	await expect(page.getByTestId('unit-card').first()).toContainText('✓');
	await expect(page.locator('a[href*="/learn/a1-unit-02"]')).toBeVisible();
});

test('DELF card is hidden before any A2 unit is completed', async ({ page }) => {
	await gotoHome(page);
	await expect(page.getByTestId('delf-card')).toHaveCount(0);
});
