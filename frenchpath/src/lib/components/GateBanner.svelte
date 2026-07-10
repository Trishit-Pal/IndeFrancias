<script lang="ts">
	let { reason }: { reason: string } = $props();
</script>

<div class="surface-card px-3 py-2 text-sm text-foreground" role="status" data-testid="gate-banner">
	🔒 {reason}
</div>
