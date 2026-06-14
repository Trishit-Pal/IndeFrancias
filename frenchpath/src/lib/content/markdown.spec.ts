import { describe, it, expect } from 'vitest';
import { renderInlineMarkdown } from './markdown';

describe('renderInlineMarkdown', () => {
	it('renders **bold** and *italic*', () => {
		expect(renderInlineMarkdown('a **b** c')).toBe('a <strong>b</strong> c');
		expect(renderInlineMarkdown('a *b* c')).toBe('a <em>b</em> c');
	});

	it('handles bold and italic together without clashing', () => {
		expect(renderInlineMarkdown('**un ami** vs *une amie*')).toBe(
			'<strong>un ami</strong> vs <em>une amie</em>'
		);
	});

	it('escapes HTML so it stays injection-safe', () => {
		expect(renderInlineMarkdown('<img src=x onerror=1>')).toBe('&lt;img src=x onerror=1&gt;');
	});

	it('converts newlines to <br>', () => {
		expect(renderInlineMarkdown('line one\nline two')).toBe('line one<br>line two');
	});

	it('leaves plain text untouched', () => {
		expect(renderInlineMarkdown('la vs le — gender')).toBe('la vs le — gender');
	});

	it('escapes script injection attempts', () => {
		expect(renderInlineMarkdown('<script>alert(1)</script>')).toBe(
			'&lt;script&gt;alert(1)&lt;/script&gt;'
		);
		expect(renderInlineMarkdown('**<img onerror=1>**')).toBe(
			'<strong>&lt;img onerror=1&gt;</strong>'
		);
	});

	it('documents nested emphasis as non-nested (bold regex does not cross inner italics)', () => {
		// Inner * pairs are processed first; outer ** does not span across them.
		expect(renderInlineMarkdown('**bold *inner* bold**')).toBe(
			'*<em>bold </em>inner<em> bold</em>*'
		);
	});
});
