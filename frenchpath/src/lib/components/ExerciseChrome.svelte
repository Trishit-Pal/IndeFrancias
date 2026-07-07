<script lang="ts">
	import type { Exercise, Unit } from '$lib/content/schema';
	import * as m from '$lib/paraglide/messages';

	let {
		unit,
		exercise,
		index,
		total,
		hintsRemaining,
		onHint,
		hintDisabled
	}: {
		unit: Unit;
		exercise: Exercise;
		index: number;
		total: number;
		hintsRemaining: number;
		onHint: () => void;
		hintDisabled: boolean;
	} = $props();

	const skillLabel = $derived(exercise.type.replace('_', ' '));
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
	<div class="flex flex-wrap items-center gap-2">
		<span class="fp-neon-border rounded-full px-2 py-0.5 text-xs font-semibold uppercase">
			{unit.cefrLevel}
		</span>
		<span class="fp-eyebrow rounded-full bg-subtle px-2 py-0.5 normal-case">{skillLabel}</span>
		<span class="fp-figure text-xs text-muted">{index + 1}/{total}</span>
	</div>
	{#if hintsRemaining > 0}
		<button
			type="button"
			class="btn-secondary min-h-11 text-sm"
			disabled={hintDisabled}
			data-testid="lesson-hint"
			onclick={onHint}
		>
			💡 {m.hint_button()} ({m.hint_remaining({ count: String(hintsRemaining) })})
		</button>
	{/if}
</div>
