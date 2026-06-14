<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import { answerInputClass } from './inputClass';

	let {
		exercise,
		response = $bindable(),
		submitted
	}: {
		exercise: Extract<Exercise, { type: 'translation' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
	} = $props();

	const value = $derived(response?.type === 'translation' ? response.text : '');
	const isCorrect = $derived(submitted && response ? gradeExercise(exercise, response) : false);
	const directionLabel = $derived(
		exercise.direction === 'fr-en' ? 'Translate to English' : 'Translate to French'
	);

	function onInput(event: Event) {
		const text = (event.currentTarget as HTMLInputElement).value;
		response = text.trim() ? { type: 'translation', text } : null;
	}
</script>

<div class="space-y-3">
	<p class="text-sm font-semibold tracking-wide text-muted uppercase">{directionLabel}</p>
	<p class="text-xl text-foreground">{exercise.prompt}</p>
	<input
		type="text"
		class={answerInputClass(submitted, isCorrect)}
		{value}
		disabled={submitted}
		aria-label="Your translation"
		data-testid="text-answer"
		autocomplete="off"
		oninput={onInput}
	/>
	{#if submitted && !isCorrect}
		<p class="text-sm">
			Suggested answer: <span class="text-green-700 dark:text-green-400">{exercise.answer}</span>
		</p>
	{/if}
</div>
