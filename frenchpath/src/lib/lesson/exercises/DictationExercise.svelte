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
		exercise: Extract<Exercise, { type: 'dictation' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
	} = $props();

	const value = $derived(response?.type === 'dictation' ? response.text : '');
	const isCorrect = $derived(submitted && response ? gradeExercise(exercise, response) : false);
	const canSpeak = ttsAvailable();
	let playing = $state(false);
	let showShadow = $state(false);

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
	<p class="text-lg font-semibold text-foreground">{m.dictation_prompt()}</p>
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
	{:else}
		<p class="rounded-lg bg-subtle px-3 py-2 text-foreground">
			<GlossText text={exercise.audioText} {lexicon} />
		</p>
	{/if}
	{#if exercise.hint}<p class="text-sm text-muted">{m.cloze_hint({ hint: exercise.hint })}</p>{/if}
	<input
		type="text"
		class={answerInputClass(submitted, isCorrect)}
		{value}
		disabled={submitted}
		aria-label={m.dictation_fill_blank()}
		data-testid="text-answer"
		autocomplete="off"
		autocapitalize="off"
		spellcheck="false"
		enterkeyhint="done"
		oninput={onInput}
	/>
	{#if submitted && !isCorrect}
		<p class="text-sm">
			{m.cloze_correct_answer()}
			<span class="text-green-700 dark:text-green-400">{exercise.answer}</span>
		</p>
	{/if}
</div>
