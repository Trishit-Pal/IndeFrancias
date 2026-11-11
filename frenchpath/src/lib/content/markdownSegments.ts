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

		// Plain text, or an unmatched marker shown literally. Searching from i + 1 means the
		// chunk always holds at least the current character, so i strictly increases.
		let next = text.length;
		for (const marker of ['**', '*', '\n']) {
			const idx = text.indexOf(marker, i + 1);
			if (idx !== -1 && idx < next) next = idx;
		}
		pushText(segments, text.slice(i, next));
		i = next;
	}

	return segments;
}

/** Append plain text, merging into a directly preceding text segment. */
function pushText(segments: MarkdownSegment[], content: string): void {
	const last = segments[segments.length - 1];
	if (last?.kind === 'text') {
		segments[segments.length - 1] = { kind: 'text', content: last.content + content };
		return;
	}
	segments.push({ kind: 'text', content });
}
