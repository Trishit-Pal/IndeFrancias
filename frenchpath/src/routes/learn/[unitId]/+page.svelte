<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { loadUnit, listUnitSummaries, buildLessonLexicon } from '$lib/content/loader';
	import GlossMarkdown from '$lib/components/GlossMarkdown.svelte';
	import type { Unit } from '$lib/content/schema';
	import type { Lexicon } from '$lib/content/lexicon';
	import { gradeExercise, scorePercent, type ExerciseResponse } from '$lib/lesson/engine';
	import { evaluateRubric, type RubricHint } from '$lib/lesson/rubric';
	import { completeLesson, type CompleteOutcome } from '$lib/lesson/complete';
	import { isUnitLocked, lockReasonForUnit } from '$lib/lesson/progression';
	import { passedAssessmentIds } from '$lib/assessment/checkpoint';
	import CoachTip from '$lib/components/CoachTip.svelte';
	import CelebrationOverlay from '$lib/celebration/CelebrationOverlay.svelte';
	import XpFloat from '$lib/components/XpFloat.svelte';
	import { tipForUnit } from '$lib/profile/frenchTips';
	import type { CelebrationRequest } from '$lib/celebration/orchestrator';
	import { progressRepo, settingsRepo } from '$lib/db';
	import { getGloss, getBridgeCopy } from '$lib/content/gloss';
	import type { ConfidenceSnapshot, NativeLanguage } from '$lib/db/schema';
	import { ensurePersistence } from '$lib/pwa/persist';
	import { shareProgress } from '$lib/share/shareCard';
	import RecordCompare from '$lib/audio/RecordCompare.svelte';
	import Exercise from '$lib/lesson/exercises/Exercise.svelte';
	import GlossText from '$lib/components/GlossText.svelte';
	import LessonShell from '$lib/components/LessonShell.svelte';
	import ExerciseChrome from '$lib/components/ExerciseChrome.svelte';
	import LessonComplete from '$lib/components/LessonComplete.svelte';
	import CharacterLeo from '$lib/components/CharacterLeo.svelte';
	import CharacterMira from '$lib/components/CharacterMira.svelte';
	import { fly, fade } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages';

	type Phase = 'loading' | 'intro' | 'bridge-quiz' | 'exercise' | 'finished' | 'error' | 'locked';

	let unit = $state<Unit | null>(null);
	let phase = $state<Phase>('loading');
	let errorMessage = $state('');

	let reducedMotion = $state(false);
	let nativeLanguage = $state<NativeLanguage>('hi');
	let index = $state(0);
	let response = $state<ExerciseResponse | null>(null);
	let submitted = $state(false);
	let correct = $state(false);
	let correctCount = $state(0);
	let outcome = $state<CompleteOutcome | null>(null);
	let showFrenchTips = $state(true);
	let celebrationLevel = $state<'full' | 'minimal'>('full');
	let celebration = $state<CelebrationRequest | null>(null);
	let xpFloat = $state(0);
	let bridgeQuizIndex = $state<number | null>(null);
	let bridgeQuizSubmitted = $state(false);
	let showConfidencePulse = $state(false);
	let confidenceAnswered = $state(false);
	let pendingAdvance = $state(false);
	let lockReason = $state<string | null>(null);
	let lexicon = $state<Lexicon>(new Map());
	let hintsUsed = $state(0);
	let hintText = $state<string | null>(null);
	let rubricHints = $state<RubricHint[]>([]);
	const MAX_LESSON_HINTS = 2;

	const bridgeCopy = $derived(unit?.bridge ? getBridgeCopy(unit.bridge, nativeLanguage) : null);

	const current = $derived(unit?.exercises[index] ?? null);
	const total = $derived(unit?.exercises.length ?? 0);
	const score = $derived(scorePercent(correctCount, total));
	const progress = $derived(total === 0 ? 0 : Math.round((index / total) * 100));

	async function loadLesson(unitId: string) {
		phase = 'loading';
		errorMessage = '';
		unit = null;
		const settings = await settingsRepo.getSettings();
		reducedMotion =
			settings.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		nativeLanguage = settings.nativeLanguage;
		showFrenchTips = settings.showFrenchTips;
		celebrationLevel = settings.celebrationLevel;
		const passed = await passedAssessmentIds();
		try {
			const all = await progressRepo.getAllProgress();
			const progressById = Object.fromEntries(all.map((p) => [p.lessonId, p]));
			if (isUnitLocked(unitId, listUnitSummaries(), progressById, passed)) {
				lockReason = lockReasonForUnit(unitId, listUnitSummaries(), progressById, passed);
				phase = 'locked';
				return;
			}
			lockReason = null;
			unit = await loadUnit(unitId);
			lexicon = await buildLessonLexicon(unitId, nativeLanguage);
			index = 0;
			hintsUsed = 0;
			hintText = null;
			rubricHints = [];
			response = null;
			submitted = false;
			correct = false;
			correctCount = 0;
			outcome = null;
			bridgeQuizIndex = null;
			bridgeQuizSubmitted = false;
			confidenceAnswered = false;
			showConfidencePulse = false;
			pendingAdvance = false;
			phase = 'intro';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Failed to load this lesson.';
			phase = 'error';
		}
	}

	$effect(() => {
		const unitId = page.params.unitId;
		if (!unitId) return;
		void loadLesson(unitId);
	});

	function check() {
		if (!current || !response) return;
		correct = gradeExercise(current, response);
		if (correct) correctCount += 1;
		submitted = true;
		rubricHints =
			(response.type === 'cloze' || response.type === 'translation') && !correct
				? evaluateRubric(response.text, current, nativeLanguage)
				: [];
		if (!correct && 'coachNote' in current && current.coachNote) {
			hintText = current.coachNote;
		} else if (!correct && current.type === 'mcq' && current.explanation) {
			hintText = current.explanation;
		}
	}

	function hintForExercise(ex: typeof current): string | null {
		if (!ex) return null;
		if ('hint' in ex && ex.hint) return ex.hint;
		if (ex.type === 'mcq')
			return ex.explanation ?? 'Eliminate options that do not fit the grammar rule.';
		if (ex.type === 'cloze' || ex.type === 'dictation')
			return 'Think about the vocabulary from this unit.';
		if (ex.type === 'translation') return 'Use words you learned in this lesson.';
		if (ex.type === 'conjugation') return `Recall the conjugation pattern for « ${ex.verb} ».`;
		if (ex.type === 'gender') return 'Masculine nouns often take le/un; feminine take la/une.';
		return 'Review the bridge note and new words before answering.';
	}

	function applyHint() {
		if (!current || hintsUsed >= MAX_LESSON_HINTS || submitted) return;
		hintsUsed += 1;
		hintText = hintForExercise(current);
	}

	async function advance() {
		if (!unit) return;
		const midpoint = Math.ceil(total / 2);
		if (!confidenceAnswered && index + 1 >= midpoint && total > 1) {
			showConfidencePulse = true;
			pendingAdvance = true;
			return;
		}
		await continueAdvance();
	}

	async function continueAdvance() {
		if (!unit) return;
		if (index + 1 < unit.exercises.length) {
			index += 1;
			response = null;
			submitted = false;
			correct = false;
			hintText = null;
			rubricHints = [];
		} else {
			outcome = await completeLesson(unit, { correct: correctCount, total, score });
			await ensurePersistence();
			phase = 'finished';
			xpFloat = outcome.goalXp;
			if (celebrationLevel === 'full' && !reducedMotion) {
				celebration = {
					event: 'lesson_complete',
					title: m.lesson_complete(),
					subtitle: `+${outcome.goalXp} XP`
				};
			}
		}
	}

	async function answerConfidence(choice: ConfidenceSnapshot['choice']) {
		showConfidencePulse = false;
		confidenceAnswered = true;
		const snapshots = [
			...((await settingsRepo.getSettings()).confidenceSnapshots ?? []),
			{ unitId: unit!.id, index, choice }
		].slice(-20);
		await settingsRepo.saveSettings({ confidenceSnapshots: snapshots });
		if (pendingAdvance) {
			pendingAdvance = false;
			await continueAdvance();
		}
	}
