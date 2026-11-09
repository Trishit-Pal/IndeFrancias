// Opens (and lazily caches) the single FrenchPath IndexedDB database.
import {
	openDB,
	deleteDB,
	type IDBPDatabase,
	type IDBPObjectStore,
	type IDBPTransaction,
	type StoreNames
} from 'idb';
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
				if (oldVersion < 2) {
					db.createObjectStore('assessments', { keyPath: 'assessmentId' });
				}
			}
		});
	}
	return dbPromise;
}

/** A readwrite store handle from any transaction, so in-transaction helpers can be shared. */
export type WritableStore<Name extends StoreNames<FrenchPathDB>> = IDBPObjectStore<
	FrenchPathDB,
	ArrayLike<StoreNames<FrenchPathDB>>,
	Name,
	'readwrite'
>;

/**
 * Runs `body` in ONE readwrite transaction over `stores`, resolving once it has
 * committed. All-or-nothing: if `body` throws or the browser aborts the
 * transaction (quota, tab kill), none of its writes are kept.
 *
 * `body` may only await IDB requests: awaiting anything else lets IndexedDB
 * auto-commit the transaction early. Do non-IDB work before calling this.
 */
export async function writeAtomically<Name extends StoreNames<FrenchPathDB>, T>(
	stores: Name[],
	body: (tx: IDBPTransaction<FrenchPathDB, Name[], 'readwrite'>) => Promise<T>
): Promise<T> {
	const tx = (await getDB()).transaction(stores, 'readwrite');
	try {
		const result = await body(tx);
		await tx.done;
		return result;
	} catch (error) {
		tx.done.catch(() => undefined); // rejects with AbortError; the caller gets `error`
		try {
			tx.abort();
		} catch {
			// Already finished (committed or aborted by the browser) — nothing to undo.
		}
		throw error;
	}
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
