<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';
	import { shuffledIndices } from '$lib/utils/seededShuffle';

	let {
		exercise,
		response = $bindable(),
		submitted,
		hiddenMcqIndices = [],
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'mcq' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		hiddenMcqIndices?: number[];
		lexicon: Lexicon;
	} = $props();

	const selected = $derived(response?.type === 'mcq' ? response.selectedIndex : -1);

	// Options are drawn in a shuffled order so the authored first option (the
	// correct one in most packs) is not always on top. The nonce is fixed for
	// this mount, so the order holds while the learner answers and changes on a
	// replay. Every index used below is still the authored index.
	const orderNonce = Math.random().toString(36).slice(2);
	const order = $derived(shuffledIndices(exercise.options.length, `${orderNonce}:${exercise.id}`));

	function choose(i: number) {
		if (submitted) return;
		response = { type: 'mcq', selectedIndex: i };
	}

	function optionClass(i: number): string {
		const base =
			'min-h-11 w-full rounded-xl border px-4 py-3 text-left text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ring-offset';
		if (submitted && i === exercise.answerIndex) return `${base} option-correct`;
		if (submitted && i === selected) return `${base} option-incorrect`;
		if (i === selected) return `${base} option-selected`;
		return `${base} option-default`;
	}
</script>

<fieldset class="space-y-3" disabled={submitted}>
	<legend class="mb-2 text-lg font-semibold text-foreground">
		<GlossText text={exercise.prompt} {lexicon} forceGlossWords={exercise.promptGlosses ?? []} />
	</legend>
	{#each order as i (i)}
		{#if !hiddenMcqIndices.includes(i)}
			<button
				type="button"
				class={optionClass(i)}
				aria-pressed={i === selected}
				data-testid="mcq-option"
				data-option-index={i}
				onclick={() => choose(i)}
			>
				{exercise.options[i]}
			</button>
		{/if}
	{/each}
</fieldset>