</script>

<svelte:head><title>{unit ? unit.title : 'Lesson'} · FrenchPath</title></svelte:head>

<main class="page-shell">
	{#if phase === 'loading'}
		<p class="text-muted">{m.lesson_loading()}</p>
	{:else if phase === 'error'}
		<div class="rounded-xl border border-error bg-error/10 p-4 text-foreground">
			<p class="font-semibold">Could not load the lesson</p>
			<p class="text-sm">{errorMessage}</p>
			<a class="mt-3 inline-block text-primary underline" href={resolve('/')}>Back to home</a>
		</div>
	{:else if phase === 'locked'}
		<div class="surface-card p-6 text-center" data-testid="locked">
			<p class="text-4xl">🔒</p>
			<p class="mt-2 font-semibold text-foreground">{m.lesson_locked_title()}</p>
			{#if lockReason}
				<p class="text-sm text-muted">{lockReason}</p>
			{:else}
				<p class="text-sm text-muted">{m.lesson_locked_desc()}</p>
			{/if}
			<a class="btn-primary mt-4 inline-block" href={resolve('/')}>{m.common_back_to_path()}</a>
		</div>
	{:else if phase === 'intro' && unit}
		<a class="text-sm text-muted hover:underline" href={resolve('/')}>{m.common_home()}</a>
		<span class="fp-neon-border ml-2 rounded-full px-2 py-0.5 text-xs font-semibold uppercase">
			{unit.cefrLevel}
		</span>
		<h1 class="mt-2 text-2xl font-bold text-foreground md:text-3xl">{unit.title}</h1>
		<p class="mt-2 text-muted">{unit.objective}</p>

		{#if showFrenchTips}
			<div class="mt-4">
				<CoachTip tip={tipForUnit(unit.order)} />
			</div>
		{/if}

		{#if unit.bridge && bridgeCopy}
			<section
				class="mt-5 rounded-xl border p-4 text-foreground"
				style="border-color: color-mix(in srgb, var(--fp-saffron) 45%, var(--fp-paper)); background: color-mix(in srgb, var(--fp-saffron) 12%, var(--fp-paper));"
			>
				<h2 class="font-semibold">🌉 {bridgeCopy.title}</h2>
				<p class="mt-1 text-sm">
					<GlossMarkdown text={bridgeCopy.body} {lexicon} />
				</p>
			</section>
		{/if}

		{#if unit.cards.length}
			<section class="mt-5">
				<h2 class="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
					{m.lesson_new_words()}
				</h2>
				<ul class="surface-card divide-y divide-border">
					{#each unit.cards as card (card.id)}
						{@const gloss = getGloss(card, nativeLanguage)}
						<li class="fp-slide-in flex items-center justify-between gap-3 px-4 py-3">
							<div>
								<p class="font-medium text-foreground">
									<GlossText text={card.french} {lexicon} class="inline" />
									{#if card.gender !== 'none'}
										<span class="text-xs text-muted">({card.gender})</span>
									{/if}
								</p>
								<p class="text-sm text-muted">
									{gloss.primary}{#if gloss.secondary}
										· {gloss.secondary}{/if}
								</p>
							</div>
							<RecordCompare text={card.french} label={card.french} />
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<button
			type="button"
			class="btn-primary mt-6 w-full"
			data-testid="start-lesson"
			onclick={() => {
				if (unit?.bridge?.quiz) {
					bridgeQuizIndex = null;
					bridgeQuizSubmitted = false;
					phase = 'bridge-quiz';
				} else {
					phase = 'exercise';
				}
			}}
		>
			{m.lesson_start({ count: total })}
		</button>
	{:else if phase === 'bridge-quiz' && unit?.bridge?.quiz}
		{@const quiz = unit.bridge.quiz}
		{@const bridgeCorrect = bridgeQuizIndex === quiz.answerIndex}
		<h2 class="mt-4 text-lg font-semibold">{m.lesson_quick_check()}</h2>
		<p class="mt-2 text-muted">{quiz.prompt}</p>
		<ul class="mt-4 space-y-2">
			{#each quiz.options as option, i (option)}
				<li>
					<button
						type="button"
						class="surface-card fp-pressable w-full p-3 text-left {bridgeQuizSubmitted &&
						bridgeQuizIndex === i
							? i === quiz.answerIndex
								? 'option-correct'
								: 'option-incorrect'
							: bridgeQuizIndex === i
								? 'ring-2 ring-primary'
								: ''}"
						data-testid="bridge-quiz-option"
						onclick={() => {
							bridgeQuizIndex = i;
							bridgeQuizSubmitted = true;
						}}
					>
						{option}
					</button>
				</li>
			{/each}
		</ul>
		{#if bridgeQuizSubmitted && !bridgeCorrect}
			<p class="mt-3 text-sm text-error" role="alert">{m.lesson_try_again()}</p>
		{/if}
		<button
			type="button"
			class="btn-primary mt-4 w-full"
			disabled={!bridgeCorrect}
			data-testid="bridge-quiz-continue"
			onclick={() => (phase = 'exercise')}
		>
			{m.lesson_continue_exercises()}
		</button>
	{:else if phase === 'exercise' && current && unit}
		<LessonShell {progress} {reducedMotion} current={index + 1} {total}>
			<ExerciseChrome
				{unit}
				exercise={current}
				{index}
				{total}
				hintsRemaining={MAX_LESSON_HINTS - hintsUsed}
				onHint={applyHint}
				hintDisabled={submitted || hintsUsed >= MAX_LESSON_HINTS}
			/>

			<div class="grid grid-cols-1 grid-rows-1">
				{#key current.id}
					<div
						class="surface-card col-start-1 row-start-1 p-4"
						in:fly={{ x: 20, duration: reducedMotion ? 0 : 300 }}
					>
						<Exercise
							exercise={current}
							bind:response
							{submitted}
							{hintText}
							{lexicon}
							coachNote={current.coachNote ?? null}
						/>
					</div>
				{/key}
			</div>

			{#if submitted}
				<div
					transition:fade={{ duration: reducedMotion ? 0 : 200 }}
					class="mt-5 flex items-start gap-3 rounded-2xl p-3 text-sm font-medium {correct
						? 'feedback-correct animate-scale-in fp-feedback-pulse'
						: 'feedback-incorrect animate-shake'}"
					data-testid="feedback"
					role="status"
					aria-live="polite"
				>
					{#if correct}
						<CharacterLeo size="sm" animate={!reducedMotion} />
					{:else}
						<CharacterMira size="sm" animate={!reducedMotion} />
					{/if}
					<div class="flex flex-col gap-2">
						<span>{correct ? m.lesson_correct() : m.lesson_incorrect()}</span>
						{#each rubricHints as h (h.ruleId)}
							<p class="fp-rubric-hint" data-testid="rubric-hint" aria-live="polite">
								<span class="fp-rubric-hint__label">{m.rubric_hint_label()}</span>
								{h.hint}
							</p>
						{/each}
					</div>
				</div>
				<button
					type="button"
					class="btn-primary mt-4 w-full"
					data-testid="continue"
					onclick={advance}
				>
					{index + 1 < total ? m.lesson_continue() : m.lesson_finish()}
				</button>
			{:else}
				<button
					type="button"
					class="btn-primary mt-6 w-full"
					data-testid="check"
					disabled={response === null}
					onclick={check}
				>
					{m.lesson_check()}
				</button>
			{/if}
		</LessonShell>
	{:else if phase === 'finished'}
		<LessonComplete
			{score}
			{correctCount}
			{total}
			{outcome}
			{reducedMotion}
			onShare={() =>
				shareProgress({
					title: 'FrenchPath lesson',
					subtitle: `${unit?.title ?? 'Lesson'} · ${score}%`,
					xp: outcome?.goalXp
				})}
		/>
	{/if}
</main>

{#if showConfidencePulse}
	<div
		class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
		role="dialog"
		aria-labelledby="confidence-title"
		data-testid="confidence-pulse"
	>
		<div class="surface-card w-full max-w-sm p-5 text-center">
			<h2 id="confidence-title" class="text-lg font-semibold text-foreground">
				{m.confidence_pulse_title()}
			</h2>
			<div class="mt-4 grid grid-cols-3 gap-2">
				<button
					type="button"
					class="btn-secondary text-sm"
					data-testid="confidence-low"
					onclick={() => answerConfidence('low')}>{m.confidence_low()}</button
				>
				<button
					type="button"
					class="btn-primary text-sm"
					data-testid="confidence-ok"
					onclick={() => answerConfidence('ok')}>{m.confidence_ok()}</button
				>
				<button
					type="button"
					class="btn-secondary text-sm"
					data-testid="confidence-high"
					onclick={() => answerConfidence('high')}>{m.confidence_high()}</button
				>
			</div>
		</div>
	</div>
{/if}

{#if xpFloat > 0}
	<XpFloat amount={xpFloat} />
{/if}

<CelebrationOverlay
	request={celebration}
	{celebrationLevel}
	reduceMotion={reducedMotion}
	onDismiss={() => (celebration = null)}
/>

<style>
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-4px);
		}
		75% {
			transform: translateX(4px);
		}
	}

	@keyframes scale-in {
		0% {
			transform: scale(0.96);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.animate-shake {
		animation: shake 0.3s ease-in-out;
	}

	.animate-scale-in {
		animation: scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.fp-rubric-hint {
		background: var(--fp-jaipur-light);
		color: var(--fp-ink);
		border-radius: var(--fp-r-sm);
		padding: 8px 12px;
		font-size: 0.9375rem;
	}

	.fp-rubric-hint__label {
		font-weight: 700;
		margin-right: 4px;
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-shake,
		.animate-scale-in {
			animation: none !important;
			transform: none !important;
		}
	}
</style>
