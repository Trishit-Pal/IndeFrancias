import { test, expect } from '@playwright/test';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { completeOnboarding } from './helpers';
import { LANGUAGES } from '../src/lib/i18n/languages';

const unitPath = path.join(
	fileURLToPath(import.meta.url),
	'..',
	'..',
	'src/content/packs/a1/unit-01.json'
);
const firstCardMlGloss: string = JSON.parse(readFileSync(unitPath, 'utf8')).cards[0].glosses.ml;

test.describe('browser prefers Malayalam', () => {
	test.use({ locale: 'ml-IN' });

	test('a first-time visitor whose browser prefers Malayalam gets a Malayalam page', async ({
		page
	}) => {
		await page.goto('/');
		const wizard = page.getByTestId('onboarding-wizard');
		await expect(wizard).toBeVisible({ timeout: 15_000 });
		await expect(page.locator('html')).toHaveAttribute('lang', 'ml');
		await expect(wizard).toContainText(LANGUAGES.ml.script);
	});
});

test('onboarding in Malayalam ends in a Malayalam lesson with Malayalam glosses', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.getByTestId('onboarding-wizard')).toBeVisible({ timeout: 15_000 });
	await completeOnboarding(page, 'ml');

	await expect(page).toHaveURL(/\/learn\/a1-unit-01/);
	await expect(page.locator('html')).toHaveAttribute('lang', 'ml');
	await expect(page.getByTestId('start-lesson')).toHaveText(LANGUAGES.ml.script);
	// The intro lists the unit's new words with their gloss in the learner's language.
	await expect(page.locator('#main')).toContainText(firstCardMlGloss);
});
