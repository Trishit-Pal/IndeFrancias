<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { onMount, tick } from 'svelte';
	import IconButton from '$lib/components/IconButton.svelte';
	import { speakFrench } from '$lib/audio/tts';
	import type { ReviewGrade } from '$lib/srs/fsrs';
	import type { ContextPrompt } from '$lib/srs/contextCard';
	import type { ReviewMode } from '$lib/gamification/todayPlan';
	import { gradeChoice, gradeTyped } from '$lib/srs/contextGrade';

	interface Props {
		prompt: ContextPrompt;
		mode?: ReviewMode;
		gloss: string;
		onAnswered: (grade: ReviewGrade, durationMs: number) => void;
	}
	let { prompt, mode = 'read', gloss, onAnswered }: Props = $props();

	// speak lands in Task 7; it renders as typed recall until then
	const isListen = $derived(mode === 'listen');
	const isType = $derived(mode === 'type' || mode === 'speak');
	// mature card with no sentence: gloss prompts, learner types the French
	const isGlossOnly = $derived(prompt.choices.length === 0);
	const fullSentence = $derived(`${prompt.before}${prompt.answer}${prompt.after}`);

	const startedAt = performance.now();
	let picked = $state<string | null>(null);
	let continueBtn = $state<HTMLButtonElement>();
	let typed = $state('');
	let submitted = $state(false);
	let typedGrade = $state<ReviewGrade>('again');
	let inputEl = $state<HTMLInputElement>();
	let durationMs = 0;
	let finished = false;
	const answered = $derived(picked !== null || submitted);
	const isCorrect = $derived(submitted ? typedGrade !== 'again' : picked === prompt.answer);

	function replay() {
		try {
			speakFrench(fullSentence);
		} catch {
			// caps gate listen; a failing voice just stays silent
		}
	}

	onMount(() => {
		if (isListen) replay();
		else if (isType || isGlossOnly) inputEl?.focus();
	});

	function check() {
		if (submitted) return;
		durationMs = Math.round(performance.now() - startedAt);
		typedGrade = gradeTyped(typed, prompt.accepted);
		submitted = true;
		void tick().then(() => continueBtn?.focus());
	}

	function choose(choice: string) {
		if (picked !== null) return;
		durationMs = Math.round(performance.now() - startedAt);
		picked = choice;
		// the chosen button becomes disabled; keep keyboard focus alive
		void tick().then(() => continueBtn?.focus());
	}

	function next() {
		if (finished || !answered) return;
		finished = true;
		onAnswered(submitted ? typedGrade : gradeChoice(isCorrect, durationMs), durationMs);
	}
</script>

<section class="surface-card p-6 shadow-sm lg:mx-auto lg:max-w-2xl" data-testid="context-card">
	{#if isListen && !answered}
		<div class="flex justify-center">
			<IconButton
				icon="speaker"
				label={m.review_listen_replay()}
				testid="listen-replay"
				onclick={replay}
			/>
		</div>
	{:else if isGlossOnly}
		<p
			class="fp-display-lg text-center text-balance text-foreground"
			style="font-family: var(--fp-font-hindi)"
		>
			{gloss}
		</p>
	{:else}
		<p
			class="fp-display-lg text-center text-balance text-foreground"
			data-testid="context-sentence"
		>
			{prompt.before}<span class="fp-blank"
				>{#if answered}{prompt.answer}{:else}<span aria-hidden="true">＿＿＿</span><span
						class="sr-only">{m.review_context_blank()}</span
					>{/if}</span
			>{prompt.after}
		</p>
		<p class="mt-2 text-center text-sm text-muted" style="font-family: var(--fp-font-hindi)">
			{gloss}
		</p>
	{/if}

	{#if isType || isGlossOnly}
		<form
			class="mt-5 flex gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				check();
			}}
		>
			<input
				bind:this={inputEl}
				bind:value={typed}
				type="text"
				class="fp-recall-input"
				data-testid="recall-input"
				aria-label={m.review_recall_label()}
				placeholder={m.review_recall_label()}
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				lang="fr"
				disabled={submitted}
			/>
			<button type="submit" class="btn-primary" data-testid="recall-check" disabled={submitted}
				>{m.review_recall_check()}</button
			>
		</form>
	{:else}
		<div
			class="mt-5 grid grid-cols-2 gap-2"
			role="radiogroup"
			aria-label={m.review_context_prompt()}
		>
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
	{/if}

	<div aria-live="polite" data-testid="context-feedback" class="mt-4 text-center">
		{#if answered}
			<p class="text-foreground">
				{prompt.before}<mark class="fp-answer-mark">{prompt.answer}</mark>{prompt.after}
			</p>
			{#if isListen}
				<p class="mt-1 text-sm text-muted" style="font-family: var(--fp-font-hindi)">{gloss}</p>
			{/if}
			<p class="mt-1 text-sm text-muted">
				{isCorrect
					? m.review_context_correct()
					: m.review_context_answer({ answer: prompt.answer })}
			</p>
		{/if}
	</div>

	{#if answered}
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
	.fp-recall-input {
		flex: 1;
		min-width: 0;
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, currentColor);
		border-radius: 0.75rem;
		background: transparent;
		color: inherit;
	}
	.fp-recall-input:focus-visible {
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
