<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import { speakFrench, ttsAvailable } from '$lib/audio/tts';
	import { answerInputClass } from './inputClass';

	let {
		exercise,
		response = $bindable(),
		submitted
	}: {
		exercise: Extract<Exercise, { type: 'dictation' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
	} = $props();

	const value = $derived(response?.type === 'dictation' ? response.text : '');
	const isCorrect = $derived(submitted && response ? gradeExercise(exercise, response) : false);
	const canSpeak = ttsAvailable();

	function onInput(event: Event) {
		const text = (event.currentTarget as HTMLInputElement).value;
		response = text.trim() ? { type: 'dictation', text } : null;
	}
</script>

<div class="space-y-3">
	<p class="text-lg font-semibold text-foreground">Listen and type what you hear</p>
	{#if canSpeak}
		<button
			type="button"
			class="rounded-full border border-border px-4 py-2 hover:border-primary"
			onclick={() => speakFrench(exercise.audioText)}>🔊 Play</button
		>
	{:else}
		<p class="rounded-lg bg-subtle px-3 py-2 text-foreground">{exercise.audioText}</p>
	{/if}
	{#if exercise.hint}<p class="text-sm text-muted">Hint: {exercise.hint}</p>{/if}
	<input
		type="text"
		class={answerInputClass(submitted, isCorrect)}
		{value}
		disabled={submitted}
		aria-label="Type what you hear"
		data-testid="text-answer"
		autocomplete="off"
		autocapitalize="off"
		spellcheck="false"
		oninput={onInput}
	/>
	{#if submitted && !isCorrect}
		<p class="text-sm">
			Correct answer: <span class="text-green-700 dark:text-green-400">{exercise.answer}</span>
		</p>
	{/if}
</div>
