<script lang="ts">
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import { pwaInfo } from 'virtual:pwa-info';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/Icon.svelte';
	import InfoBanner from '$lib/components/InfoBanner.svelte';
	import UpdateToast from '$lib/components/UpdateToast.svelte';
	import type { IconName } from '$lib/components/icons';
	import { LANGUAGES } from '$lib/i18n/languages';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { network } from '$lib/stores/online.svelte';
	import {
		settingsRepo,
		onDatabaseNotice,
		DatabaseNewerError,
		type DatabaseNoticeKind
	} from '$lib/db';
	import { countDue } from '$lib/srs/queue';
	import {
		shouldNotify,
		revisionNotificationBody,
		readLastNotifiedDay,
		writeLastNotifiedDay,
		showLocalNotification
	} from '$lib/pwa/revisionNotify';
	import { todayKey } from '$lib/utils/date';
	import { applyTheme, isDarkTheme, watchSystemTheme } from '$lib/theme/apply';
	import { configureTts } from '$lib/audio/tts';
	import { isNativePlatform, isDesktopPlatform } from '$lib/platform';
	import { initNativeShell, syncNativeStatusBar } from '$lib/platform/shell';
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

	// `as const` keeps each href a string-literal type so resolve() below
	// (which requires a known route literal) stays type-safe.
	const tabs = [
		{ href: '/', label: m.nav_learn, icon: 'learn' as IconName },
		{ href: '/review', label: m.nav_review, icon: 'review' as IconName },
		{ href: '/progress', label: m.nav_progress, icon: 'progress' as IconName },
		{ href: '/settings', label: m.nav_settings, icon: 'settings' as IconName }
	] as const;
	const path = $derived(page.url.pathname);

	// Cross-fade between routes. Skipped under reduced motion (in-app setting OR
	// OS preference), and a no-op when the browser lacks View Transitions
	// (Safari < 18, older WebViews).
	onNavigate((navigation) => {
		if (document.documentElement.classList.contains('reduce-motion')) return;
		if (prefersReducedMotion.current) return;
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Route changes: move focus to the content region and announce the new page
	// title, so keyboard and screen-reader users don't land on a stale spot.
	let routeAnnouncement = $state('');
	afterNavigate((navigation) => {
		if (!navigation.from) return; // initial load: leave the browser's focus alone
		document.getElementById('main')?.focus({ preventScroll: true });
		routeAnnouncement = document.title;
	});

	async function syncTheme() {
		const settings = await settingsRepo.getSettings();
		applyTheme(settings.theme);
		if (isNativePlatform()) void syncNativeStatusBar(isDarkTheme(settings.theme));
	}

	// Any promise that rejected with nobody awaiting it (a write, a fetch, a library). Shown, never
	// auto-reloaded. No preventDefault(): the browser keeps logging it for dev tooling.
	let unexpectedError = $state(false);

	// The database is newer than this tab's code (reload to fix), or an upgrade is waiting on
	// another tab. Never reloads by itself: only the button does.
	let dbNotice = $state<Exclude<DatabaseNoticeKind, 'ready'> | null>(null);

	// A new service worker is waiting. The learner decides when to reload (SPEC invariant 6).
	let updateReady = $state(false);
	let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
	let updateRequested = false; // this tab clicked Update
	let workerSwapped = false; // the new worker already took over (Update clicked in another tab)

	function applyUpdate() {
		updateRequested = true;
		if (workerSwapped) location.reload();
		else void updateSW?.(true);
	}

	onMount(() => {
		let cleanup: (() => void) | undefined;

		let notifying = false; // overlapping visibilitychange events must not double-notify

		async function maybeNotifyRevision() {
			if (notifying) return;
			if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
			notifying = true;
			try {
				const settings = await settingsRepo.getSettings();
				const due = await countDue();
				const today = todayKey();
				if (!shouldNotify(due, settings, readLastNotifiedDay(), today)) return;
				let shown = false; // nothing shown (no permission): do not use up today's reminder
				if (isNativePlatform()) {
					await showRevisionNotification(m.revision_notify_title(), revisionNotificationBody(due));
					shown = true;
				} else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
					shown = await showLocalNotification(m.revision_notify_title(), {
						body: revisionNotificationBody(due),
						tag: 'frenchpath-revision'
					});
				}
				if (shown) writeLastNotifiedDay(today);
			} catch {
				// ponytail: a reminder is a nicety; its failure must never raise the global error banner.
			} finally {
				notifying = false;
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
				updateSW = registerSW({
					immediate: true,
					onNeedRefresh: () => (updateReady = true),
					// Replaces the plugin's default window.location.reload() on takeover, which
					// would also reload every other open tab mid-lesson.
					onNeedReload: () => {
						workerSwapped = true;
						if (updateRequested) location.reload();
					}
				});
			}

			const settings = await settingsRepo.getSettings();
			document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
			// The language actually rendered, not the saved setting: on a first visit Paraglide
			// renders the browser's preferred language while the saved setting is still `en`.
			document.documentElement.lang = LANGUAGES[getLocale()].htmlLang;
			configureTts(settings.ttsVoice, settings.audioSpeed);
			await syncTheme();
			cleanup = watchSystemTheme(() => void syncTheme());
		})();

		const onVisibility = () => void maybeNotifyRevision();
		document.addEventListener('visibilitychange', onVisibility);
		// A DatabaseNewerError already has its own, more useful banner.
		const onUnhandledRejection = (event: PromiseRejectionEvent) => {
			if (event.reason instanceof DatabaseNewerError) return;
			unexpectedError = true;
		};
		window.addEventListener('unhandledrejection', onUnhandledRejection);
		const offDatabaseNotice = onDatabaseNotice((kind) => {
			// 'ready' only ends the wait it announced; a 'newer' banner still needs its reload.
			if (kind !== 'ready') dbNotice = kind;
			else if (dbNotice === 'blocked') dbNotice = null;
		});

		return () => {
			cleanup?.();
			offDatabaseNotice();
			window.removeEventListener('unhandledrejection', onUnhandledRejection);
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
		content="Offline-first French learning for Indian learners (A1–C1) with spaced repetition. No account needed."
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
	<a
		href="#main"
		class="btn-secondary sr-only bg-card focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
		>{m.skip_to_content()}</a
	>
	<div role="status" aria-live="polite" class="sr-only">{routeAnnouncement}</div>
	<!-- Desktop sidebar (lg+) -->
	<aside
		class="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card"
		aria-label="Primary"
	>
		<div class="flex items-center gap-3 border-b border-border px-5 py-5">
			<img src="/icon.svg" alt="" class="h-9 w-9 rounded-lg shadow-sm" />
			<div>
				<p class="fp-wordmark text-foreground">FrenchPath</p>
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
							class="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary {active
								? 'bg-jaipur-light text-primary'
								: 'text-muted hover:bg-subtle hover:text-foreground'}"
							aria-current={active ? 'page' : undefined}
						>
							<Icon name={tab.icon} size={19} />
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
				class="border-b border-saffron/40 bg-saffron/15 px-4 py-1.5 text-center text-xs font-medium text-saffron-text"
				style="padding-top: calc(0.375rem + env(safe-area-inset-top))"
				role="status"
				data-testid="offline-banner"
			>
				{m.offline_banner()}
			</div>
		{/if}

		{#if dbNotice}
			<div
				class="mx-auto w-full max-w-xl px-4 pt-3"
				role={dbNotice === 'newer' ? 'alert' : 'status'}
				data-testid="db-update-banner"
			>
				<InfoBanner variant="info">
					<p>{dbNotice === 'newer' ? m.db_update_newer() : m.db_update_blocked()}</p>
					{#if dbNotice === 'newer'}
						<div class="mt-3">
							<button
								type="button"
								class="btn-primary text-sm"
								data-testid="db-update-reload"
								onclick={() => location.reload()}
							>
								{m.error_reload()}
							</button>
						</div>
					{/if}
				</InfoBanner>
			</div>
		{/if}

		{#if unexpectedError}
			<div class="mx-auto w-full max-w-xl px-4 pt-3">
				<InfoBanner variant="error" role="alert">
					<p>{m.unexpected_error_banner()}</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<button type="button" class="btn-primary text-sm" onclick={() => location.reload()}>
							{m.error_reload()}
						</button>
						<button
							type="button"
							class="btn-secondary text-sm"
							onclick={() => (unexpectedError = false)}
						>
							{m.save_failed_dismiss()}
						</button>
					</div>
				</InfoBanner>
			</div>
		{/if}

		<div
			id="main"
			tabindex="-1"
			class="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none lg:pb-6"
			style="padding-top: env(safe-area-inset-top)"
		>
			{@render children()}
		</div>

		{#if updateReady}
			<UpdateToast onupdate={applyUpdate} onlater={() => (updateReady = false)} />
		{/if}

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
							class="flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary {active
								? 'text-primary'
								: 'text-muted'}"
							aria-current={active ? 'page' : undefined}
						>
							<Icon name={tab.icon} size={21} />
							{tab.label()}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</div>

<style>
	.fp-wordmark {
		font-family: var(--fp-font-display);
		font-weight: 560;
		font-size: 1.05rem;
		line-height: 1.1;
	}
</style>
