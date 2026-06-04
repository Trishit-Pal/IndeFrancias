// Renders the tiny subset of inline markdown used in lesson "bridge" notes —
// **bold**, *italic*, and line breaks — to HTML. The input is HTML-escaped
// FIRST, so the output is injection-safe even though bridge content is authored
// and trusted. Keep this minimal on purpose (no markdown dependency needed).
export function renderInlineMarkdown(text: string): string {
	const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return escaped
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/\*([^*]+)\*/g, '<em>$1</em>')
		.replace(/\n/g, '<br>');
}
