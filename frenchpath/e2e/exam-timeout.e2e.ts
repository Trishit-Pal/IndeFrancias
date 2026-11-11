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

const JUMP_MS = 20 * 60 * 1000;
// Real time keeps running under the fake clock; this bound only guards against counting the jump twice.
const UPPER_SLACK_S = 10;

async function readTimerSeconds(page: import('@playwright/test').Page): Promise<number> {
	const text = (await page.getByTestId('exam-timer').textContent()) ?? '';
	const match = /(\d+):(\d+)/.exec(text);
	if (!match) throw new Error(`exam-timer shows no MM:SS: "${text}"`);
	return Number(match[1]) * 60 + Number(match[2]);
}

test('a suspended tab does not pause the exam clock', async ({ page }) => {
	await page.clock.install();
	await page.goto('/exam/delf-a2');
	await page.getByTestId('start-exam').click();
	await expect(page.getByTestId('exam-timer')).toBeVisible();

	const before = await readTimerSeconds(page);
	// fastForward fires due timers once, like a device waking after being locked.
	await page.clock.fastForward(JUMP_MS);

	// Wall time moved 20 minutes: allow 2 s of slack either way.
	await expect
		.poll(async () => before - (await readTimerSeconds(page)))
		.toBeGreaterThanOrEqual(JUMP_MS / 1000 - 2);
	expect(before - (await readTimerSeconds(page))).toBeLessThanOrEqual(JUMP_MS / 1000 + UPPER_SLACK_S);
});

test('a jump past the end finishes the exam', async ({ page }) => {
	await page.clock.install();
	await page.goto('/exam/delf-a2');
	await page.getByTestId('start-exam').click();
	await expect(page.getByTestId('exam-timer')).toBeVisible();

	await page.clock.fastForward(EXAM_MS + 5_000);

	await expect(page.getByTestId('exam-result')).toBeVisible();
});
