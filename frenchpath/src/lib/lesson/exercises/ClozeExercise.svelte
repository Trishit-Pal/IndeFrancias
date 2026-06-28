<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';

	let {
		exercise,
		response = $bindable(),
		submitted,
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'cloze' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
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
			'inline-block min-w-32 rounded-lg border-2 bg-input px-2 py-1 text-center text-base text-foreground focus:outline-none';
		if (submitted && isCorrect)
			return `${base} border-green-500 text-green-900 dark:text-green-200`;
		if (submitted) return `${base} border-red-500 text-red-900 dark:text-red-200`;
		return `${base} border-primary`;
	}
</script>

<div class="space-y-3 text-lg leading-relaxed text-foreground">
	{#if exercise.hint}
		<p class="text-sm text-muted">Hint: {exercise.hint}</p>
	{/if}
	<p>
		<GlossText text={parts[0] ?? ''} {lexicon} />
		<input
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
		/>
		{#if parts[1]}
			<GlossText text={parts[1]} {lexicon} />
		{/if}
	</p>
	{#if submitted && !isCorrect}
		<p class="text-sm font-medium text-foreground">
			Correct answer: <span class="text-green-700 dark:text-green-400">{exercise.answer}</span>
		</p>
	{/if}
</div>
