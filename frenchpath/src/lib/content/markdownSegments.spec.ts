import { describe, it, expect } from 'vitest';
import { parseInlineMarkdownSegments } from './markdownSegments';

describe('parseInlineMarkdownSegments', () => {
	it('parses bold, italic, and line breaks', () => {
		const segments = parseInlineMarkdownSegments('**bonjour** and *salut*\nnext');
		expect(segments).toEqual([
			{ kind: 'strong', content: 'bonjour' },
			{ kind: 'text', content: ' and ' },
			{ kind: 'em', content: 'salut' },
			{ kind: 'break' },
			{ kind: 'text', content: 'next' }
		]);
	});
});
