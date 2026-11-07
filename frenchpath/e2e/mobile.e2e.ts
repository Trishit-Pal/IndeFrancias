import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

// Runs only in the `mobile` Playwright project (Pixel 7). Guards the phone
// shell: bottom tab bar present, every tab a real thumb target.
test.describe('mobile shell', () => {
	test.skip(({ isMobile }) => !isMobile, 'mobile project only');

	test('bottom nav is visible and every tab is at least 44px tall and wide', async ({ page }) => {
		await gotoHome(page);
		const nav = page.locator('nav.fp-mobile-nav');
		await expect(nav).toBeVisible();
		const tabs = nav.getByRole('link');
		expect(await tabs.count()).toBe(4);
		for (let i = 0; i < 4; i++) {
			const box = await tabs.nth(i).boundingBox();
			expect(box, `tab ${i} has a bounding box`).not.toBeNull();
			expect(box!.height, `tab ${i} height`).toBeGreaterThanOrEqual(44);
			expect(box!.width, `tab ${i} width`).toBeGreaterThanOrEqual(44);
		}
	});

	test('next-lesson CTA is in the first viewport without scrolling', async ({ page }) => {
		await gotoHome(page);
		const cta = page.getByTestId('voyage-next');
		const box = await cta.boundingBox();
		const viewport = page.viewportSize()!;
		expect(box).not.toBeNull();
		expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
		expect(box!.height).toBeGreaterThanOrEqual(44);
	});
});
