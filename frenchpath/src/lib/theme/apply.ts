import type { Theme } from '$lib/db/schema';

const THEME_COLOR_LIGHT = '#2563eb';
const THEME_COLOR_DARK = '#000000';

/** Resolve whether the UI should render in dark mode. */
export function isDarkTheme(theme: Theme): boolean {
	if (theme === 'dark') return true;
	if (theme === 'light') return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Apply theme class on `<html>` and sync the PWA theme-color meta tag. */
export function applyTheme(theme: Theme): void {
	const root = document.documentElement;
	root.classList.remove('light', 'dark');
	const dark = isDarkTheme(theme);
	root.classList.add(dark ? 'dark' : 'light');

	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute('content', dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
}

/** Re-apply when OS preference changes (caller should re-read settings). */
export function watchSystemTheme(onSystemChange: () => void): () => void {
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	mq.addEventListener('change', onSystemChange);
	return () => mq.removeEventListener('change', onSystemChange);
}
