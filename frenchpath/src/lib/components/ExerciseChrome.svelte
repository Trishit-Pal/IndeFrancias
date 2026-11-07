<script lang="ts">
	import type { Exercise, Unit } from '$lib/content/schema';
	import * as m from '$lib/paraglide/messages';
	import Icon from './Icon.svelte';

	let {
		unit,
		exercise,
		hintsRemaining,
		onHint,
		hintDisabled
	}: {
		unit: Unit;
		exercise: Exercise;
		hintsRemaining: number;
		onHint: () => void;
		hintDisabled: boolean;
	} = $props();

	// Exercise type → learner-facing label (never the raw schema name).
	const TYPE_LABELS: Record<Exercise['type'], () => string> = {
		mcq: m.exercise_type_mcq,
		cloze: m.exercise_type_cloze,
		matching: m.exercise_type_matching,
		dictation: m.exercise_type_dictation,
		translation: m.exercise_type_translation,
		reorder: m.exercise_type_reorder,
		conjugation: m.exercise_type_conjugation,
		gender: m.exercise_type_gender,
		reading: m.exercise_type_reading,
		listening: m.exercise_type_listening,
		productive: m.exercise_type_productive,
		speak: m.exercise_type_speak
	};
	const skillLabel = $derived(TYPE_LABELS[exercise.type]());
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
	<div class="flex flex-wrap items-center gap-2">
		<span class="fp-skill-chip rounded-full px-2 py-0.5 text-xs font-semibold uppercase">
			{unit.cefrLevel}
		</span>
		<span class="fp-eyebrow rounded-full bg-subtle px-2 py-0.5 normal-case">{skillLabel}</span>
	</div>
	{#if hintsRemaining > 0}
		<button
			type="button"
			class="btn-secondary min-h-11 text-sm"
			disabled={hintDisabled}
			data-testid="lesson-hint"
			onclick={onHint}
		>
			<Icon name="hint" size={16} />
			{m.hint_button()} ({m.hint_remaining({ count: String(hintsRemaining) })})
		</button>
	{/if}
</div>
