// FrenchPath ships as static files with no runtime server. We PRERENDER the
// app shell at build time (still serverless) so the service worker can precache
// real HTML for offline use. The one dynamic route (/learn/[unitId]) opts out
// and is reached offline via the SPA navigateFallback + client-side routing.
export const prerender = true;
export const trailingSlash = 'never';
