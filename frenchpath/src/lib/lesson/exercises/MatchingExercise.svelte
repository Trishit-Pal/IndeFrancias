<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';

	let {
		exercise,
		// eslint-disable-next-line no-useless-assignment -- write-only $bindable prop
		response = $bindable(),
		submitted,
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'matching' }>;
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

	const rights = $derived(shuffle(exercise.pairs.map((p) => p.right)));
	let choices = $state<Record<string, string>>({});

	function update() {
		const pairs = exercise.pairs.map((p) => ({ left: p.left, right: choices[p.left] ?? '' }));
		const allChosen = pairs.every((p) => p.right !== '');
		response = allChosen ? { type: 'matching', pairs } : null;
	}

	function rowCorrect(left: string): boolean {
		return choices[left] === exercise.pairs.find((p) => p.left === left)?.right;
	}

	function selectClass(left: string): string {
		const base = 'field-input flex-1 py-2';
		if (submitted && rowCorrect(left)) return `${base} option-correct`;
		if (submitted) return `${base} option-incorrect`;
		return base;
	}
</script>

<div class="space-y-3">
	{#if exercise.prompt}
		<p class="text-lg font-semibold text-foreground">
			<GlossText text={exercise.prompt} {lexicon} frenchOnly={false} />
		</p>
	{/if}
	<ul class="space-y-2">
		{#each exercise.pairs as pair (pair.left)}
			<li class="flex items-center gap-3">
				<span class="w-28 shrink-0 font-medium text-foreground">
					<GlossText text={pair.left} {lexicon} />
				</span>
				<select
					class={selectClass(pair.left)}
					bind:value={choices[pair.left]}
					onchange={update}
					disabled={submitted}
					aria-label={`Match for ${pair.left}`}
					data-testid="matching-select"
				>
					<option value="">— choose —</option>
					{#each rights as r (r)}
						<option value={r}>{r}</option>
					{/each}
				</select>
			</li>
		{/each}
	</ul>
</div>
