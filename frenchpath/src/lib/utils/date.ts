/** Local calendar day as `YYYY-MM-DD` (used as the key for daily stats/streak). */
export function todayKey(d: Date = new Date()): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Whole days between two `YYYY-MM-DD` keys (b - a). */
export function daysBetween(a: string, b: string): number {
	const ms = Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`);
	return Math.round(ms / 86_400_000);
}
