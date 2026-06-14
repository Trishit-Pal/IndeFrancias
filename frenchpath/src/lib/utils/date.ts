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

/** Last N calendar-day keys ending today (inclusive), oldest first. */
export function lastNDayKeys(n: number, from: Date = new Date()): string[] {
	const keys: string[] = [];
	for (let i = n - 1; i >= 0; i--) {
		const d = new Date(from);
		d.setDate(d.getDate() - i);
		keys.push(todayKey(d));
	}
	return keys;
}
