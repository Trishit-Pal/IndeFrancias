import { getDB } from '../db';
import type { SrsCard } from '../schema';

export async function getCard(cardId: string): Promise<SrsCard | undefined> {
	return (await getDB()).get('srsCards', cardId);
}

export async function hasCard(cardId: string): Promise<boolean> {
	return (await (await getDB()).getKey('srsCards', cardId)) !== undefined;
}

export async function putCard(card: SrsCard): Promise<void> {
	await (await getDB()).put('srsCards', card);
}

/** Writes many cards atomically (used when seeding a lesson's cards). */
export async function putCards(cards: readonly SrsCard[]): Promise<void> {
	const db = await getDB();
	const tx = db.transaction('srsCards', 'readwrite');
	await Promise.all(cards.map((card) => tx.store.put(card)));
	await tx.done;
}

export async function getAllCards(): Promise<SrsCard[]> {
	return (await getDB()).getAll('srsCards');
}

/**
 * Cards due at or before `now`, soonest-due first (ascending `due` index),
 * optionally capped at `limit`.
 */
export async function getDueCards(now: Date = new Date(), limit?: number): Promise<SrsCard[]> {
	const db = await getDB();
	const range = IDBKeyRange.upperBound(now);
	const due: SrsCard[] = [];
	let cursor = await db.transaction('srsCards').store.index('due').openCursor(range);
	while (cursor) {
		due.push(cursor.value);
		if (limit !== undefined && due.length >= limit) break;
		cursor = await cursor.continue();
	}
	return due;
}

export async function countDue(now: Date = new Date()): Promise<number> {
	const db = await getDB();
	return db.countFromIndex('srsCards', 'due', IDBKeyRange.upperBound(now));
}
