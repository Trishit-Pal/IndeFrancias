<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { loadUnit, buildLexiconForUnits } from '$lib/content/loader';
	import type { Lexicon } from '$lib/content/lexicon';
	import { settingsRepo } from '$lib/db';
	import type { DifficultyTier } from '$lib/db/schema';
	import type { Exercise } from '$lib/content/schema';
	import {
		buildCheckpointPool,
		completeGateAssessment,
		gateById,
		tierConfig
	} from '$lib/assessment/checkpoint';
	import { assessmentIdForGate } from '$lib/lesson/gates';
	import { getCheckpointCooldownMs } from '$lib/db/repositories/assessments';
	import { gradeExercise, scorePercent, type ExerciseResponse } from '$lib/lesson/engine';
	import ExerciseView from '$lib/lesson/exercises/Exercise.svelte';
	import TierBadge from '$lib/components/TierBadge.svelte';
	import CelebrationOverlay from '$lib/celebration/CelebrationOverlay.svelte';
	import type { CelebrationRequest } from '$lib/celebration/orchestrator';
	import { shareProgress } from '$lib/share/shareCard';
	import * as m from '$lib/paraglide/messages';

	type Phase = 'loading' | 'intro' | 'exam' | 'result' | 'error' | 'cooldown';

	let phase = $state<Phase>('loading');
	let gateId = $state('');
	let tier = $state<DifficultyTier>('regular');
	let exercises = $state<Exercise[]>([]);
	let index = $state(0);
	let correct = $state(0);
	let response = $state<ExerciseResponse | null>(null);
	let submitted = $state(false);
	let result = $state<{ passed: boolean; percent: number; xp: number } | null>(null);
	let celebration = $state<CelebrationRequest | null>(null);
	let reduceMotion = $state(false);
	let celebrationLevel = $state<'full' | 'minimal'>('full');
	let hintsUsed = $state(0);
	let hintText = $state<string | null>(null);
	let hiddenMcq = $state<number[]>([]);
	let cooldownHours = $state(0);
	let lexicon = $state<Lexicon>(new Map());

	const current = $derived(exercises[index] ?? null);
	const total = $derived(exercises.length);
	const cfg = $derived(tierConfig(tier));

	function hintForExercise(ex: Exercise): string | null {
		if (ex.type === 'cloze' || ex.type === 'dictation')
			return ex.hint ?? 'Think about the unit vocabulary.';
		if (ex.type === 'mcq')
			return ex.explanation ?? 'Eliminate options that do not fit the grammar rule.';
		if (ex.type === 'translation') return 'Use words from the last three units.';
		return 'Review the bridge note before answering.';
	}

	function applyHint() {
		if (!current || hintsUsed >= cfg.maxHints || submitted) return;
		hintsUsed += 1;
		hintText = hintForExercise(current);
		if (current.type === 'mcq') {
			const wrong = current.options
				.map((_, i) => i)
				.filter((i) => i !== current.answerIndex && !hiddenMcq.includes(i));
			if (wrong.length) hiddenMcq = [...hiddenMcq, wrong[0]!];
		}
	}

	onMount(async () => {
		gateId = page.params.groupId ?? '';
		const gate = gateById(gateId);
		if (!gate) {
			phase = 'error';
			return;
		}
		const settings = await settingsRepo.getSettings();
		tier = settings.difficultyTier;
		reduceMotion = settings.reduceMotion;
		celebrationLevel = settings.celebrationLevel;

		const cooldownMs = await getCheckpointCooldownMs(assessmentIdForGate(gateId));
		if (cooldownMs !== null) {
			cooldownHours = Math.ceil(cooldownMs / 3_600_000);
			phase = 'cooldown';
			return;
		}

		const units = await Promise.all(gate.unitIds.map((id) => loadUnit(id)));
		exercises = buildCheckpointPool(units, tier, gateId);
		lexicon = await buildLexiconForUnits(gate.unitIds, settings.nativeLanguage);
		phase = 'intro';
	});

	function start() {
		index = 0;
		correct = 0;
		hintsUsed = 0;
		hintText = null;
		hiddenMcq = [];
		phase = 'exam';
	}

	function submit() {
		if (!current || !response) return;
		submitted = true;
		if (gradeExercise(current, response)) correct += 1;
	}

	function next() {
		if (index + 1 >= total) {
			void finish();
			return;
		}
		index += 1;
		response = null;
		submitted = false;
		hintText = null;
		hiddenMcq = [];
	}

	async function finish() {
		const gate = gateById(gateId);
		if (!gate) return;
		const percent = scorePercent(correct, total);
		const outcome = await completeGateAssessment(gate, tier, correct, total);
		result = { passed: outcome.passed, percent, xp: outcome.xpAwarded };
		phase = 'result';
		if (outcome.passed) {
			const event =
				gate.kind === 'milestone'
					? gate.id === 'mC1'
						? 'milestone_c1'
						: gate.id === 'mB2'
							? 'milestone_b2'
							: gate.id === 'mB1'
								? 'milestone_b1'
								: gate.id === 'mA2'
									? 'milestone_a2'
									: 'milestone_a1'
					: 'checkpoint_pass';
			celebration = {
				event,
				title: `${gate.label} passed!`,
				subtitle: `Score ${percent}% · +${outcome.xpAwarded} XP`
			};
		}
	}
