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
		exercise: Extract<Exercise, { type: 'dictation' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
	} = $props();

	const value = $derived(response?.type === 'dictation' ? response.text : '');
	const isCorrect = $derived(submitted && response ? gradeExercise(exercise, response) : false);
	const canSpeak = ttsAvailable();
	let playing = $state(false);

	function onInput(event: Event) {
		const text = (event.currentTarget as HTMLInputElement).value;
		response = text.trim() ? { type: 'dictation', text } : null;
	}

	function play() {
		playing = true;
		speakFrench(exercise.audioText);
		setTimeout(() => (playing = false), 1200);
	}
</script>

<div class="space-y-3">
	<p class="text-lg font-semibold text-foreground">Listen and type what you hear</p>
	{#if canSpeak}
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="rounded-full border border-border px-4 py-2 hover:border-primary {playing
					? 'fp-tts-pulse'
					: ''}"
				onclick={play}
				data-testid="dictation-play"
			>
				🔊 Play
			</button>
			<div
				class="fp-dictation-wave flex h-8 items-end gap-0.5 {playing
					? 'fp-dictation-wave--active'
					: ''}"
				aria-hidden="true"
			>
				{#each [0.4, 0.7, 1, 0.6, 0.85] as h, i (i)}
					<span class="fp-dictation-bar" style="--fp-bar: {h}"></span>
				{/each}
			</div>
		</div>
	{:else}
		<p class="rounded-lg bg-subtle px-3 py-2 text-foreground">
			<GlossText text={exercise.audioText} {lexicon} />
		</p>
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
