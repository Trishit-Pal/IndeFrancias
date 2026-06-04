<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';

	let {
		exercise,
		response = $bindable(),
		submitted
	}: {
		exercise: Extract<Exercise, { type: 'cloze' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
	} = $props();

	const parts = $derived(exercise.text.split('{{}}'));
	const value = $derived(response?.type === 'cloze' ? response.text : '');
	const isCorrect = $derived(submitted && response ? gradeExercise(exercise, response) : false);

	function onInput(event: Event) {
		const text = (event.currentTarget as HTMLInputElement).value;
		response = text.trim() ? { type: 'cloze', text } : null;
	}

	function inputClass(): string {
		const base =
			'inline-block min-w-32 rounded-lg border-b-2 bg-slate-50 px-2 py-1 text-center text-base focus:outline-none';
		if (submitted && isCorrect) return `${base} border-green-500 text-green-900`;
		if (submitted) return `${base} border-red-500 text-red-900`;
		return `${base} border-blue-400`;
	}
</script>

<div class="space-y-3 text-lg leading-relaxed text-slate-900">
	{#if exercise.hint}
		<p class="text-sm text-slate-500">Hint: {exercise.hint}</p>
	{/if}
	<p>
		{parts[0]}<input
			type="text"
			class={inputClass()}
			{value}
			disabled={submitted}
			aria-label="Fill in the blank"
			data-testid="cloze-input"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			oninput={onInput}
		/>{parts[1] ?? ''}
	</p>
	{#if submitted && !isCorrect}
		<p class="text-sm font-medium text-slate-700">
			Correct answer: <span class="text-green-700">{exercise.answer}</span>
		</p>
	{/if}
</div>
