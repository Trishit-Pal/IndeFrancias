// Unbounded unit ids -> not prerenderable. Rendered purely client-side and
// served offline via the service worker's navigateFallback ('/') + the SPA router.
export const prerender = false;
export const ssr = false;
