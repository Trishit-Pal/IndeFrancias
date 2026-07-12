<script lang="ts">
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { network } from '$lib/stores/online.svelte';
	import { settingsRepo } from '$lib/db';
	import { countDue } from '$lib/srs/queue';
	import { shouldNotify, revisionNotificationBody } from '$lib/pwa/revisionNotify';
	import { applyTheme, watchSystemTheme } from '$lib/theme/apply';
	import { configureTts } from '$lib/audio/tts';
	import { isNativePlatform, isDesktopPlatform } from '$lib/platform';
	import { initNativeShell } from '$lib/platform/shell';
	import { showRevisionNotification } from '$lib/platform/notifications';
	// Self-hosted fonts — served from origin to satisfy the strict
	// `default-src 'self'` CSP and keep the app fully offline-capable.
	// (Loading them from Google's CDN is blocked by CSP and breaks offline.)
	import '@fontsource-variable/fraunces/standard.css';
	import '@fontsource-variable/fraunces/standard-italic.css';
	import '@fontsource-variable/manrope/wght.css';
	import '@fontsource/dm-mono/400.css';
	import '@fontsource/dm-mono/500.css';
	import '@fontsource/tiro-devanagari-hindi/400.css';
	import '@fontsource/tiro-devanagari-hindi/400-italic.css';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : '';

	const tabs = [
		{ href: '/', label: m.nav_learn, icon: '📚' },
		{ href: '/review', label: m.nav_review, icon: '🔁' },
		{ href: '/progress', label: m.nav_progress, icon: '📈' },
		{ href: '/settings', label: m.nav_settings, icon: '⚙️' }
	] as const;
	const path = $derived(page.url.pathname);

	async function syncTheme() {
		const settings = await settingsRepo.getSettings();
		applyTheme(settings.theme);
	}

	onMount(() => {
		let cleanup: (() => void) | undefined;

		async function maybeNotifyRevision() {
			if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
			const settings = await settingsRepo.getSettings();
			const due = await countDue();
			if (!shouldNotify(due, settings)) return;
			if (isNativePlatform()) {
				await showRevisionNotification(m.revision_notify_title(), revisionNotificationBody(due));
			} else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
				new Notification(m.revision_notify_title(), {
					body: revisionNotificationBody(due),
					tag: 'frenchpath-revision'
				});
			}
		}

		void (async () => {
			if (isNativePlatform()) void initNativeShell();
			// Neither the Capacitor native shell nor the Tauri desktop shell benefit
			// from the PWA service worker — both already serve the bundle locally
			// (WebView bundle / WebView2 local files ARE the offline cache), and the
			// SW's navigateFallback fights local serving. (mobile-architecture.md R3)
			if (!isNativePlatform() && !isDesktopPlatform()) {
				const { registerSW } = await import('virtual:pwa-register');
				registerSW({ immediate: true });
			}

			const settings = await settingsRepo.getSettings();
			document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
			document.documentElement.lang =
				settings.uiLanguage === 'hinglish' ? 'en' : settings.uiLanguage;
			configureTts(settings.ttsVoice, settings.audioSpeed);
			await syncTheme();
			cleanup = watchSystemTheme(() => void syncTheme());
		})();

		const onVisibility = () => void maybeNotifyRevision();
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			cleanup?.();
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});

	function tabActive(href: string): boolean {
		return href === '/' ? path === '/' : path.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
	<meta
		name="description"
		content="Offline French learning for Indian learners — A1 to A2, no account required."
	/>
	<meta property="og:title" content="FrenchPath — Learn French" />
	<meta
		property="og:description"
		content="Offline-first French PWA with Hindi/English bridges. Your progress stays on your device."
	/>
	<meta property="og:type" content="website" />
	<meta name="theme-color" content="#faf7f0" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted build-time string -->
	{@html webManifestLink}
</svelte:head>

<div class="min-h-dvh bg-background text-foreground lg:flex">
	<!-- Desktop sidebar (lg+) -->
	<aside
		class="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card"
		aria-label="Primary"
	>
		<div class="flex items-center gap-3 border-b border-border px-5 py-5">
			<img src="/icon.svg" alt="" class="h-9 w-9 rounded-lg shadow-sm" />
			<div>
				<p class="font-bold text-foreground">FrenchPath</p>
				<p class="text-xs text-muted">{m.home_subtitle()}</p>
			</div>
		</div>
		<nav class="flex-1 px-3 py-4">
			<ul class="space-y-1">
				{#each tabs as tab (tab.href)}
					{@const active = tabActive(tab.href)}
					<li>
						<a
							href={resolve(tab.href)}
							class="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary {active
								? 'bg-blue-50 text-primary dark:bg-blue-950'
								: 'text-muted hover:bg-subtle hover:text-foreground'}"
							aria-current={active ? 'page' : undefined}
						>
							<span class="text-lg" aria-hidden="true">{tab.icon}</span>
							{tab.label()}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>

	<div class="flex min-h-dvh flex-1 flex-col lg:ml-64">
		{#if !network.online}
			<div
				class="bg-amber-500 px-4 py-1 text-center text-xs font-medium text-amber-950 dark:bg-amber-600 dark:text-amber-50"
				role="status"
				data-testid="offline-banner"
			>
				{m.offline_banner()}
			</div>
		{/if}

		<div class="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6">
			{@render children()}
		</div>

		<!-- Mobile bottom nav (< lg) -->
		<nav
			class="fp-mobile-nav fixed inset-x-0 bottom-0 z-10 border-t border-border bg-nav pb-[env(safe-area-inset-bottom)] lg:hidden"
			aria-label="Primary"
		>
			<ul class="mx-auto flex max-w-xl">
				{#each tabs as tab (tab.href)}
					{@const active = tabActive(tab.href)}
					<li class="flex-1">
						<a
							href={resolve(tab.href)}
							class="flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary {active
								? 'text-primary'
								: 'text-muted'}"
							aria-current={active ? 'page' : undefined}
						>
							<span class="text-lg" aria-hidden="true">{tab.icon}</span>
							{tab.label()}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</div>
