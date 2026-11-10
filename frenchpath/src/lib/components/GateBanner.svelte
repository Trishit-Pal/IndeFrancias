<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	let { reason }: { reason: string } = $props();
</script>

<div
	class="surface-card flex items-center gap-2 px-3 py-2 text-sm text-foreground"
	role="status"
	data-testid="gate-banner"
>
	<Icon name="lock" size={16} class="shrink-0" />
	{reason}
</div>
