const DEFAULT_BASE =
	'w-full rounded-lg border-2 bg-input px-3 py-2 text-base text-foreground focus:outline-none';

/** Shared styling for free-text answer inputs (sage/error border after submit).
 *  Reuses .option-correct/.option-incorrect (layout.css) so text inputs and
 *  MCQ-style choices read as one system — bg-input/text-foreground already in
 *  `base` sit in Tailwind's utilities layer, which outranks those classes'
 *  components-layer background/color, so only the border color shows through.
 *  `base` overrides the layout classes for inline inputs (e.g. cloze blanks). */
export function answerInputClass(
	submitted: boolean,
	correct: boolean,
	base = DEFAULT_BASE
): string {
	if (submitted && correct) return `${base} option-correct`;
	if (submitted) return `${base} option-incorrect`;
	return `${base} border-primary`;
}
