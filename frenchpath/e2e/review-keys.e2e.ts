import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson } from './helpers';

// A number key answers a 4-choice review card, the feedback says when the card
// comes back, and End session stops early with an honest count.
test('number key answers a card; End session reports one card reviewed', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.goto('/review');

	const choices = page.getByTestId('context-choice');
	await expect(page.getByTestId('context-card').or(page.getByTestId('reveal')).first()).toBeVisible(
		{ timeout: 15_000 }
	);
	test.skip(
		!(await choices
			.first()
			.isVisible()
			.catch(() => false)),
		'the first due card is not a 4-choice card'
	);

	// Nothing graded yet, so there is no session to end.
	await expect(page.getByTestId('review-end')).toHaveCount(0);

	await page.keyboard.press('2');
	await expect(choices.nth(1)).toBeDisabled();
	await expect(page.getByTestId('context-next-in')).toContainText(/\d/);
	await page.getByTestId('continue').click();

	const end = page.getByTestId('review-end');
	await expect(end).toBeVisible();

	// Answer the next card but end the session instead of pressing Continue: the card
	// has already said when it comes back, so it must be saved and counted.
	let expected = 1;
	const nextChoice = page.locator('[data-testid="context-choice"]:enabled').first();
	if (await nextChoice.isVisible().catch(() => false)) {
		await page.keyboard.press('1');
		await expect(page.getByTestId('context-next-in')).toBeVisible();
		expected = 2;
	}
	await end.click();
	await expect(page.getByTestId('review-done')).toBeVisible();
	await expect(page.getByTestId('review-summary-cards')).toHaveText(
		new RegExp(`\\b${expected}\\b`)
	);
});

test('a digit typed into the recall box is text, not a shortcut', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);
	await page.goto('/review?mode=type');

	const recall = page.getByTestId('recall-input');
	await expect(recall).toBeVisible({ timeout: 15_000 });
	await recall.pressSequentially('12');
	await expect(recall).toHaveValue('12');
	// an answered card disables its input; still enabled means nothing was submitted
	await expect(recall).toBeEnabled();
});
