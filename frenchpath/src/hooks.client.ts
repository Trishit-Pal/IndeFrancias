import type { HandleClientError } from '@sveltejs/kit';
import { dev } from '$app/environment';

// Single choke point for uncaught client errors; a later consent-gated crash reporter plugs in here.
export const handleError: HandleClientError = ({ error }) => {
	if (dev) console.error(error); // production logs nothing: no internals leak to the console or UI
	return { message: 'Something went wrong.' };
};
