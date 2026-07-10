import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

test('fresh learner sees standard-scheduling status on /progress', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/progress');
	const status = page.getByTestId('fsrs-status');
	await expect(status).toBeVisible();
	await expect(status).toContainText(
		'Standard FSRS scheduling. Personalizes automatically after 500 reviews.'
	);
	await expect(page.getByTestId('fsrs-reset')).not.toBeVisible();
});
