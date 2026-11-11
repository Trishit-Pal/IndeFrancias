import { test, expect } from '@playwright/test';

const EXAM_MS = 45 * 60 * 1000;

test('a mock exam that times out scores the section in progress', async ({ page }) => {
	await page.clock.install();
	await page.goto('/exam/delf-a2');
	await page.getByTestId('start-exam').click();

	// Listening has two dictation items: answer the first correctly, leave the second unanswered.
	await page.getByTestId('dictation-play').click();
	await page.getByTestId('text-answer').fill('Hier, Priya a visité un temple à Jaipur.');
	await page.getByTestId('exam-check').click();
	await page.getByTestId('exam-continue').click();
	await expect(page.getByTestId('exam-result')).toBeHidden();

	await page.clock.runFor(EXAM_MS + 5_000);

	const result = page.getByTestId('exam-result');
	await expect(result).toBeVisible();
	const listening = result.locator('[data-testid="exam-skill-score"][data-skill="listening"]');
	// 1 of 2 correct, the unanswered item counts as wrong: round(1/2 * 25) = 13.
	await expect(listening).toContainText('13 / 25');
	await expect(
		result.locator('[data-testid="exam-skill-score"][data-skill="reading"]')
	).toContainText('0 / 25');

	// A late second expiry changes nothing.
	await page.clock.runFor(EXAM_MS);
	await expect(listening).toContainText('13 / 25');
});
