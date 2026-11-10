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

test('update check toggle is off by default and never fetches version.json', async ({ page }) => {
	const versionRequests: string[] = [];
	page.on('request', (req) => {
		if (req.url().includes('version.json')) versionRequests.push(req.url());
	});

	await gotoHome(page);
	await page.goto('/settings');
	await expect(page.getByTestId('update-check-toggle')).not.toBeChecked();
	await expect(page.getByTestId('update-check-now')).not.toBeVisible();

	await page.goto('/');
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await expect(
		page
			.getByTestId('check')
			.or(page.getByTestId('summary'))
			.or(page.getByTestId('bridge-quiz-continue'))
			.first()
	).toBeVisible();

	expect(versionRequests).toEqual([]);
});

test('About shows the version and links to the privacy page and feedback', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	const about = page.getByTestId('about-section');
	await expect(page.getByTestId('app-version')).toContainText(/\d+\.\d+\.\d+/);
	await expect(page.getByTestId('feedback-link')).toHaveAttribute(
		'href',
		'https://github.com/Trishit-Pal/IndeFrancias/issues'
	);
	await expect(page.getByTestId('feedback-link')).toHaveAttribute('rel', 'noopener noreferrer');

	await about.getByTestId('licenses').locator('summary').click();
	await expect(about).toContainText('SIL OFL 1.1');
	await expect(about).toContainText('vosk-model-small-fr-0.22');

	await page.getByTestId('privacy-link').click();
	await expect(page).toHaveURL(/\/privacy$/);
	await expect(page.getByTestId('privacy-page')).toContainText(/IndexedDB/);
});

test('Reset also clears localStorage', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/settings');
	await page.evaluate(() => localStorage.setItem('frenchpath:probe', '1'));
	await page.getByTestId('reset-progress').click();
	await page.getByTestId('reset-confirm').click();
	await expect(page.getByTestId('reset-progress')).toBeVisible({ timeout: 15_000 });
	expect(await page.evaluate(() => localStorage.getItem('frenchpath:probe'))).toBeNull();
});
