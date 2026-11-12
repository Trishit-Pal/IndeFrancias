import { test, expect } from '@playwright/test';
import { gotoHome, completeLesson, exportBackupViaSettings, importBackupFile } from './helpers';

async function reachExercisePhase(page: import('@playwright/test').Page) {
	const check = page.getByTestId('check');
	const mcq = page.getByTestId('mcq-option');
	const bridgeContinue = page.getByTestId('bridge-quiz-continue');

	for (let attempt = 0; attempt < 12; attempt++) {
		if (
			await check
				.or(mcq)
				.first()
				.isVisible()
				.catch(() => false)
		)
			return;

		if (await bridgeContinue.isVisible().catch(() => false)) {
			const options = page.getByTestId('bridge-quiz-option');
			const count = await options.count();
			for (let i = 0; i < count; i++) {
				await options.nth(i).click();
				if (await bridgeContinue.isEnabled().catch(() => false)) break;
			}
			await bridgeContinue.click();
			continue;
		}

		const start = page.getByTestId('start-lesson');
		if (await start.isVisible().catch(() => false)) await start.click();
	}

	await expect(check.or(mcq).first()).toBeVisible({ timeout: 15_000 });
}

test('MCQ exercise is keyboard operable', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await reachExercisePhase(page);

	const mcq = page.getByTestId('mcq-option');
	const check = page.getByTestId('check');
	if (await mcq.count()) {
		await mcq.first().focus();
		await page.keyboard.press('Enter');
		await expect(check).toBeEnabled();
		await check.focus();
		await page.keyboard.press('Enter');
		await expect(page.getByTestId('feedback')).toBeVisible();
		await expect(page.getByTestId('feedback')).toHaveAttribute('aria-live', 'polite');
	}
});

test('review grade buttons are focusable after reveal', async ({ page }) => {
	await gotoHome(page);
	await page.getByTestId('unit-card').first().click();
	await page.getByTestId('start-lesson').click();
	await completeLesson(page);

	if (await page.getByRole('link', { name: 'Review now' }).count()) {
		await page.getByRole('link', { name: 'Review now' }).click();
		const ctx = page.getByTestId('context-card');
		await expect(ctx.or(page.getByTestId('reveal')).first()).toBeVisible();
		if (await ctx.isVisible().catch(() => false)) {
			await page.getByTestId('context-choice').first().focus();
			await page.keyboard.press('Enter');
			await expect(page.getByTestId('context-feedback')).toHaveAttribute('aria-live', 'polite');
			await expect(page.getByTestId('context-feedback')).not.toBeEmpty();
			return;
		}
		await page.getByTestId('reveal').click();
		const gradeBtn = page.locator('[data-grade="good"]');
		await expect(gradeBtn).toBeVisible();
		await gradeBtn.focus();
		await expect(gradeBtn).toBeFocused();
	}
});

test('modal traps Tab focus and restores focus to the opener on Escape', async ({ page }) => {
	await gotoHome(page);
	const backupJson = await exportBackupViaSettings(page);

	// Focus a known control first: showModal() must hand focus back to it on close.
	const opener = page.getByTestId('backup-export');
	await opener.focus();
	await importBackupFile(page, backupJson, false);

	const dialog = page.getByTestId('import-preview');
	await expect(dialog).toBeVisible();

	// Tab repeatedly: focus may briefly leave the document (browser UI → body),
	// but must never land on a page control behind the modal.
	for (let i = 0; i < 10; i++) {
		await page.keyboard.press('Tab');
		const escaped = await page.evaluate(() => {
			const active = document.activeElement;
			const modal = document.querySelector('[data-testid="import-preview"]');
			return !!active && active !== document.body && !modal?.contains(active);
		});
		expect(escaped, `Tab #${i + 1} escaped the modal`).toBe(false);
	}

	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(opener).toBeFocused();
});

// ── axe-core scans ──────────────────────────────────────────────────────────
// WCAG 2.x A/AA rules on every core route. `critical`/`serious` fail the test;
// `moderate`/`minor` are attached as annotations so they show in the report
// without blocking. Scenes pair a theme with a locale so both themes and the
// priority locale (Hinglish) are covered without the full 2×2 matrix.
import AxeBuilder from '@axe-core/playwright';

type Scene = { label: string; overrides: Record<string, unknown> };
const SCENES: Scene[] = [
	{ label: 'light/en', overrides: { theme: 'light', uiLanguage: 'en' } },
	{ label: 'dark/hinglish', overrides: { theme: 'dark', uiLanguage: 'hinglish' } },
	{ label: 'dark/ml', overrides: { theme: 'dark', uiLanguage: 'ml', nativeLanguage: 'ml' } }
];

