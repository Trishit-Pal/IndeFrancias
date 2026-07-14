<script lang="ts">
	import type { DifficultyTier } from '$lib/db/schema';

	let { tier }: { tier: DifficultyTier } = $props();

	const labels: Record<DifficultyTier, string> = {
		easy: 'Easy',
		regular: 'Regular',
		hard: 'Hard'
	};
	// tint = the difficulty's accent token; the pill mixes it into the surface
	// so it stays legible in both themes (see scoped styles).
	const tint: Record<DifficultyTier, string> = {
		easy: 'var(--fp-sage)',
		regular: 'var(--fp-seine)',
		hard: 'var(--fp-terracotta)'
	};
</script>

<span
	class="fp-tier-badge inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
	style="--tier: {tint[tier]}"
	data-testid="tier-badge"
>
	{labels[tier]}
</span>

<style>
	.fp-tier-badge {
		background: color-mix(in srgb, var(--tier) 18%, var(--fp-paper));
		color: color-mix(in srgb, var(--tier) 72%, var(--fp-ink));
	}
</style>
