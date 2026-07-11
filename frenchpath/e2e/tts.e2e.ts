import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson } from './helpers';

test('TTS speed setting persists after reload', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	const speed = page.getByTestId('tts-speed-slider');
	await expect(speed).toBeVisible();
	await speed.fill('1.25');
	await page.reload();
	await expect(speed).toHaveValue('1.25');
});

test('shadowing toggle reveals synced transcript on a dictation exercise', async ({ page }) => {
	await gotoHome(page);
	// a1-unit-03's first exercise is a dictation exercise; units 1-2 must be
	// completed first to unlock it.
	for (const unitId of ['a1-unit-01', 'a1-unit-02']) {
		await page.locator(`a[href*="/learn/${unitId}"]`).first().click();
		await page.getByTestId('start-lesson').click();
		await completeLesson(page);
		await page.getByRole('link', { name: /Back to path|रास्ते|Home/i }).click();
	}

	await page.locator('a[href*="/learn/a1-unit-03"]').first().click();
	await page.getByTestId('start-lesson').click();

	const bridgeContinue = page.getByTestId('bridge-quiz-continue');
	if (await bridgeContinue.isVisible().catch(() => false)) {
		const options = page.getByTestId('bridge-quiz-option');
		const count = await options.count();
		for (let i = 0; i < count; i++) {
			await options.nth(i).click();
			if (await bridgeContinue.isEnabled().catch(() => false)) break;
		}
		await bridgeContinue.click();
	}

	const shadowToggle = page.getByTestId('shadow-toggle');
	await expect(shadowToggle).toBeVisible();
	await expect(page.getByTestId('shadow-transcript')).toHaveCount(0);
	const outerLabel = await shadowToggle.textContent();

	await shadowToggle.click();

	await expect(page.getByTestId('shadow-transcript')).toBeVisible();
	await expect(page.getByTestId('shadow-word')).toHaveCount(1); // audioText is "dix"

	// Regression guard: the outer reveal-toggle describes panel visibility, not
	// playback, so its label must stay fixed even while ShadowingPlayer
	// auto-plays and its own inner button reads "stop".
	await expect(shadowToggle).toHaveText(outerLabel ?? '');
	await expect(shadowToggle).toHaveAttribute('aria-pressed', 'true');
});
