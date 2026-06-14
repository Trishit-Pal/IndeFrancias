<script lang="ts">
	import { onMount } from 'svelte';

	let { amount, active = true }: { amount: number; active?: boolean } = $props();
	let visible = $state(true);

	onMount(() => {
		const t = setTimeout(() => (visible = false), 1800);
		return () => clearTimeout(t);
	});
</script>

{#if active && visible && amount > 0}
	<p
		class="fp-confetti-lite pointer-events-none fixed top-1/3 left-1/2 z-50 -translate-x-1/2 text-2xl font-bold text-primary"
		role="status"
		data-testid="xp-float"
	>
		+{amount} XP
	</p>
{/if}
