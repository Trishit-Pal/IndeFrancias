<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';
	import { shuffledIndices } from '$lib/utils/seededShuffle';

	let {
		exercise,
		response = $bindable(),
		submitted,
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'reading' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
	} = $props();

	const selected = $derived(response?.type === 'reading' ? response.selectedIndices : []);

	// One shuffled display order per question (see McqExercise); every index
	// used for selection and grading is still the authored index.
	const orderNonce = Math.random().toString(36).slice(2);
	const orders = $derived(
		exercise.questions.map((q, qi) =>
			shuffledIndices(q.options.length, `${orderNonce}:${exercise.id}:${qi}`)
		)
	);

	function choose(qIndex: number, optionIndex: number) {
		if (submitted) return;
		const next = [...selected];
		while (next.length <= qIndex) next.push(-1);
		next[qIndex] = optionIndex;
		const complete = exercise.questions.every((_, i) => (next[i] ?? -1) >= 0);
		response = complete ? { type: 'reading', selectedIndices: next } : null;
	}

	function optionClass(qIndex: number, optionIndex: number): string {
		const base =
			'min-h-11 w-full rounded-xl border px-4 py-3 text-left text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
		const q = exercise.questions[qIndex]!;
		if (submitted && optionIndex === q.answerIndex) return `${base} option-correct`;
		if (submitted && selected[qIndex] === optionIndex && optionIndex !== q.answerIndex)
			return `${base} option-incorrect`;
		if (selected[qIndex] === optionIndex) return `${base} option-selected`;
		return `${base} option-default`;
	}
</script>

<article class="space-y-4">
	<div class="surface-card p-4 text-base leading-relaxed text-foreground">
		<GlossText text={exercise.passage} {lexicon} />
	</div>
	{#each exercise.questions as q, qi (qi)}
		<fieldset class="space-y-2" disabled={submitted} data-testid="reading-question">
			<legend class="mb-2 font-semibold text-foreground">
				<GlossText text={q.prompt} {lexicon} frenchOnly={false} />
			</legend>
			{#each orders[qi] ?? [] as oi (oi)}
				<button
					type="button"
					class={optionClass(qi, oi)}
					data-testid="reading-option"
					data-option-index={oi}
					onclick={() => choose(qi, oi)}
				>
					{q.options[oi]}
				</button>
			{/each}
		</fieldset>
	{/each}
</article>
