<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import { speakFrench, ttsAvailable } from '$lib/audio/tts';
	import { answerInputClass } from './inputClass';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';

	let {
		exercise,
		response = $bindable(),
		submitted,
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'listening' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
	} = $props();

	const value = $derived(response?.type === 'listening' ? response.text : '');
	const isCorrect = $derived(submitted && response ? gradeExercise(exercise, response) : false);

	function onInput(event: Event) {
		const text = (event.currentTarget as HTMLInputElement).value;
		response = text.trim() ? { type: 'listening', text } : null;
	}
</script>

<div class="space-y-3">
	<p class="text-lg font-semibold text-foreground">
		Listen to the passage, then type the key sentence
	</p>
	{#if ttsAvailable()}
		<button
			type="button"
			class="rounded-full border border-border px-4 py-2 hover:border-primary"
			onclick={() => speakFrench(exercise.audioText)}
		>
			🔊 Play passage
		</button>
	{/if}
	{#if exercise.passage}
		<details class="text-sm text-muted">
			<summary>Show transcript after listening</summary>
			<p class="mt-2 text-foreground">
				<GlossText text={exercise.passage} {lexicon} />
			</p>
		</details>
	{/if}
	<input
		type="text"
		class={answerInputClass(submitted, isCorrect)}
		{value}
		disabled={submitted}
		aria-label="Type what you heard"
		data-testid="text-answer"
		autocomplete="off"
		oninput={onInput}
	/>
	{#if submitted && !isCorrect}
		<p class="text-sm">
			Correct: <span class="text-green-700 dark:text-green-400">{exercise.answer}</span>
		</p>
	{/if}
</div>
