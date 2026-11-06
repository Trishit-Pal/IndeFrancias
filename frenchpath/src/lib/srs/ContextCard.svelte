<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { tick } from 'svelte';
	import type { ReviewGrade } from '$lib/srs/fsrs';
	import type { ContextPrompt } from '$lib/srs/contextCard';
	import { gradeChoice } from '$lib/srs/contextGrade';

	interface Props {
		prompt: ContextPrompt;
		// ponytail: read mode only; add `mode: ReviewMode` when Task 4/6 land.
		mode?: 'read';
		gloss: string;
		onAnswered: (grade: ReviewGrade, durationMs: number) => void;
	}
	// eslint-disable-next-line svelte/no-unused-props -- `mode` reserved for Task 6
	let { prompt, gloss, onAnswered }: Props = $props();

	const startedAt = performance.now();
	let picked = $state<string | null>(null);
	let continueBtn = $state<HTMLButtonElement>();
	let durationMs = 0;
	let finished = false;
	const isCorrect = $derived(picked === prompt.answer);

	function choose(choice: string) {
		if (picked !== null) return;
		durationMs = Math.round(performance.now() - startedAt);
		picked = choice;
		// the chosen button becomes disabled; keep keyboard focus alive
		void tick().then(() => continueBtn?.focus());
	}

	function next() {
		if (finished || picked === null) return;
		finished = true;
		onAnswered(gradeChoice(isCorrect, durationMs), durationMs);
	}
</script>

<section class="surface-card p-6 shadow-sm lg:mx-auto lg:max-w-2xl" data-testid="context-card">
	<p class="fp-display-lg text-center text-balance text-foreground">
		{prompt.before}<span class="fp-blank"
			>{#if picked}{prompt.answer}{:else}<span aria-hidden="true">＿＿＿</span><span class="sr-only"
					>{m.review_context_blank()}</span
				>{/if}</span
		>{prompt.after}
	</p>
	<p class="mt-2 text-center text-sm text-muted" style="font-family: var(--fp-font-hindi)">
		{gloss}
	</p>

	<div class="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label={m.review_context_prompt()}>
		{#each prompt.choices as choice (choice)}
			<button
				type="button"
				role="radio"
				aria-checked={picked === choice}
				class="fp-context-choice"
				class:fp-context-right={picked !== null && choice === prompt.answer}
				class:fp-context-wrong={picked === choice && choice !== prompt.answer}
				data-testid="context-choice"
				disabled={picked !== null}
				onclick={() => choose(choice)}>{choice}</button
			>
		{/each}
	</div>

	<div aria-live="polite" data-testid="context-feedback" class="mt-4 text-center">
		{#if picked !== null}
			<p class="text-foreground">
				{prompt.before}<mark class="fp-answer-mark">{prompt.answer}</mark>{prompt.after}
			</p>
			<p class="mt-1 text-sm text-muted">
				{isCorrect
					? m.review_context_correct()
					: m.review_context_answer({ answer: prompt.answer })}
			</p>
		{/if}
	</div>

	{#if picked !== null}
		<button
			type="button"
			class="btn-primary mt-4 w-full"
			data-testid="continue"
			bind:this={continueBtn}
			onclick={next}>{m.review_context_continue()}</button
		>
	{/if}
</section>

<style>
	.fp-blank {
		display: inline-block;
		min-width: 3ch;
		margin: 0 0.25em;
		border-bottom: 2px solid var(--fp-saffron-text);
		color: var(--fp-saffron-text);
	}
	.fp-context-choice {
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, currentColor);
		border-radius: 0.75rem;
		font-weight: 600;
		background: transparent;
		color: inherit;
	}
	.fp-context-choice:focus-visible {
		outline: 2px solid var(--fp-saffron-text);
		outline-offset: 2px;
	}
	.fp-context-right {
		border-color: var(--fp-sage-text);
		color: var(--fp-sage-text);
	}
	.fp-context-wrong {
		text-decoration: line-through;
		opacity: 0.7;
	}
	.fp-answer-mark {
		background: transparent;
		font-weight: 700;
		color: var(--fp-sage-text);
	}
</style>
