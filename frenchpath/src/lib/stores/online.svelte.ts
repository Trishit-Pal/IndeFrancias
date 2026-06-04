// Reactive online/offline status, usable from any component via `network.online`.
function createNetworkStatus() {
	let online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);

	if (typeof window !== 'undefined') {
		window.addEventListener('online', () => (online = true));
		window.addEventListener('offline', () => (online = false));
	}

	return {
		get online() {
			return online;
		}
	};
}

export const network = createNetworkStatus();
