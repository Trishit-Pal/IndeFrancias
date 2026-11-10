<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let { version }: { version: string } = $props();

	// The one place the feedback destination is defined.
	const FEEDBACK_URL = 'https://github.com/Trishit-Pal/IndeFrancias/issues';

	// Licences read from each package's LICENSE / package.json (Nov 2026). Proper names, not translated.
	// ponytail: hand-maintained list of the notable components; generate from the lockfile if it grows.
	const credits: { name: string; licence: string; notice?: string }[] = [
		{
			name: 'Fraunces (font)',
			licence: 'SIL OFL 1.1',
			notice: 'Copyright 2020 The Fraunces Project Authors'
		},
		{
			name: 'Manrope (font)',
			licence: 'SIL OFL 1.1',
			notice: 'Copyright 2019 The Manrope Project Authors'
		},
		{ name: 'Vosk French small model 0.22 (vosk-model-small-fr-0.22)', licence: 'Apache 2.0' },
		{ name: 'vosk-browser', licence: 'Apache 2.0' },
		{ name: 'fsrs-browser', licence: 'BSD 3-Clause', notice: 'Copyright 2023 Alex Nguyen' },
		{ name: 'ts-fsrs', licence: 'MIT', notice: 'Copyright (c) 2026 Open Spaced Repetition' },
		{ name: 'Svelte and SvelteKit', licence: 'MIT' },
		{ name: 'bits-ui, zod, Capacitor', licence: 'MIT' },
		{ name: 'idb', licence: 'ISC' }
	];
</script>

<section class="surface-card p-4" data-testid="about-section">
	<h2 class="font-semibold text-balance text-foreground">{m.about_title()}</h2>
	<p class="mt-2 text-sm text-muted" data-testid="app-version">{m.about_version({ version })}</p>
	<ul class="mt-2 text-sm text-foreground">
		<li>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- external link; a navigation is not governed by connect-src -->
			<a
				href={FEEDBACK_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex min-h-11 items-center underline"
				data-testid="feedback-link">{m.about_feedback()}</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</li>
		<li>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- static prerendered page -->
			<a
				href="/privacy"
				class="inline-flex min-h-11 items-center underline"
				data-testid="privacy-link">{m.about_privacy()}</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</li>
	</ul>
	<details class="mt-1" data-testid="licenses">
		<summary class="flex min-h-11 cursor-pointer items-center text-sm text-foreground underline">
			{m.about_licenses()}
		</summary>
		<p class="mt-1 text-xs text-muted">{m.about_licenses_intro()}</p>
		<ul class="mt-2 space-y-2 text-sm text-foreground">
			{#each credits as credit (credit.name)}
				<li>
					{credit.name} — {credit.licence}
					{#if credit.notice}<span class="block text-xs text-muted">{credit.notice}</span>{/if}
				</li>
			{/each}
		</ul>
	</details>
</section>
