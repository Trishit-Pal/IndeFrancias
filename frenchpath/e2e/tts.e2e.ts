import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

test('TTS speed setting persists after reload', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	const speed = page.getByTestId('tts-speed-slider');
	await expect(speed).toBeVisible();
	await speed.fill('1.25');
	await page.reload();
	await expect(speed).toHaveValue('1.25');
});
