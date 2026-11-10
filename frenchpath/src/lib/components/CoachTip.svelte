<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	let { tip }: { tip: string } = $props();
</script>

{#if tip}
	<aside
		class="surface-card p-3 text-sm text-foreground"
		style="background: color-mix(in srgb, var(--fp-seine) 8%, var(--fp-paper)); border-color: color-mix(in srgb, var(--fp-seine) 35%, var(--fp-paper));"
		role="note"
		data-testid="coach-tip"
	>
		<span class="font-semibold" style="color: var(--fp-seine)">{m.rubric_hint_label()}</span>
		{tip}
	</aside>
{/if}
