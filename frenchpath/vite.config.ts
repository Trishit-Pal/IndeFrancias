import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
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
				// Precache the whole app shell so the SPA loads with zero network.
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2,json,html}'],
				// Serve the precached home shell for any uncached navigation (e.g. the
				// dynamic /learn/[unitId] route) so the client router can take over offline.
				navigateFallback: '/',
				navigateFallbackDenylist: [/^\/manifest\.webmanifest$/],
				// Native-speaker audio (added later) is large + immutable -> cache-first.
				runtimeCaching: [
					{
						urlPattern: ({ url }) => url.pathname.startsWith('/audio/'),
						handler: 'CacheFirst',
						options: {
							cacheName: 'frenchpath-audio',
							expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 },
							cacheableResponse: { statuses: [0, 200] }
						}
					}
				]
			},
			// Offline is verified against the production build (`npm run preview`),
			// which is also what Playwright drives. Keeping the SW off during
			// `vite dev` avoids known dev-mode navigation-fallback pitfalls.
			devOptions: { enabled: false }
		})
	],
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			// Measure the business/data logic. Thin browser wrappers (tts, persist,
			// online store) and generated code are covered by E2E / excluded.
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
});
