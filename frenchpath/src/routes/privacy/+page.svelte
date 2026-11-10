<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	// Bump with any change to the policy text.
	const LAST_UPDATED = '2026-11-09';

	const sections: { id: string; title: () => string; body: () => string }[] = [
		{ id: 'ondevice', title: m.privacy_ondevice_title, body: m.privacy_ondevice_body },
		{ id: 'backups', title: m.privacy_backups_title, body: m.privacy_backups_body },
		{ id: 'mic', title: m.privacy_mic_title, body: m.privacy_mic_body },
		{ id: 'downloads', title: m.privacy_downloads_title, body: m.privacy_downloads_body },
		{ id: 'tts', title: m.privacy_tts_title, body: m.privacy_tts_body },
		{ id: 'hosting', title: m.privacy_hosting_title, body: m.privacy_hosting_body },
		{ id: 'delete', title: m.privacy_delete_title, body: m.privacy_delete_body },
		{ id: 'contact', title: m.privacy_contact_title, body: m.privacy_contact_body }
	];
</script>

<svelte:head><title>{m.privacy_title()} · FrenchPath</title></svelte:head>

<main class="page-shell" data-testid="privacy-page">
	<h1 class="fp-display-lg text-balance text-foreground">{m.privacy_title()}</h1>
	<p class="mt-1 text-sm text-muted">{m.privacy_updated({ date: LAST_UPDATED })}</p>

	<div class="mt-5 space-y-4">
		{#each sections as section (section.id)}
			<section class="surface-card p-4">
				<h2 class="font-semibold text-balance text-foreground">{section.title()}</h2>
				<p class="mt-2 text-sm text-foreground">{section.body()}</p>
			</section>
		{/each}
	</div>
</main>
