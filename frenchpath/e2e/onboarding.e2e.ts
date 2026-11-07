import { test, expect } from '@playwright/test';
import { completeOnboarding } from './helpers';

test('onboarding wizard collects difficulty tier and lands in the first lesson', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.getByTestId('onboarding-wizard')).toBeVisible();
	await completeOnboarding(page);
	await expect(page).toHaveURL(/\/learn\/a1-unit-01/);
	await expect(page.getByTestId('start-lesson')).toBeVisible({ timeout: 15_000 });
	await page.goto('/settings');
	await expect(page.getByTestId('difficulty-tier-select')).toHaveValue('regular');
});
