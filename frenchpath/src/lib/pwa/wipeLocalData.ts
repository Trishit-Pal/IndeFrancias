// The non-IndexedDB half of Settings → Reset: everything else this origin stored.
// Each step is independent and best-effort — a feature may be absent (no Cache
// Storage, no service worker) or throw (private mode), and one failure must not
// leave the rest of the learner's data behind. Reset reloads afterwards.

async function clearCaches(): Promise<void> {
	for (const name of await caches.keys()) await caches.delete(name);
}

async function unregisterServiceWorkers(): Promise<void> {
	for (const registration of await navigator.serviceWorker.getRegistrations()) {
		await registration.unregister();
	}
}

/**
 * Clears localStorage (frenchpath:* keys, the Paraglide language, the e2e stub key —
 * this also clears any other app on the same origin, which is acceptable for a
 * full reset), all Cache Storage (speech pack, precache) and service workers.
 */
export async function wipeLocalData(): Promise<void> {
	// ponytail: failures are swallowed (best effort, page reloads); surface them if Reset ever needs a report.
	await Promise.allSettled([
		(async () => localStorage.clear())(),
		clearCaches(),
		unregisterServiceWorkers()
	]);
}
