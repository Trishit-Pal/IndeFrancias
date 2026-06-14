<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';

	let {
		exercise,
		// eslint-disable-next-line no-useless-assignment -- Svelte bindable prop
		response = $bindable(null),
		submitted,
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'productive' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
	} = $props();

	let checked = $state<boolean[]>([]);

	$effect(() => {
		if (checked.length !== exercise.rubric.length) {
			checked = exercise.rubric.map(() => false);
		}
	});

	function syncResponse(next: boolean[]) {
		const count = next.filter(Boolean).length;
		response = count >= exercise.minChecks ? { type: 'productive', checked: next } : null;
	}

	function toggle(i: number) {
		if (submitted) return;
		const next = checked.map((v, idx) => (idx === i ? !v : v));
		checked = next;
		syncResponse(next);
	}
</script>

<div class="space-y-4">
	<p class="text-lg font-semibold text-foreground">
		<GlossText text={exercise.prompt} {lexicon} />
	</p>
	<textarea
		class="field-input min-h-32"
		placeholder="Write or plan your answer here…"
		disabled={submitted}
		aria-label="Your written response"
	></textarea>
	<p class="text-sm font-medium text-muted">Self-assess against the rubric:</p>
	<ul class="space-y-2">
		{#each exercise.rubric as item, i (i)}
			<li>
				<label
					class="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border border-border p-3"
				>
					<input
						type="checkbox"
						class="mt-1 h-5 w-5 accent-primary"
						checked={checked[i]}
						disabled={submitted}
						onchange={() => toggle(i)}
					/>
					<span class="text-sm text-foreground">{item}</span>
				</label>
			</li>
		{/each}
	</ul>
	{#if submitted}
		<details class="text-sm">
			<summary class="cursor-pointer text-primary">Model answer</summary>
			<p class="mt-2 text-foreground">
				<GlossText text={exercise.modelAnswer} {lexicon} />
			</p>
		</details>
	{/if}
</div>
