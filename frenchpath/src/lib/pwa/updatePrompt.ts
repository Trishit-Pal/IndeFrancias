// When the "a new version is ready" prompt may be shown.
//
// Update reloads the page, and a lesson, checkpoint, mock exam or review keeps its
// state in memory. So the prompt is held while one of those screens is open and
// appears on the next screen instead: the daily loop wins ties (PRODUCT.md).

const SESSION_ROUTE_PREFIXES = ['/learn/', '/checkpoint/', '/exam/', '/review'];

/** `routeId` is SvelteKit's `page.route.id`, e.g. `/learn/[unitId]`; null on an error page. */
export function isSessionRoute(routeId: string | null): boolean {
	if (!routeId) return false;
	return SESSION_ROUTE_PREFIXES.some((prefix) => routeId.startsWith(prefix));
}
