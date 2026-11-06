import type { SrsCard } from '$lib/db/schema';

/** A card forgotten this many times gets a one-time teaching panel. */
export const LEECH_LAPSES = 3;

export function isLeech(card: Pick<SrsCard, 'lapses'>): boolean {
	return card.lapses >= LEECH_LAPSES;
}
