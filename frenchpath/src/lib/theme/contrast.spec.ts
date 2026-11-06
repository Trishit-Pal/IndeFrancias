import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Guards WCAG AA (4.5:1) for every token used as body text, in both themes.
// Reads tokens.css directly so a palette edit that breaks legibility goes red.
const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

function block(selector: string): Record<string, string> {
	const start = css.indexOf(`${selector} {`);
	const body = css.slice(start, css.indexOf('}', start));
	const vars: Record<string, string> = {};
	for (const [, name, hex] of body.matchAll(/(--fp-[\w-]+):\s*(#[0-9a-f]{6})\b/gi))
		vars[name] = hex;
	return vars;
}

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const v = parseInt(hex.slice(i, i + 2), 16) / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;
const TEXT_TOKENS = ['--fp-ink', '--fp-saffron-text', '--fp-sage-text'];
const themes = { light: block('.light'), dark: block('.dark') };

describe('token contrast (WCAG AA)', () => {
	it('helper rejects the raw marigold fill as text on light canvas', () => {
		expect(contrast('#d99a2b', '#faf7f0')).toBeLessThan(AA);
	});

	for (const [theme, t] of Object.entries(themes)) {
		for (const token of TEXT_TOKENS) {
			for (const bg of ['--fp-canvas', '--fp-paper']) {
				it(`${theme}: ${token} on ${bg} >= ${AA}`, () => {
					expect(t[token], `${token} missing in ${theme}`).toBeDefined();
					expect(contrast(t[token], t[bg])).toBeGreaterThanOrEqual(AA);
				});
			}
		}
		it(`${theme}: --fp-on-error on --fp-error >= ${AA}`, () => {
			expect(contrast(t['--fp-on-error'], t['--fp-error'])).toBeGreaterThanOrEqual(AA);
		});
	}
});
