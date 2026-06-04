<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';
	import McqExercise from './McqExercise.svelte';
	import ClozeExercise from './ClozeExercise.svelte';
	import MatchingExercise from './MatchingExercise.svelte';
	import DictationExercise from './DictationExercise.svelte';
	import TranslationExercise from './TranslationExercise.svelte';
	import ReorderExercise from './ReorderExercise.svelte';
	import ConjugationExercise from './ConjugationExercise.svelte';
	import GenderExercise from './GenderExercise.svelte';

	let {
		exercise,
		response = $bindable(),
		submitted
	}: {
		exercise: Exercise;
		response: ExerciseResponse | null;
		submitted: boolean;
	} = $props();
</script>

{#if exercise.type === 'mcq'}
	<McqExercise {exercise} bind:response {submitted} />
{:else if exercise.type === 'cloze'}
	<ClozeExercise {exercise} bind:response {submitted} />
{:else if exercise.type === 'matching'}
	<MatchingExercise {exercise} bind:response {submitted} />
{:else if exercise.type === 'dictation'}
	<DictationExercise {exercise} bind:response {submitted} />
{:else if exercise.type === 'translation'}
	<TranslationExercise {exercise} bind:response {submitted} />
{:else if exercise.type === 'reorder'}
	<ReorderExercise {exercise} bind:response {submitted} />
{:else if exercise.type === 'conjugation'}
	<ConjugationExercise {exercise} bind:response {submitted} />
{:else if exercise.type === 'gender'}
	<GenderExercise {exercise} bind:response {submitted} />
{/if}
