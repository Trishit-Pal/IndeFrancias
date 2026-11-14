// How long until a card comes back, as short text for the review screen
// ("10 min", "4 days"). Intl writes the unit in the interface language, so
// this needs no message keys.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type IntervalUnit = 'minute' | 'hour' | 'day' | 'month' | 'year';

// Round first, then pick the unit, so 59.6 minutes reads "1 hr" and not "60 min".
function pickUnit(ms: number): [number, IntervalUnit] {
	const minutes = Math.round(ms / MINUTE);
	if (minutes < 60) return [Math.max(1, minutes), 'minute'];
	const hours = Math.round(ms / HOUR);
	if (hours < 24) return [hours, 'hour'];
	const days = Math.round(ms / DAY);
	if (days < 30) return [days, 'day'];
	const months = Math.round(days / 30);
	if (months < 12) return [months, 'month'];
	return [Math.max(1, Math.round(days / 365)), 'year'];
}

/** `locale` is a BCP 47 tag (the page's `<html lang>` value). */
export function formatInterval(ms: number, locale: string): string {
	const [value, unit] = pickUnit(ms);
	return new Intl.NumberFormat(locale, {
		style: 'unit',
		unit,
		unitDisplay: 'short',
		// the rest of the review screen prints Latin digits in every locale
		numberingSystem: 'latn'
	}).format(value);
}
