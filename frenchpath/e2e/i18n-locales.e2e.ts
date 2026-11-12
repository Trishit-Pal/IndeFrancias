import { test, expect, type Page } from '@playwright/test';
import { gotoHome } from './helpers';
import { UI_LANGUAGES, LANGUAGES, type UiLanguage } from '../src/lib/i18n/languages';

// Phone layout check: translated labels run longer than English, and the bottom tab bar is
// where that breaks first. One test per interface language, every core route.
test.skip(({ isMobile }) => !isMobile, 'phone layout check');

const LATIN_SOURCE = LANGUAGES.en.script.source;

const ROUTES: { path: string; ready: (page: Page) => ReturnType<Page['getByTestId']> }[] = [
	{ path: '/', ready: (page) => page.getByTestId('unit-card').first() },
	{
		path: '/review',
		ready: (page) =>
			page
				.getByTestId('no-reviews')
				.or(page.getByTestId('reveal'))
				.or(page.getByTestId('context-card'))
				.first()
	},
	{ path: '/progress', ready: (page) => page.locator('main').first() },
	{ path: '/settings', ready: (page) => page.getByTestId('theme-select') }
];

async function expectRouteFits(page: Page, code: UiLanguage, route: string) {
	const info = LANGUAGES[code];
	const where = `${code} ${route}`;
	await expect(page.locator('html'), `${where}: <html lang>`).toHaveAttribute(
		'lang',
		info.htmlLang
	);

	const overflow = await page.evaluate(() => ({
		scroll: document.documentElement.scrollWidth,
		client: document.documentElement.clientWidth
	}));
	expect
		.soft(overflow.scroll, `${where}: page scrolls sideways (client ${overflow.client}px)`)
		.toBeLessThanOrEqual(overflow.client);

	const nav = page.locator('nav.fp-mobile-nav');
	const tabs = await nav.locator('a').evaluateAll((links) =>
		links.map((a) => ({
			label: (a.textContent ?? '').trim(),
			scroll: a.scrollWidth,
			client: a.clientWidth,
			right: a.getBoundingClientRect().right,
			viewport: document.documentElement.clientWidth
		}))
	);
	expect(tabs.length, `${where}: bottom tab bar links`).toBe(4);
	for (const tab of tabs) {
		expect
			.soft(tab.scroll, `${where}: tab "${tab.label}" clipped (client ${tab.client}px)`)
			.toBeLessThanOrEqual(tab.client + 1);
		// A flex item grows to its longest word, so a too-long label pushes the row past the
		// fixed bar's edge instead of clipping; the page itself never scrolls for a fixed element.
		expect
			.soft(tab.right, `${where}: tab "${tab.label}" runs off the screen`)
			.toBeLessThanOrEqual(tab.viewport + 1);
	}

	if (info.script.source !== LATIN_SOURCE) {
		expect.soft(await nav.innerText(), `${where}: tab bar is not in ${code}`).toMatch(info.script);
	}
}

for (const code of UI_LANGUAGES) {
	test(`${code}: core routes render on a phone without breaking the layout`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
		});

		await page.emulateMedia({ reducedMotion: 'reduce' });
		// Paraglide renders from its own key; the saved setting drives <html lang> and the rest.
		await page.addInitScript((l) => localStorage.setItem('PARAGLIDE_LOCALE', l), code);
		await gotoHome(page, { uiLanguage: code });

		for (const route of ROUTES) {
			if (route.path !== '/') await page.goto(route.path);
			await expect(route.ready(page), `${code} ${route.path}: main content`).toBeVisible({
				timeout: 15_000
			});
			await expectRouteFits(page, code, route.path);
		}

		expect(errors, `${code}: page and console errors`).toEqual([]);
	});
}
