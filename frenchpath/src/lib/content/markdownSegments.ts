/** Inline markdown segments for GlossMarkdown (bold, italic, plain text). */
export type MarkdownSegment =
	| { kind: 'text'; content: string }
	| { kind: 'strong'; content: string }
	| { kind: 'em'; content: string }
	| { kind: 'break' };

/** Split bridge markdown into gloss-friendly segments (no HTML). */
export function parseInlineMarkdownSegments(text: string): MarkdownSegment[] {
	const segments: MarkdownSegment[] = [];
	let i = 0;

	while (i < text.length) {
		if (text[i] === '\n') {
			segments.push({ kind: 'break' });
			i += 1;
			continue;
		}

		if (text.startsWith('**', i)) {
			const end = text.indexOf('**', i + 2);
			if (end !== -1) {
				segments.push({ kind: 'strong', content: text.slice(i + 2, end) });
				i = end + 2;
				continue;
			}
		}

		if (text[i] === '*' && text[i + 1] !== '*') {
			const end = text.indexOf('*', i + 1);
			if (end !== -1) {
				segments.push({ kind: 'em', content: text.slice(i + 1, end) });
				i = end + 1;
				continue;
			}
		}

		let next = text.length;
		for (const marker of ['**', '*', '\n']) {
			const idx = text.indexOf(marker, i);
			if (idx !== -1 && idx < next) next = idx;
		}
		const chunk = text.slice(i, next);
		if (chunk) segments.push({ kind: 'text', content: chunk });
		i = next;
	}

	return segments;
}
