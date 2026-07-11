<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import { speakFrench, ttsAvailable } from '$lib/audio/tts';
	import { answerInputClass } from './inputClass';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';
	import ShadowingPlayer from '$lib/lesson/ShadowingPlayer.svelte';
	import * as m from '$lib/paraglide/messages';

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
	let showShadow = $state(false);

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
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="rounded-full border border-border px-4 py-2 hover:border-primary"
				onclick={() => speakFrench(exercise.audioText)}
			>
				🔊 Play passage
			</button>
			<button
				type="button"
				class="min-h-11 rounded-full border border-border px-4 py-2 hover:border-primary"
				aria-pressed={showShadow}
				onclick={() => (showShadow = !showShadow)}
				data-testid="shadow-toggle"
			>
				{m.shadow_start()}
			</button>
		</div>
		{#if showShadow}
			<ShadowingPlayer audioText={exercise.audioText} />
		{/if}
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
		enterkeyhint="done"
		oninput={onInput}
	/>
	{#if submitted && !isCorrect}
		<p class="text-sm">
			Correct: <span class="text-green-700 dark:text-green-400">{exercise.answer}</span>
		</p>
	{/if}
</div>
