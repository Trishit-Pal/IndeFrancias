import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson } from './helpers';

test('fresh learner sees empty review state', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/review');
	await expect(page.getByTestId('no-reviews')).toBeVisible();
});

test('due badge reflects cards after lesson completion', async ({ page }) => {
	await gotoHome(page);
	await expect(page.getByTestId('due-badge')).toHaveCount(0);

	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.getByRole('link', { name: 'Back to path' }).click();

	await expect(page.getByTestId('due-badge')).toBeVisible();
});
