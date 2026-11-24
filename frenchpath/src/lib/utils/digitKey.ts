/**
 * The digit (1–9) of a plain key press used as a shortcut, else null.
 * A held key, a modifier chord and anything typed into a field are not shortcuts.
 */
export function digitKey(event: KeyboardEvent): number | null {
	if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;
	const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
	if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) {
		return null;
	}
	return /^[1-9]$/.test(event.key) ? Number(event.key) : null;
}
