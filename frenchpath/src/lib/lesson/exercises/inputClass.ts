/** Shared styling for free-text answer inputs (green/red after submit). */
export function answerInputClass(submitted: boolean, correct: boolean): string {
	const base =
		'w-full rounded-lg border-2 bg-input px-3 py-2 text-base text-foreground focus:outline-none';
	if (submitted && correct) return `${base} border-green-500 text-green-900 dark:text-green-200`;
	if (submitted) return `${base} border-red-500 text-red-900 dark:text-red-200`;
	return `${base} border-primary`;
}
