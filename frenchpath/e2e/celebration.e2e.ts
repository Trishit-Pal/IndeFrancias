import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson } from './helpers';

test('lesson summary shows XP and optional celebration skip', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await expect(page.getByTestId('summary')).toBeVisible();
	await expect(page.getByTestId('xp-awarded')).toBeVisible();
	const skip = page.getByTestId('celebration-skip');
	if (await skip.count()) {
		await skip.click();
	}
});
