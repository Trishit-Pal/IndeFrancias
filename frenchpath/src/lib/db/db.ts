// Opens (and lazily caches) the single FrenchPath IndexedDB database.
import { openDB, deleteDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, type FrenchPathDB } from './schema';

let dbPromise: Promise<IDBPDatabase<FrenchPathDB>> | null = null;

/**
 * Returns the shared database handle, opening it on first use.
 * Safe to call repeatedly; the open promise is memoised.
 */
export function getDB(): Promise<IDBPDatabase<FrenchPathDB>> {
	if (typeof indexedDB === 'undefined') {
		throw new Error('IndexedDB is not available in this environment.');
	}
	if (!dbPromise) {
		dbPromise = openDB<FrenchPathDB>(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				// Versioned, additive migrations. v1 creates the initial stores.
				if (oldVersion < 1) {
					db.createObjectStore('settings');
					db.createObjectStore('progress', { keyPath: 'lessonId' });

					const srs = db.createObjectStore('srsCards', { keyPath: 'cardId' });
					srs.createIndex('due', 'due');
					srs.createIndex('cefrLevel', 'cefrLevel');
					srs.createIndex('skill', 'skill');

					const log = db.createObjectStore('reviewLog', {
						keyPath: 'id',
						autoIncrement: true
					});
					log.createIndex('cardId', 'cardId');
					log.createIndex('ts', 'ts');

					db.createObjectStore('streak', { keyPath: 'id' });
					db.createObjectStore('stats', { keyPath: 'date' });
					db.createObjectStore('skillProfile', { keyPath: 'skill' });
				}
			}
		});
	}
	return dbPromise;
}

/**
 * Closes and forgets the cached handle, then deletes the database.
 * Used by tests for isolation and by a future "reset progress" action.
 */
export async function resetDatabase(): Promise<void> {
	if (dbPromise) {
		(await dbPromise).close();
		dbPromise = null;
	}
	await deleteDB(DB_NAME);
}
