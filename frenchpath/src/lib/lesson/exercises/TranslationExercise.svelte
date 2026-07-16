<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import { answerInputClass } from './inputClass';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';

	let {
		exercise,
		response = $bindable(),
		submitted,
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'translation' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
	} = $props();

	const value = $derived(response?.type === 'translation' ? response.text : '');
	const isCorrect = $derived(submitted && response ? gradeExercise(exercise, response) : false);
	const directionLabel = $derived(
		exercise.direction === 'fr-en' ? 'Translate to English' : 'Translate to French'
	);
	const promptIsFrench = $derived(exercise.direction === 'fr-en');

	function onInput(event: Event) {
		const text = (event.currentTarget as HTMLInputElement).value;
		response = text.trim() ? { type: 'translation', text } : null;
	}
</script>

<div class="space-y-3">
	<p class="text-sm font-semibold tracking-wide text-muted uppercase">{directionLabel}</p>
	<p class="text-xl text-foreground">
		<GlossText
			text={exercise.prompt}
			{lexicon}
			frenchOnly={promptIsFrench}
			forceGlossWords={exercise.promptGlosses ?? []}
		/>
	</p>
	<input
		type="text"
		class={answerInputClass(submitted, isCorrect)}
		{value}
		disabled={submitted}
		aria-label="Your translation"
		data-testid="text-answer"
		autocomplete="off"
		enterkeyhint="done"
		oninput={onInput}
	/>
	{#if submitted && !isCorrect}
		<p class="text-sm">
			Suggested answer: <span class="text-sage">{exercise.answer}</span>
		</p>
	{/if}
</div>
