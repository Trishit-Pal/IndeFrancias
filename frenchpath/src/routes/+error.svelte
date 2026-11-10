<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import InfoBanner from '$lib/components/InfoBanner.svelte';
	import * as m from '$lib/paraglide/messages';

	// Generic copy only: page.error.message can carry internals, so it is never rendered.
	const notFound = $derived(page.status === 404);
</script>

<svelte:head
	><title>{notFound ? m.error_not_found_title() : m.error_title()} · FrenchPath</title></svelte:head
>

<main class="page-shell" data-testid="error-page">
	<h1 class="fp-display-md text-balance text-foreground">
		{notFound ? m.error_not_found_title() : m.error_title()}
	</h1>
	<InfoBanner variant="error" role="alert" class="mt-4">
		<p>{notFound ? m.error_not_found_body() : m.error_body()}</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<button type="button" class="btn-primary text-sm" onclick={() => location.reload()}>
				{m.error_reload()}
			</button>
			<a class="btn-secondary inline-block text-sm" href={resolve('/')}>{m.error_home()}</a>
		</div>
	</InfoBanner>
</main>
