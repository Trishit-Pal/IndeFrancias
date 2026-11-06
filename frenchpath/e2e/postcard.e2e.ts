import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson, reviewUntilDone } from './helpers';

test('weekly postcard shows reviews and shares via download fallback', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.goto('/review');
	await reviewUntilDone(page);

	await page.goto('/progress');
	const card = page.getByTestId('weekly-postcard');
	await expect(card).toBeVisible();
	await expect(card).not.toContainText(/fresh week/i);
	// Chromium headless has no navigator.share on desktop: falls back to PNG download.
	const download = page.waitForEvent('download');
	await page.getByTestId('share-postcard').click();
	expect((await download).suggestedFilename()).toBe('frenchpath-week.png');
});
