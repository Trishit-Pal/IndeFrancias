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
			'w-full rounded-xl border px-4 py-3 text-left text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
		if (submitted && i === exercise.answerIndex)
			return `${base} border-green-500 bg-green-50 text-green-900`;
		if (submitted && i === selected) return `${base} border-red-500 bg-red-50 text-red-900`;
		if (i === selected) return `${base} border-blue-500 bg-blue-50`;
		return `${base} border-slate-300 bg-white hover:border-blue-400`;
	}
</script>

<fieldset class="space-y-3" disabled={submitted}>
	<legend class="mb-2 text-lg font-semibold text-slate-900">{exercise.prompt}</legend>
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
