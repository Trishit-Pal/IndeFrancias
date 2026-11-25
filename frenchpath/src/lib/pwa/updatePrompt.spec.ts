import { describe, expect, it } from 'vitest';
import { isSessionRoute } from './updatePrompt';

describe('isSessionRoute', () => {
	it.each([
		'/learn/[unitId]',
		'/checkpoint/[groupId]',
		'/exam/delf-a2',
		'/exam/delf-b1',
		'/exam/delf-b2',
		'/exam/dalf-c1',
		'/review'
	])('holds the update prompt on %s', (routeId) => {
		expect(isSessionRoute(routeId)).toBe(true);
	});

	it.each(['/', '/progress', '/settings', '/privacy', '/exam'])(
		'shows the update prompt on %s',
		(routeId) => {
			expect(isSessionRoute(routeId)).toBe(false);
		}
	);

	it('shows the update prompt when the route is unknown (error page)', () => {
		expect(isSessionRoute(null)).toBe(false);
	});
});
