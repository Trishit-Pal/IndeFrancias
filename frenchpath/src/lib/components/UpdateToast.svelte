<!-- UpdateToast.svelte — a new app version is waiting. Non-blocking and never automatic:
     the learner chooses when to reload (SPEC invariant 6). -->
<script lang="ts">
	import InfoBanner from '$lib/components/InfoBanner.svelte';
	import * as m from '$lib/paraglide/messages';

	let { onupdate, onlater }: { onupdate: () => void; onlater: () => void } = $props();
</script>

<div
	class="fp-update-toast fixed inset-x-0 z-20 mx-auto w-full max-w-md px-4 lg:left-64"
	role="status"
	aria-live="polite"
	data-testid="update-toast"
>
	<InfoBanner variant="info" class="fp-update-toast__panel">
		<p>{m.update_ready()}</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<button type="button" class="btn-primary text-sm" onclick={onupdate}>
				{m.update_now()}
			</button>
			<button type="button" class="btn-secondary text-sm" onclick={onlater}>
				{m.update_later()}
			</button>
		</div>
	</InfoBanner>
</div>

<style>
	/* Sits above the mobile bottom nav; on lg+ there is no bottom nav. */
	.fp-update-toast {
		bottom: calc(5rem + env(safe-area-inset-bottom));
	}
	@media (min-width: 64rem) {
		.fp-update-toast {
			bottom: 1.5rem;
		}
	}
	.fp-update-toast :global(.fp-update-toast__panel) {
		box-shadow: var(--fp-elevation-2);
	}
</style>
