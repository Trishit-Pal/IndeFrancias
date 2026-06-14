import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson, completeCheckpoint } from './helpers';

test('checkpoint appears after 3 units and blocks unit 4 until passed', async ({ page }) => {
	await gotoHome(page);
	for (const unitId of ['a1-unit-01', 'a1-unit-02', 'a1-unit-03']) {
		await page.locator(`a[href*="/learn/${unitId}"]`).first().click();
		await page.getByTestId('start-lesson').click();
		await completeLesson(page);
		await page.getByRole('link', { name: /Back to path|रास्ते|Home/i }).click();
	}

	await expect(page.getByTestId('checkpoint-node-g1')).toBeVisible();
	await expect(page.locator('a[href*="a1-unit-04"]')).toHaveCount(0);
	await expect(page.getByTestId('gate-banner')).toContainText(/Checkpoint 1 \(A1 Units 1–3\)/);
});

test('passing checkpoint g1 unlocks unit 4', async ({ page }) => {
	test.setTimeout(120_000);
	await gotoHome(page);
	for (const unitId of ['a1-unit-01', 'a1-unit-02', 'a1-unit-03']) {
		await page.locator(`a[href*="/learn/${unitId}"]`).first().click();
		await page.getByTestId('start-lesson').click();
		await completeLesson(page);
		await page.getByRole('link', { name: /Back to path|रास्ते|Home/i }).click();
	}

	await page.getByTestId('checkpoint-node-g1').click();
	await completeCheckpoint(page);
	await expect(page.getByText('Checkpoint passed')).toBeVisible();

	await page.getByRole('link', { name: /Back to path/i }).click();
	const unit4Link = page.locator('a[href*="a1-unit-04"]').first();
	await expect(unit4Link).toBeVisible({ timeout: 10_000 });
});
