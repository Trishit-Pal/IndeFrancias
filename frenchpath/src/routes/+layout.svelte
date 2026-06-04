<script lang="ts">
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { network } from '$lib/stores/online.svelte';
	import { settingsRepo } from '$lib/db';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// SvelteKit owns <head>, so inject the PWA manifest link here (the Vite
	// plugin's auto HTML transform is a no-op in SPA mode).
	const webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : '';

	const tabs = [
		{ href: '/', label: m.nav_learn, icon: '📚' },
		{ href: '/review', label: m.nav_review, icon: '🔁' },
		{ href: '/progress', label: m.nav_progress, icon: '📈' },
		{ href: '/settings', label: m.nav_settings, icon: '⚙️' }
	] as const;
	const path = $derived(page.url.pathname);

	onMount(async () => {
		const { registerSW } = await import('virtual:pwa-register');
		registerSW({ immediate: true });

		const settings = await settingsRepo.getSettings();
		document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted build-time string -->
	{@html webManifestLink}
</svelte:head>

{#if !network.online}
	<div
		class="bg-amber-500 px-4 py-1 text-center text-xs font-medium text-amber-950"
		role="status"
		data-testid="offline-banner"
	>
		{m.offline_banner()}
	</div>
{/if}

<div class="pb-20">
	{@render children()}
</div>

<nav
	class="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur"
	aria-label="Primary"
>
	<ul class="mx-auto flex max-w-xl">
		{#each tabs as tab (tab.href)}
			{@const active = tab.href === '/' ? path === '/' : path.startsWith(tab.href)}
			<li class="flex-1">
				<a
					href={resolve(tab.href)}
					class="flex flex-col items-center gap-0.5 py-2 text-xs font-medium {active
						? 'text-blue-600'
						: 'text-slate-500'}"
					aria-current={active ? 'page' : undefined}
				>
					<span class="text-lg" aria-hidden="true">{tab.icon}</span>
					{tab.label()}
				</a>
			</li>
		{/each}
	</ul>
</nav>
