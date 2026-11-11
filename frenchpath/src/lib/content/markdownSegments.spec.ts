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

	// An unmatched marker is plain text, merged into the surrounding text segment.
	it.each(['5 * 3', 'a ** b', 'trailing *', '*', '**', '***', 'a*'])(
		'returns the input unchanged as one text segment for %j',
		(input) => {
			const segments = parseInlineMarkdownSegments(input);
			expect(segments).toEqual([{ kind: 'text', content: input }]);
			expect(segments.map((s) => (s.kind === 'text' ? s.content : '')).join('')).toBe(input);
		}
	);

	it('keeps a lone opening asterisk literal when a later pair matches', () => {
		expect(parseInlineMarkdownSegments('**bold* x')).toEqual([
			{ kind: 'text', content: '*' },
			{ kind: 'em', content: 'bold' },
			{ kind: 'text', content: ' x' }
		]);
	});

	it('shows an unmatched asterisk next to matched emphasis and breaks', () => {
		expect(parseInlineMarkdownSegments('**a** 5 *\n2')).toEqual([
			{ kind: 'strong', content: 'a' },
			{ kind: 'text', content: ' 5 *' },
			{ kind: 'break' },
			{ kind: 'text', content: '2' }
		]);
	});
});
