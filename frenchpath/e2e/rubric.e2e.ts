import { test, expect } from '@playwright/test';

// a1-unit-01 gets a seeded rubric rule in Task 3; until then this test uses
// the test-only unit route if one exists. Write against a1-unit-01 and let
// Task 3 make it pass — expected red until content is seeded.
test('a wrong answer matching a rubric rule shows a hint chip', async ({ page }) => {
	await page.goto('/learn/a1-unit-01');
	await page.getByTestId('start-lesson').click();
	// Advance to the first cloze/translation exercise, type the trap answer.
	// (Exact navigation depends on unit content — use the seeded exercise
	// from Task 3 which is the unit's first cloze.)
	const input = page.getByTestId('cloze-input').or(page.getByTestId('text-answer'));
	await input.first().fill('je suis 25');
	await page.getByTestId('check').click();
	await expect(page.getByTestId('rubric-hint')).toBeVisible();
	await expect(page.getByTestId('rubric-hint')).toContainText('avoir');
});
