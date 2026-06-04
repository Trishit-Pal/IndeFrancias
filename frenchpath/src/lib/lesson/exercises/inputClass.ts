/** Shared styling for free-text answer inputs (green/red after submit). */
export function answerInputClass(submitted: boolean, correct: boolean): string {
	const base = 'w-full rounded-lg border-b-2 bg-slate-50 px-3 py-2 text-base focus:outline-none';
	if (submitted && correct) return `${base} border-green-500 text-green-900`;
	if (submitted) return `${base} border-red-500 text-red-900`;
	return `${base} border-blue-400`;
}
