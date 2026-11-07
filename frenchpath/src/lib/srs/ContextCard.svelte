<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { onDestroy, onMount, tick } from 'svelte';
	import IconButton from '$lib/components/IconButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { startRecording, type Recording } from '$lib/speech/recordAndScore';
	import { speakFrench } from '$lib/audio/tts';
	import type { ReviewGrade } from '$lib/srs/fsrs';
	import type { ContextPrompt } from '$lib/srs/contextCard';
	import type { ReviewMode } from '$lib/gamification/todayPlan';
	import { gradeChoice, gradeSpoken, gradeTyped } from '$lib/srs/contextGrade';

	interface Props {
		prompt: ContextPrompt;
		mode?: ReviewMode;
		gloss: string;
		/** On-device speech recognition is ready; without it `speak` renders as typed recall. */
		asr?: boolean;
		onAnswered: (grade: ReviewGrade, durationMs: number) => void;
	}
	let { prompt, mode = 'read', gloss, asr = false, onAnswered }: Props = $props();

	const isListen = $derived(mode === 'listen');
	let typeInstead = $state(false);
	const isSpeak = $derived(mode === 'speak' && asr && !typeInstead);
	const isType = $derived(mode === 'type' || (mode === 'speak' && !isSpeak));
	// mature card with no sentence: gloss prompts, learner types the French
	const isGlossOnly = $derived(prompt.choices.length === 0);
	const fullSentence = $derived(`${prompt.before}${prompt.answer}${prompt.after}`);

	// listen mode restarts this when playback ends, so TTS time isn't answer time
	let startedAt = performance.now();
	let picked = $state<string | null>(null);
	let continueBtn = $state<HTMLButtonElement>();
	let typed = $state('');
	let submitted = $state(false);
	let typedGrade = $state<ReviewGrade>('again');
	let inputEl = $state<HTMLInputElement>();
	let durationMs = 0;
	let finished = false;
	let recorder: Recording | null = null;
	let abortCtl: AbortController | null = null; // cancels a getUserMedia still pending
	let sayBtn = $state<HTMLButtonElement>();
	let choicesEl = $state<HTMLDivElement>();
	let replayWrap = $state<HTMLDivElement>();
	let starting = false; // guards the async gap between tap and recording=true
	let recording = $state(false);
	let checking = $state(false);
	let speakNote = $state<'denied' | 'failed' | null>(null);
	const answered = $derived(picked !== null || submitted);
	const isCorrect = $derived(submitted ? typedGrade !== 'again' : picked === prompt.answer);

	function replay() {
		try {
			speakFrench(fullSentence, { onEnd: () => (startedAt = performance.now()) });
		} catch {
			// caps gate listen; a failing voice just stays silent
		}
	}

	onMount(() => {
		// a new card must own focus, else it falls to <body> after the previous card unmounts
		if (isListen) {
			replay();
			replayWrap?.querySelector('button')?.focus();
		} else if (isType || isGlossOnly) inputEl?.focus();
		else if (isSpeak) sayBtn?.focus();
		else choicesEl?.querySelector('button')?.focus();
	});

	// leaving the card or page mid-recording must release the mic
	onDestroy(() => {
		abortCtl?.abort();
		recorder?.cancel();
	});

	async function toggleSpeak() {
		if (submitted || checking || starting) return;
		if (recording) return stopSpeak();
		starting = true;
		speakNote = null;
		const ctl = new AbortController();
		abortCtl = ctl;
		try {
			recorder = await startRecording(ctl.signal);
		} catch (err) {
			// an abort (card left / Type instead) is silent: no copy, no grade
			if (!(err instanceof DOMException && err.name === 'AbortError')) speakNote = 'denied';
			return;
		} finally {
			starting = false;
		}
		recording = true;
	}

	async function stopSpeak() {
		const active = recorder;
		recorder = null;
		recording = false;
		if (!active) return;
		checking = true;
		try {
			const score = await active.stop(fullSentence);
			durationMs = Math.round(performance.now() - startedAt);
			typedGrade = gradeSpoken(score.overall);
			submitted = true;
			void tick().then(() => continueBtn?.focus());
		} catch {
			// never grade on error; the learner can retry or type instead
			speakNote = 'failed';
		} finally {
			checking = false;
			// disabled={checking} dropped focus; give it back so retry is one keypress away
			if (!submitted) void tick().then(() => sayBtn?.focus());
		}
	}

	async function switchToTyping() {
		abortCtl?.abort();
		recorder?.cancel();
		recorder = null;
		recording = false;
		speakNote = null;
		typeInstead = true;
		await tick();
		inputEl?.focus();
	}

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
	{#if isListen}
		<div class="flex justify-center" bind:this={replayWrap}>
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

	{#if isSpeak && !answered}
		<p class="mt-5 text-center text-sm text-muted" id="speak-hint">{m.review_speak_hint()}</p>
		<div class="mt-2 flex flex-wrap items-center justify-center gap-2">
			<button
				bind:this={sayBtn}
				type="button"
				class="btn-primary inline-flex min-h-11 items-center gap-2"
				data-testid="speak-answer"
				aria-describedby="speak-hint"
				disabled={checking}
				onclick={toggleSpeak}
			>
				<Icon name="mic" size={18} />
				{recording ? m.review_speak_stop() : m.review_speak_say()}
			</button>
			<button
				type="button"
				class="btn-secondary min-h-11"
				data-testid="speak-type-instead"
				disabled={checking}
				onclick={switchToTyping}>{m.review_speak_type_instead()}</button
			>
		</div>
		<p class="mt-2 min-h-5 text-center text-sm text-muted" aria-live="polite">
			{#if checking}{m.review_speak_checking()}
			{:else if speakNote === 'denied'}{m.review_speak_denied()}
			{:else if speakNote === 'failed'}{m.review_speak_failed()}{/if}
		</p>
	{:else if isSpeak}
		<!-- answered by voice: nothing to type or pick -->
	{:else if isType || isGlossOnly}
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
			bind:this={choicesEl}
			class="mt-5 grid grid-cols-2 gap-2"
			role="group"
			aria-label={m.review_context_prompt()}
		>
			{#each prompt.choices as choice (choice)}
				<button
					type="button"
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
				{#if submitted && typedGrade === 'hard'}{m.review_context_close({ answer: prompt.answer })}
				{:else if isCorrect}{m.review_context_correct()}
				{:else}{m.review_context_answer({ answer: prompt.answer })}{/if}
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
