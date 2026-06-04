<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';

	let {
		exercise,
		// eslint-disable-next-line no-useless-assignment -- write-only $bindable prop
		response = $bindable(),
		submitted
	}: {
		exercise: Extract<Exercise, { type: 'matching' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
	} = $props();

	function shuffle<T>(arr: readonly T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	// Right-hand options are shuffled so the answer order isn't a giveaway.
	// Derived from `exercise`, which is stable for this instance (keyed per question).
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
		const base =
			'flex-1 rounded-lg border px-3 py-2 text-base bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
		if (submitted && rowCorrect(left)) return `${base} border-green-500 bg-green-50`;
		if (submitted) return `${base} border-red-500 bg-red-50`;
		return `${base} border-slate-300`;
	}
</script>

<div class="space-y-3">
	{#if exercise.prompt}
		<p class="text-lg font-semibold text-slate-900">{exercise.prompt}</p>
	{/if}
	<ul class="space-y-2">
		{#each exercise.pairs as pair (pair.left)}
			<li class="flex items-center gap-3">
				<span class="w-28 shrink-0 font-medium text-slate-900">{pair.left}</span>
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
