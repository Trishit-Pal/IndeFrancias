<script lang="ts">
	let { tip }: { tip: string } = $props();
</script>

{#if tip}
	<aside
		class="surface-card border-primary/30 bg-blue-50/80 p-3 text-sm text-foreground dark:bg-blue-950/40"
		role="note"
		data-testid="coach-tip"
	>
		<span class="font-semibold text-primary">Coach tip:</span>
		{tip}
	</aside>
{/if}
