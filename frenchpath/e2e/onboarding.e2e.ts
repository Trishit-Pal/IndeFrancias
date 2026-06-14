import { test, expect } from '@playwright/test';
import { completeOnboarding } from './helpers';

test('onboarding wizard collects difficulty tier and reaches home', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('onboarding-wizard')).toBeVisible();
	await completeOnboarding(page);
	await expect(page.getByTestId('path-scene')).toBeVisible({ timeout: 15_000 });
	await page.goto('/settings');
	await expect(page.getByTestId('difficulty-tier-select')).toHaveValue('regular');
});
