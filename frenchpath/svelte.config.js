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
				// unsafe-eval needed for vosk-browser: its Emscripten WASM runtime
				// calls new Function() during its own startup (createNamedFunction/
				// extendError idiom), independent of WebAssembly.instantiate itself.
				// 'wasm-unsafe-eval' does not cover this — confirmed empirically.
				// Approved by project owner after documented risk investigation
				// (.superpowers/sdd/task-10-csp-fix-report.md).
				'script-src': ['self', 'unsafe-eval'],
				'connect-src': ['self'],
				'img-src': ['self', 'data:'],
				'media-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'frame-ancestors': ['none'],
				'manifest-src': ['self'],
				// blob: needed for vosk-browser, which bundles and spawns its worker
				// from a blob: URL rather than a same-origin module URL.
				'worker-src': ['self', 'blob:']
			}
		}
	}
};

export default config;
