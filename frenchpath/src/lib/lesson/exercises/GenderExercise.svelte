<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';
	import type { Lexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';

	type Gender = 'masculine' | 'feminine';

	let {
		exercise,
		response = $bindable(),
		submitted,
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'gender' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
	} = $props();

	const choice = $derived(response?.type === 'gender' ? response.choice : null);
	const options = $derived<{ value: Gender; label: string }[]>(
		exercise.articleStyle === 'definite'
			? [
					{ value: 'masculine', label: 'le' },
					{ value: 'feminine', label: 'la' }
				]
			: [
					{ value: 'masculine', label: 'un' },
					{ value: 'feminine', label: 'une' }
				]
	);

	function pick(value: Gender) {
		if (submitted) return;
		response = { type: 'gender', choice: value };
	}

	function optionClass(value: Gender): string {
		const base =
			'rounded-xl border px-4 py-3 text-lg font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
		if (submitted && value === exercise.answer) return `${base} option-correct`;
		if (submitted && value === choice) return `${base} option-incorrect`;
		if (value === choice) return `${base} option-selected`;
		return `${base} option-default`;
	}
</script>

<fieldset class="space-y-3" disabled={submitted}>
	<legend class="mb-1 text-lg font-semibold text-foreground">
		Choose the correct article for « <GlossText text={exercise.noun} {lexicon} class="inline" /> »
	</legend>
	<div class="grid grid-cols-2 gap-3">
		{#each options as opt (opt.value)}
			<button
				type="button"
				class={optionClass(opt.value)}
				aria-pressed={choice === opt.value}
				data-testid="gender-option"
				onclick={() => pick(opt.value)}
			>
				{opt.label}
				<GlossText text={exercise.noun} {lexicon} class="inline" />
			</button>
		{/each}
	</div>
</fieldset>
