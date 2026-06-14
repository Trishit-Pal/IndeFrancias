<script lang="ts">
	import type { DifficultyTier } from '$lib/db/schema';

	let { tier }: { tier: DifficultyTier } = $props();

	const labels: Record<DifficultyTier, string> = {
		easy: 'Easy',
		regular: 'Regular',
		hard: 'Hard'
	};
	const colors: Record<DifficultyTier, string> = {
		easy: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
		regular: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
		hard: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
	};
</script>

<span
	class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {colors[tier]}"
	data-testid="tier-badge"
>
	{labels[tier]}
</span>
