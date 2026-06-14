import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

test('theme can be switched to dark', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	await page.getByTestId('theme-select').selectOption('dark');
	await expect(page.locator('html')).toHaveClass(/dark/);
});

test('daily goal change is reflected on home', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	await page.getByTestId('goal-select').selectOption('50');
	await page.goto('/');
	await expect(page.getByTestId('daily-goal')).toContainText('/ 50 XP');
});

test('reduce motion toggles class on document root', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	const checkbox = page.getByTestId('reduce-motion');
	await checkbox.check();
	await expect(page.locator('html')).toHaveClass(/reduce-motion/);
});

test('data-local notice is visible in backup section', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	await expect(page.getByTestId('data-local-notice')).toBeVisible();
});