</script>

<svelte:head><title>Checkpoint · FrenchPath</title></svelte:head>

<main class="page-shell">
	<a class="text-sm text-muted hover:underline" href={resolve('/')}>← Home</a>

	{#if phase === 'loading'}
		<p class="mt-6 text-muted">Loading checkpoint…</p>
	{:else if phase === 'error'}
		<p class="mt-6 text-muted" role="alert">Unknown checkpoint.</p>
	{:else if phase === 'cooldown'}
		<p class="mt-6 text-muted" role="alert" data-testid="checkpoint-cooldown">
			{m.checkpoint_cooldown({ hours: cooldownHours })}
		</p>
		<a class="btn-secondary mt-4 inline-block" href={resolve('/')}>Back to path</a>
	{:else if phase === 'intro'}
		{@const gate = gateById(gateId)}
		{#if gate}
			<h1 class="fp-display-md mt-4 text-balance">{gate.label}</h1>
			<p class="mt-2 text-muted">Pass to unlock the next units on your path.</p>
			<div class="mt-4 flex items-center gap-2">
				<TierBadge {tier} />
				<span class="text-sm text-muted"
					>{cfg.questionCount} questions · {cfg.passPercent}% to pass</span
				>
			</div>
			<ul class="mt-4 list-inside list-disc text-sm text-muted">
				<li>Hints available: {cfg.maxHints}</li>
				<li>XP on first pass: {gate.kind === 'milestone' ? '100–150' : '50–120'} (by tier)</li>
			</ul>
			<button
				type="button"
				class="btn-primary mt-6 w-full"
				data-testid="checkpoint-start"
				onclick={start}
			>
				Start checkpoint
			</button>
		{/if}
	{:else if phase === 'exam' && current}
		<p class="mt-4 text-sm text-muted">
			Question <span class="fp-figure">{index + 1} / {total}</span>
			{#if cfg.maxHints > 0}
				· Hints <span class="fp-figure">{hintsUsed}/{cfg.maxHints}</span>
			{/if}
		</p>
		{#if cfg.maxHints > hintsUsed}
			<button type="button" class="btn-secondary mt-2 text-sm" onclick={applyHint}>Hint</button>
		{/if}
		<div class="mt-4">
			<ExerciseView
				exercise={current}
				bind:response
				{submitted}
				{hintText}
				hiddenMcqIndices={hiddenMcq}
				{lexicon}
			/>
		</div>
		{#if !submitted}
			<button
				type="button"
				class="btn-primary mt-4 w-full"
				disabled={!response}
				data-testid="checkpoint-check"
				onclick={submit}
			>
				Check
			</button>
		{:else}
			<button
				type="button"
				class="btn-primary mt-4 w-full"
				data-testid="checkpoint-continue"
				onclick={next}
			>
				{index + 1 >= total ? 'Finish' : 'Continue'}
			</button>
		{/if}
	{:else if phase === 'result' && result}
		<h1 class="fp-display-md mt-4 text-balance">
			{result.passed ? 'Checkpoint passed' : 'Not yet — keep practising'}
		</h1>
		<p class="mt-2 text-muted">Score: {result.percent}%</p>
		{#if result.passed}
			<p class="fp-figure font-semibold text-primary">+{result.xp} XP</p>
			<button
				type="button"
				class="btn-secondary mt-4 w-full"
				onclick={() =>
					shareProgress({
						title: 'FrenchPath checkpoint',
						subtitle: `Passed ${gateById(gateId)?.label ?? gateId}`,
						xp: result?.xp
					})}
			>
				{m.share_progress()}
			</button>
		{/if}
		<a class="btn-primary mt-4 block w-full text-center" href={resolve('/')}>Back to path</a>
	{/if}
</main>

<CelebrationOverlay
	request={celebration}
	{celebrationLevel}
	{reduceMotion}
	onDismiss={() => (celebration = null)}
/>
