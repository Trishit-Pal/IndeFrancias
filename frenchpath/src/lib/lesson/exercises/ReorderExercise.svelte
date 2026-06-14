<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';
	import { flip } from 'svelte/animate';

	let {
		exercise,
		response = $bindable(),
		submitted,
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'reorder' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
	} = $props();

	function shuffle<T>(arr: readonly T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	const bank = $derived(shuffle(exercise.words.map((word, id) => ({ id, word }))));
	let placed = $state<number[]>([]);
	const available = $derived(bank.filter((t) => !placed.includes(t.id)));

	function sync() {
		response =
			placed.length === exercise.words.length
				? { type: 'reorder', words: placed.map((id) => exercise.words[id]) }
				: null;
	}

	function add(id: number) {
		if (submitted) return;
		placed = [...placed, id];
		sync();
	}

	function removeAt(pos: number) {
		if (submitted) return;
		placed = placed.filter((_, i) => i !== pos);
		sync();
	}
</script>

<div class="space-y-4">
	{#if exercise.prompt}
		<p class="text-lg font-semibold text-foreground">
			<GlossText text={exercise.prompt} {lexicon} frenchOnly={false} />
		</p>
	{/if}
	<p class="text-sm text-muted">Tap the words to build the sentence:</p>

	<div
		class="flex min-h-12 flex-wrap gap-2 rounded-lg border border-border bg-subtle p-2"
		data-testid="reorder-answer"
	>
		{#each placed as id, pos (id)}
			<button
				animate:flip
				type="button"
				class="rounded-lg bg-blue-100 px-3 py-1 text-blue-900 dark:bg-blue-950 dark:text-blue-200"
				onclick={() => removeAt(pos)}>{exercise.words[id]}</button
			>
		{/each}
	</div>

	<div class="flex flex-wrap gap-2">
		{#each available as token (token.id)}
			<button
				animate:flip
				type="button"
				class="rounded-lg border border-border bg-card px-3 py-1 hover:border-primary"
				data-testid="reorder-word"
				onclick={() => add(token.id)}>{token.word}</button
			>
		{/each}
	</div>

	{#if submitted && response && !gradeExercise(exercise, response)}
		<p class="text-sm">
			Correct: <span class="text-green-700 dark:text-green-400">{exercise.words.join(' ')}</span>
		</p>
	{/if}
</div>