// Paraglide resolves the UI locale from its own localStorage key, not from IDB settings.
async function seedLocale(page: import('@playwright/test').Page, scene: Scene) {
	// Settle entrance motion before sampling colours: a mid-fade frame reads as low contrast.
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const locale = String(scene.overrides.uiLanguage ?? 'en');
	await page.addInitScript((l) => localStorage.setItem('PARAGLIDE_LOCALE', l), locale);
}

async function expectNoBlockingA11yViolations(
	page: import('@playwright/test').Page,
	label: string
) {
	const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
	const describe = (v: (typeof results.violations)[number]) =>
		`${v.id} (${v.impact}) ×${v.nodes.length} — ${(process.env.AXE_VERBOSE
			? v.nodes
			: v.nodes.slice(0, 1)
		)
			.map((n) =>
				process.env.AXE_VERBOSE
					? `${n.target.join(' ')} ${JSON.stringify(n.any[0]?.data ?? {})}`
					: n.target.join(' ')
			)
			.join(' | ')} — ${v.help}`;
	const blocking = results.violations.filter(
		(v) => v.impact === 'critical' || v.impact === 'serious'
	);
	for (const v of results.violations) {
		if (blocking.includes(v)) continue;
		test.info().annotations.push({ type: `axe-advisory ${label}`, description: describe(v) });
	}
	expect(blocking.map(describe), `${label}: critical/serious axe violations`).toEqual([]);
}

test('axe: onboarding wizard (first visit)', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await expect(page.getByTestId('onboarding-wizard')).toBeVisible({ timeout: 15_000 });
	await expectNoBlockingA11yViolations(page, 'onboarding');
});

for (const scene of SCENES) {
	test.describe(`axe ${scene.label}`, () => {
		test('home, review, progress, settings', async ({ page }) => {
			await seedLocale(page, scene);
			await gotoHome(page, scene.overrides);
			await expectNoBlockingA11yViolations(page, `${scene.label} /`);

			await page.goto('/review');
			await expect(
				page
					.getByTestId('no-reviews')
					.or(page.getByTestId('reveal'))
					.or(page.getByTestId('context-card'))
					.first()
			).toBeVisible({ timeout: 15_000 });
			await expectNoBlockingA11yViolations(page, `${scene.label} /review`);

			await page.goto('/progress');
			await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 });
			await expectNoBlockingA11yViolations(page, `${scene.label} /progress`);

			await page.goto('/settings');
			await expect(page.getByTestId('theme-select')).toBeVisible({ timeout: 15_000 });
			await expectNoBlockingA11yViolations(page, `${scene.label} /settings`);

			await page.goto('/privacy');
			await expect(page.getByTestId('privacy-page')).toBeVisible({ timeout: 15_000 });
			await expectNoBlockingA11yViolations(page, `${scene.label} /privacy`);
		});

		test('lesson intro and exercise phase', async ({ page }) => {
			await seedLocale(page, scene);
			await gotoHome(page, scene.overrides);
			await page.getByTestId('unit-card').first().click();
			await expect(page.getByTestId('start-lesson')).toBeVisible({ timeout: 15_000 });
			await expectNoBlockingA11yViolations(page, `${scene.label} /learn intro`);
			await page.getByTestId('start-lesson').click();
			await reachExercisePhase(page);
			await expectNoBlockingA11yViolations(page, `${scene.label} /learn exercise`);
		});
	});
}

// ── shell: skip link + route-change focus ───────────────────────────────────
test('skip link is the first Tab stop and moves focus to the content region', async ({ page }) => {
	await gotoHome(page);
	await page.keyboard.press('Tab');
	const skip = page.getByRole('link', { name: /skip to content/i });
	await expect(skip).toBeFocused();
	await expect(skip).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page.locator('#main')).toBeFocused();
});

test('navigating via the tab bar moves focus to the content region and announces the title', async ({
	page
}) => {
	await gotoHome(page);
	const announcer = page.locator('[role="status"][aria-live="polite"]').first();
	await expect(announcer).toHaveText('');
	// Sidebar (lg+) or bottom bar (<lg): take whichever Review link is visible.
	await page
		.getByRole('link', { name: /^review$/i })
		.filter({ visible: true })
		.first()
		.click();
	await expect(page).toHaveURL(/\/review/);
	await expect(page.locator('#main')).toBeFocused();
	await expect(announcer).not.toHaveText('');
	await expect(announcer).toHaveText(await page.title());
});
