<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';
	import type { Lexicon } from '$lib/content/lexicon';
	import McqExercise from './McqExercise.svelte';
	import ClozeExercise from './ClozeExercise.svelte';
	import MatchingExercise from './MatchingExercise.svelte';
	import DictationExercise from './DictationExercise.svelte';
	import TranslationExercise from './TranslationExercise.svelte';
	import ReorderExercise from './ReorderExercise.svelte';
	import ConjugationExercise from './ConjugationExercise.svelte';
	import GenderExercise from './GenderExercise.svelte';
	import ReadingExercise from './ReadingExercise.svelte';
	import ListeningExercise from './ListeningExercise.svelte';
	import ProductiveExercise from './ProductiveExercise.svelte';

	let {
		exercise,
		response = $bindable(),
		submitted,
		hintText = null,
		hiddenMcqIndices = [],
		lexicon,
		coachNote = null
	}: {
		exercise: Exercise;
		response: ExerciseResponse | null;
		submitted: boolean;
		hintText?: string | null;
		hiddenMcqIndices?: number[];
		lexicon: Lexicon;
		coachNote?: string | null;
	} = $props();
</script>

{#if coachNote}
	<p class="mb-2 text-sm text-muted" data-testid="exercise-coach-note">💬 {coachNote}</p>
{/if}

{#if hintText}
	<p
		class="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
		data-testid="exercise-hint"
	>
		💡 {hintText}
	</p>
{/if}

{#if exercise.type === 'mcq'}
	<McqExercise {exercise} bind:response {submitted} {hiddenMcqIndices} {lexicon} />
{:else if exercise.type === 'cloze'}
	<ClozeExercise {exercise} bind:response {submitted} {lexicon} />
{:else if exercise.type === 'matching'}
	<MatchingExercise {exercise} bind:response {submitted} {lexicon} />
{:else if exercise.type === 'dictation'}
	<DictationExercise {exercise} bind:response {submitted} {lexicon} />
{:else if exercise.type === 'translation'}
	<TranslationExercise {exercise} bind:response {submitted} {lexicon} />
{:else if exercise.type === 'reorder'}
	<ReorderExercise {exercise} bind:response {submitted} {lexicon} />
{:else if exercise.type === 'conjugation'}
	<ConjugationExercise {exercise} bind:response {submitted} {lexicon} />
{:else if exercise.type === 'gender'}
	<GenderExercise {exercise} bind:response {submitted} {lexicon} />
{:else if exercise.type === 'reading'}
	<ReadingExercise {exercise} bind:response {submitted} {lexicon} />
{:else if exercise.type === 'listening'}
	<ListeningExercise {exercise} bind:response {submitted} {lexicon} />
{:else if exercise.type === 'productive'}
	<ProductiveExercise {exercise} bind:response {submitted} {lexicon} />
{/if}
