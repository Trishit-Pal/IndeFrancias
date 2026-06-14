<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';

	let {
		exercise,
		response = $bindable(),
		submitted
	}: {
		exercise: Extract<Exercise, { type: 'mcq' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
	} = $props();

	const selected = $derived(response?.type === 'mcq' ? response.selectedIndex : -1);

	function choose(i: number) {
		if (submitted) return;
		response = { type: 'mcq', selectedIndex: i };
	}

	function optionClass(i: number): string {
		const base =
			'min-h-11 w-full rounded-xl border px-4 py-3 text-left text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ring-offset';
		if (submitted && i === exercise.answerIndex) return `${base} option-correct`;
		if (submitted && i === selected) return `${base} option-incorrect`;
		if (i === selected) return `${base} option-selected`;
		return `${base} option-default`;
	}
</script>

<fieldset class="space-y-3" disabled={submitted}>
	<legend class="mb-2 text-lg font-semibold text-foreground">{exercise.prompt}</legend>
	{#each exercise.options as option, i (i)}
		<button
			type="button"
			class={optionClass(i)}
			aria-pressed={i === selected}
			data-testid="mcq-option"
			onclick={() => choose(i)}
		>
			{option}
		</button>
	{/each}
</fieldset>
