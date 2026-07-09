import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// SPA / offline-first: no server at runtime. The 200.html shell boots
		// client-side and handles every route (incl. dynamic /learn/[unitId]).
		adapter: adapter({ fallback: '200.html', precompress: true, strict: false }),
		// Emit absolute paths from resolve() (e.g. /learn/...). Relative paths
		// resolve against the wrong base under the SW navigateFallback.
		paths: { relative: false },
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'connect-src': ['self'],
				'img-src': ['self', 'data:'],
				'media-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'frame-ancestors': ['none'],
				'manifest-src': ['self'],
				'worker-src': ['self']
			}
		}
	}
};

export default config;
