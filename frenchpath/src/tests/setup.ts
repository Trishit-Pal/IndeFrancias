// Polyfill IndexedDB in the Node test environment so the idb-based
// repositories can be exercised exactly as they run in the browser.
import 'fake-indexeddb/auto';
