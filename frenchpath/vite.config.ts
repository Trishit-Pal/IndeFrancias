import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
	build: {
		// Never inline fonts as data: URIs — the strict `default-src 'self'` CSP
		// blocks data: fonts. Emitting them as same-origin asset files keeps the
		// self-hosted webfonts CSP-compliant and offline-cacheable (the workbox
		// glob below precaches woff/woff2).
		assetsInlineLimit: (filePath: string) =>
			/\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(filePath) ? false : undefined,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('three') || id.includes('@threlte')) return 'vendor-3d';
					const packMatch = id.match(/[/\\]content[/\\]packs[/\\]([^/\\]+)[/\\]([^/\\]+)\.json/);
					if (packMatch) return `lesson-${packMatch[1]}-${packMatch[2].replace('.json', '')}`;
				}
			}
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			// Persist the chosen UI language locally (no locale in the URL — keeps
			// routing, the service worker and prerendering simple for this SPA).
			strategy: ['localStorage', 'preferredLanguage', 'baseLocale']
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			// vosk-browser (the WASM ASR engine, ~6MB) is only ever pulled in via a
			// dynamic import inside src/lib/speech/asr.ts, once a learner opts into
			// a speak exercise's model download. SvelteKit hashes client chunk
			// filenames (no [name] control), so it can't be glob-excluded from the
			// precache by path the way static/models/ is below — instead, let
			// vite-pwa fall back to workbox's default behavior (skip oversized
			// files from the precache manifest with a console warning) rather than
			// hard-failing the build, since skipping it is exactly what we want.
			showMaximumFileSizeToCacheInBytesWarning: true,
			includeAssets: [
				'favicon.svg',
				'icon.svg',
				'pwa-64x64.png',
				'pwa-192x192.png',
				'pwa-512x512.png',
				'maskable-icon-512x512.png',
				'apple-touch-icon-180x180.png'
			],
			manifest: {
				name: 'FrenchPath — Learn French',
				short_name: 'FrenchPath',
				description:
					'Offline-first French learning for Indian learners (A1–C1) with spaced repetition. No account needed.',
				lang: 'en',
				theme_color: '#1d4ed8',
				background_color: '#0b1220',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/',
				scope: '/',
				categories: ['education'],
				icons: [
					{ src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
					{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					},
					{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }
				]
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2,json,html}'],
				// The Vosk ASR model (static/models/) is a same-origin opt-in download,
				// never part of the app-shell precache (privacy: web speech is opt-in).
				globIgnores: ['**/models/**'],
				navigateFallback: '/',
				navigateFallbackDenylist: [/^\/manifest\.webmanifest$/],
				runtimeCaching: [
					{
						urlPattern: ({ url }) => url.pathname.startsWith('/audio/'),
						handler: 'CacheFirst',
						options: {
							cacheName: 'frenchpath-audio',
							expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						urlPattern: ({ url }) => url.pathname.includes('/_app/immutable/chunks/'),
						handler: 'CacheFirst',
						options: {
							cacheName: 'frenchpath-chunks',
							expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 },
							cacheableResponse: { statuses: [0, 200] }
						}
					}
				]
			},
			devOptions: { enabled: false }
		}),
		mode === 'analyze' &&
			visualizer({
				filename: 'build/stats.html',
				gzipSize: true,
				open: false
			})
	].filter(Boolean),
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			exclude: [
				'**/*.spec.ts',
				'src/lib/paraglide/**',
				'src/lib/**/*.svelte.ts',
				'src/lib/audio/tts.ts',
				'src/lib/pwa/persist.ts',
				'src/lib/db/index.ts'
			]
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./src/tests/setup.ts']
				}
			}
		]
	}
}));
