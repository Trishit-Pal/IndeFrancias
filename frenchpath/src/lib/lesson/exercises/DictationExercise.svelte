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
	<p class="text-lg font-semibold text-slate-900">Listen and type what you hear</p>
	{#if canSpeak}
		<button
			type="button"
			class="rounded-full border border-slate-300 px-4 py-2 hover:border-blue-400"
			onclick={() => speakFrench(exercise.audioText)}>🔊 Play</button
		>
	{:else}
		<!-- No speech synthesis: show the text so the exercise stays doable. -->
		<p class="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{exercise.audioText}</p>
	{/if}
	{#if exercise.hint}<p class="text-sm text-slate-500">Hint: {exercise.hint}</p>{/if}
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
		<p class="text-sm">Correct answer: <span class="text-green-700">{exercise.answer}</span></p>
	{/if}
</div>
