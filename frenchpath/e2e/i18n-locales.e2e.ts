import { test, expect, type Locator, type Page } from '@playwright/test';
import { answerAnyExercise, gotoHome, passBridgeQuiz } from './helpers';
import { UI_LANGUAGES, LANGUAGES, type UiLanguage } from '../src/lib/i18n/languages';
import { createSrsCard } from '../src/lib/srs/fsrs';

// Phone layout check: translated labels run longer than English, and the bottom tab bar,
// the lesson's buttons and the review grades are where that breaks first. One test per
// interface language: the core routes, then a lesson up to the confidence question, then a
// review card with its grade buttons.
test.skip(({ isMobile }) => !isMobile, 'phone layout check');

const LATIN_SOURCE = LANGUAGES.en.script.source;
const LESSON = '/learn/a1-unit-01';
// No example sentence that can be blanked, so it reviews as a flip card (reveal + grades).
const FLIP_CARD = { unitId: 'a1-unit-01', contentId: 'a1-noun-ami' };
const DAY_MS = 86_400_000;
const MAX_LESSON_STEPS = 9;

const ROUTES: { path: string; ready: (page: Page) => Locator }[] = [
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
	// The postcard is the last section the page loads, after the Today card.
	{ path: '/progress', ready: (page) => page.getByTestId('weekly-postcard') },
	{ path: '/settings', ready: (page) => page.getByTestId('theme-select') }
];

interface Fit {
	label: string;
	scroll: number;
	client: number;
	right: number;
	viewport: number;
}

function measure(locator: Locator): Promise<Fit[]> {
	return locator.evaluateAll((els) =>
		els.map((el) => ({
			label: (el.textContent ?? '').trim() || (el.getAttribute('aria-label') ?? el.tagName),
			scroll: el.scrollWidth,
			client: el.clientWidth,
			right: el.getBoundingClientRect().right,
			viewport: document.documentElement.clientWidth
		}))
	);
}

// A flex item grows to its longest word, so a too-long label pushes past the screen edge
// instead of clipping; the page never scrolls for that inside a fixed bar. Hence both checks.
function expectFits(where: string, what: string, fits: Fit[]) {
	for (const f of fits) {
		expect
			.soft(f.scroll, `${where}: ${what} "${f.label}" clipped (client ${f.client}px)`)
			.toBeLessThanOrEqual(f.client + 1);
		expect
			.soft(f.right, `${where}: ${what} "${f.label}" runs off the screen`)
			.toBeLessThanOrEqual(f.viewport + 1);
	}
}

async function expectNoPageOverflow(page: Page, where: string) {
	const overflow = await page.evaluate(() => ({
		scroll: document.documentElement.scrollWidth,
		client: document.documentElement.clientWidth
	}));
	expect
		.soft(overflow.scroll, `${where}: page scrolls sideways (client ${overflow.client}px)`)
		.toBeLessThanOrEqual(overflow.client);
}

async function expectButtonsFit(page: Page, where: string) {
	await expectNoPageOverflow(page, where);
	expectFits(where, 'button', await measure(page.locator('#main button:visible')));
}

async function expectRouteFits(page: Page, code: UiLanguage, route: string) {
	const info = LANGUAGES[code];
	const where = `${code} ${route}`;
	await expect(page.locator('html'), `${where}: <html lang>`).toHaveAttribute(
		'lang',
		info.htmlLang
	);
	await expectNoPageOverflow(page, where);

	const nav = page.locator('nav.fp-mobile-nav');
	const tabs = await measure(nav.locator('a'));
	expect(tabs.length, `${where}: bottom tab bar links`).toBe(4);
	expectFits(where, 'tab', tabs);
	if (route === '/progress')
		expectFits(where, 'link', await measure(page.getByTestId('today-start')));

	if (info.script.source !== LATIN_SOURCE) {
		expect.soft(await nav.innerText(), `${where}: tab bar is not in ${code}`).toMatch(info.script);
	}
}

/** Intro, bridge quiz, then exercises (before and after Check) until the confidence question. */
async function walkLesson(page: Page, code: UiLanguage) {
	const at = (step: string) => `${code} ${LESSON} ${step}`;
	await page.goto(LESSON);
	const start = page.getByTestId('start-lesson');
	await expect(start, `${at('intro')}: start button`).toBeVisible({ timeout: 15_000 });
	await expectNoPageOverflow(page, at('intro'));
	expectFits(at('intro'), 'button', await measure(start));
	await start.click();

	const bridgeContinue = page.getByTestId('bridge-quiz-continue');
	const check = page.getByTestId('check');
	const cont = page.getByTestId('continue');
	const pulse = page.getByTestId('confidence-pulse');
	await expect(check.or(bridgeContinue).first()).toBeVisible();
	if (await bridgeContinue.isVisible()) {
		await expectButtonsFit(page, at('bridge quiz'));
		await passBridgeQuiz(page);
	}

	for (let step = 1; step <= MAX_LESSON_STEPS; step++) {
		await expect(check, `${at(`exercise ${step}`)}: check button`).toBeVisible();
		await expectButtonsFit(page, at(`exercise ${step}`));
		await answerAnyExercise(page);
		await check.click();
		await expect(cont, `${at(`exercise ${step} feedback`)}: continue button`).toBeVisible();
		await expectButtonsFit(page, at(`exercise ${step} feedback`));
		await cont.click();
		await expect(check.or(pulse).first()).toBeVisible();
		if (await pulse.isVisible()) {
			await expectButtonsFit(page, at('confidence question'));
			return;
		}
	}
	throw new Error(`${at('')}: no confidence question within ${MAX_LESSON_STEPS} exercises`);
}

/** Seeds one overdue flip card, then checks the card before and after reveal. */
async function walkReview(page: Page, code: UiLanguage) {
	const card = {
		...createSrsCard({
			cardId: `${FLIP_CARD.unitId}:${FLIP_CARD.contentId}`,
			contentId: FLIP_CARD.contentId,
			cefrLevel: 'A1',
			skill: 'reading'
		}),
		due: new Date(Date.now() - DAY_MS)
	};
	await page.evaluate(async (seed) => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open('frenchpath');
			req.onerror = () => reject(req.error);
			req.onsuccess = () => resolve(req.result);
		});
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction('srsCards', 'readwrite');
			tx.objectStore('srsCards').put(seed);
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => reject(tx.error);
		});
	}, card);

	await page.goto('/review');
	const reveal = page.getByTestId('reveal');
	await expect(reveal, `${code} /review: reveal button`).toBeVisible({ timeout: 15_000 });
	await expectButtonsFit(page, `${code} /review card`);
	await reveal.click();
	await expect(page.getByTestId('grade-buttons'), `${code} /review: grade buttons`).toBeVisible();
	await expectButtonsFit(page, `${code} /review grades`);
}

for (const code of UI_LANGUAGES) {
	test(`${code}: core routes, a lesson and a review fit on a phone`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
		});

		await page.emulateMedia({ reducedMotion: 'reduce' });
		// Paraglide renders from its own key; the saved setting drives the rest.
		await page.addInitScript((l) => localStorage.setItem('PARAGLIDE_LOCALE', l), code);
		await gotoHome(page, { uiLanguage: code });

		for (const route of ROUTES) {
			if (route.path !== '/') await page.goto(route.path);
			await expect(route.ready(page), `${code} ${route.path}: main content`).toBeVisible({
				timeout: 15_000
			});
			await expectRouteFits(page, code, route.path);
		}

		await walkLesson(page, code);
		await walkReview(page, code);

		expect(errors, `${code}: page and console errors`).toEqual([]);
	});
}
