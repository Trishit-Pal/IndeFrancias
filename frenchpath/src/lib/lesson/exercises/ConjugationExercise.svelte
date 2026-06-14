<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import { answerInputClass } from './inputClass';

	let {
		exercise,
		response = $bindable(),
		submitted
	}: {
		exercise: Extract<Exercise, { type: 'conjugation' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
	} = $props();

	const value = $derived(response?.type === 'conjugation' ? response.text : '');
	const isCorrect = $derived(submitted && response ? gradeExercise(exercise, response) : false);

	function onInput(event: Event) {
		const text = (event.currentTarget as HTMLInputElement).value;
		response = text.trim() ? { type: 'conjugation', text } : null;
	}
</script>

<div class="space-y-3">
	<p class="text-lg font-semibold text-foreground">
		{exercise.prompt ?? `Conjugate « ${exercise.verb} »`}
	</p>
	<p class="text-xl text-foreground">
		<span class="text-muted">{exercise.pronoun}</span>
		<input
			type="text"
			class="ml-2 inline-block w-40 {answerInputClass(submitted, isCorrect)}"
			{value}
			disabled={submitted}
			aria-label={`Conjugated form of ${exercise.verb}`}
			data-testid="text-answer"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			oninput={onInput}
		/>
	</p>
	{#if submitted && !isCorrect}
		<p class="text-sm">
			Correct form: <span class="text-green-700 dark:text-green-400">{exercise.answer}</span>
		</p>
	{/if}
</div>
