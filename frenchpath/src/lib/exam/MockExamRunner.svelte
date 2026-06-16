<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import type { MockExam, ExamSkill } from '$lib/exam/types';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import {
		scoreExam,
		objectiveSkillScore,
		productiveSkillScore,
		type ExamResult
	} from '$lib/exam/score';
	import { recordDailyActivity } from '$lib/gamification/activity';
	import { awardAssessmentXp, DELF_XP_BY_TIER } from '$lib/assessment/checkpoint';
	import { settingsRepo } from '$lib/db';
	import CelebrationOverlay from '$lib/celebration/CelebrationOverlay.svelte';
	import type { CelebrationRequest } from '$lib/celebration/orchestrator';
	import { shareProgress } from '$lib/share/shareCard';
	import Exercise from '$lib/lesson/exercises/Exercise.svelte';
	import ExamTimer from '$lib/exam/ExamTimer.svelte';

	let {
		exam,
		assessmentId,
		assessmentSlug
	}: {
		exam: MockExam;
		assessmentId: string;
		assessmentSlug: string;
	} = $props();

	const sections = $derived(exam.sections);

	// Formal exam identity for the header (DELF/DALF + CEFR level).
	const examName = $derived(assessmentSlug.startsWith('dalf') ? 'DALF' : 'DELF');
	const examLevel = $derived(assessmentSlug.replace(/^d[ae]lf-/, '').toUpperCase());
	const EXAM_SECONDS = 45 * 60;

	let phase = $state<'intro' | 'section' | 'result'>('intro');
	let sectionIndex = $state(0);
	let perSkill = $state<Record<ExamSkill, number>>({
		listening: 0,
		reading: 0,
		writing: 0,
		speaking: 0
	});
	let result = $state<ExamResult | null>(null);
	let celebration = $state<CelebrationRequest | null>(null);
	let reduceMotion = $state(false);
	let celebrationLevel = $state<'full' | 'minimal'>('full');
	let xpAwarded = $state(0);

	let itemIndex = $state(0);
	let response = $state<ExerciseResponse | null>(null);
	let submitted = $state(false);
	let correctInSection = $state(0);

	let modelShown = $state(false);
	let checkedRubric = $state<boolean[]>([]);

	const section = $derived(sections[sectionIndex]);
	const isObjective = $derived(section && 'items' in section);
	const objItem = $derived(section && 'items' in section ? section.items[itemIndex] : null);

	onMount(async () => {
		document.body.classList.add('fp-exam-mode');
		const settings = await settingsRepo.getSettings();
		reduceMotion = settings.reduceMotion;
		celebrationLevel = settings.celebrationLevel;
	});
	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.classList.remove('fp-exam-mode');
	});

	function resetSubState() {
		itemIndex = 0;
		response = null;
		submitted = false;
		correctInSection = 0;
		modelShown = false;
		checkedRubric = [];
	}

	async function nextSection(skillScore: number) {
		if (section) perSkill = { ...perSkill, [section.skill]: skillScore };
		if (sectionIndex + 1 < sections.length) {
			sectionIndex += 1;
			resetSubState();
		} else {
			await finishExam();
		}
	}

	async function finishExam() {
		result = scoreExam(perSkill);
		recordDailyActivity();
		phase = 'result';
		if (result.passed) {
			const settings = await settingsRepo.getSettings();
			const outcome = await awardAssessmentXp(
				assessmentId,
				'delf_mock',
				assessmentSlug,
				result.total,
				DELF_XP_BY_TIER[settings.difficultyTier]
			);
			xpAwarded = outcome.xp;
			if (outcome.awarded) {
				celebration = {
					event: 'delf_pass',
					title: m.exam_pass(),
					subtitle: `${result.total}/100 · +${outcome.xp} XP`
				};
			}
		}
	}

	function checkItem() {
		if (!objItem || !response) return;
		if (gradeExercise(objItem, response)) correctInSection += 1;
		submitted = true;
	}

	function advanceObjective() {
		if (!section || !('items' in section)) return;
		if (itemIndex + 1 < section.items.length) {
			itemIndex += 1;
			response = null;
			submitted = false;
		} else {
			void nextSection(objectiveSkillScore(correctInSection, section.items.length));
		}
	}

	function submitProductive() {
		const rating = checkedRubric.filter(Boolean).length;
		void nextSection(productiveSkillScore(rating));
	}
</script>

<svelte:head><title>{exam.title} · FrenchPath</title></svelte:head>

<main class="page-shell lg:max-w-3xl">
	<a class="text-sm text-muted hover:underline" href={resolve('/')}>{m.common_home()}</a>

	<header class="fp-exam-header mt-3">
		<div>
			<p class="fp-exam-eyebrow">Diplôme d'études en langue française</p>
			<h1 class="fp-exam-title">{examName} {examLevel} — Épreuve blanche</h1>
		</div>
		{#if phase === 'section'}
			<ExamTimer totalSeconds={EXAM_SECONDS} onExpire={() => void finishExam()} />
		{:else}
			<div class="fp-exam-badge">
				<span>{examLevel}</span>
				<small>CEFR</small>
			</div>
		{/if}
	</header>

	{#if phase === 'intro'}
		<p class="mt-4 text-muted">{m.exam_intro_desc()}</p>
		<ul class="mt-4 space-y-1 text-sm text-muted">
			{#each sections as s (s.skill)}
				<li>• {s.title}</li>
			{/each}
		</ul>
		<button
			type="button"
			class="btn-primary mt-6 w-full"
			data-testid="start-exam"
			onclick={() => (phase = 'section')}
		>
			{m.exam_start()}
		</button>
	{:else if phase === 'section' && section}
		<p class="mt-2 text-xs font-semibold tracking-wide text-primary uppercase">
			Section {sectionIndex + 1} / {sections.length} · {section.skill}
		</p>
		<h2 class="mt-1 text-xl font-bold text-foreground">{section.title}</h2>
		<p class="mt-1 text-sm text-muted">{section.instructions}</p>

		{#if isObjective && objItem}
			<p class="mt-4 mb-2 text-sm text-muted">
				Question {itemIndex + 1} of {'items' in section ? section.items.length : 0}
			</p>
			{#key objItem.id}
				<Exercise exercise={objItem} bind:response {submitted} lexicon={new Map()} />
			{/key}
			{#if submitted}
				<button
					type="button"
					class="btn-primary mt-5 w-full"
					data-testid="exam-continue"
					onclick={advanceObjective}
				>
					{m.exam_continue()}
				</button>
			{:else}
				<button
					type="button"
					class="btn-primary mt-5 w-full"
					data-testid="exam-check"
					disabled={response === null}
					onclick={checkItem}>{m.exam_check()}</button
				>
			{/if}
		{:else if section && 'prompt' in section}
			<p class="surface-card mt-4 rounded-xl bg-subtle p-4 text-foreground">{section.prompt}</p>
			<textarea
				class="field-input mt-3"
				rows="4"
				placeholder="Write or note your answer here (not graded automatically)…"
			></textarea>
			<button
				type="button"
				class="btn-secondary mt-3 text-sm"
				onclick={() => (modelShown = !modelShown)}
			>
				{modelShown ? m.exam_hide_model() : m.exam_show_model()}
			</button>
			{#if modelShown}
				<p class="feedback-correct mt-2 rounded-lg p-3 text-sm italic">{section.modelAnswer}</p>
			{/if}
			<fieldset class="mt-4">
				<legend class="text-sm font-semibold text-foreground">{m.exam_self_assess()}</legend>
				<div class="mt-2 space-y-2">
					{#each section.rubric as item, i (i)}
						<label class="flex items-start gap-2 text-sm text-foreground">
							<input
								type="checkbox"
								class="mt-0.5 h-4 w-4 accent-primary"
								bind:checked={checkedRubric[i]}
							/>
							{item}
						</label>
					{/each}
				</div>
			</fieldset>
			<button
				type="button"
				class="btn-primary mt-5 w-full"
				data-testid="exam-submit-section"
				onclick={submitProductive}
			>
				{m.exam_submit_section()}
			</button>
		{/if}
	{:else if phase === 'result' && result}
		<div
			class="surface-card mt-4 rounded-2xl p-6 lg:mx-auto lg:max-w-2xl"
			data-testid="exam-result"
		>
			<p class="text-center text-5xl">{result.passed ? '🎓' : '📚'}</p>
			<h1 class="mt-2 text-center text-2xl font-bold text-foreground">
				{result.total} / 100 — {result.passed ? m.exam_pass() : m.exam_not_yet()}
			</h1>
			<div class="mt-3 flex justify-center">
				{#if result.passed}
					<span class="fp-admis-stamp">ADMIS</span>
				{:else}
					<span class="fp-recale-stamp">RECALÉ</span>
				{/if}
			</div>
			{#if result.passed && xpAwarded > 0}
				<p class="mt-1 text-center text-sm font-medium text-primary">+{xpAwarded} XP</p>
			{/if}
			{#if result.eliminated && !result.passed}
				<p class="mt-1 text-center text-sm text-red-600 dark:text-red-400">{m.exam_eliminated()}</p>
			{/if}
			<ul class="mt-5 space-y-3">
				{#each Object.entries(result.perSkill) as [skill, score] (skill)}
					<li>
						<div class="flex justify-between text-sm">
							<span class="text-foreground capitalize">{skill}</span>
							<span class={score < 5 ? 'text-red-600 dark:text-red-400' : 'text-muted'}
								>{score} / 25</span
							>
						</div>
						<div class="mt-1 h-2 overflow-hidden rounded-full bg-subtle">
							<div
								class="h-full rounded-full"
								style="width: {(score / 25) * 100}%; background: {score < 5
									? '#b23232'
									: 'var(--fp-navy)'}"
							></div>
						</div>
					</li>
				{/each}
			</ul>
			{#if result.passed}
				<button
					type="button"
					class="btn-secondary mt-6 w-full"
					data-testid="share-exam"
					onclick={() =>
						shareProgress({
							title: `FrenchPath ${exam.title}`,
							subtitle: `Score ${result?.total}/100`,
							milestone: `${exam.title} passed`
						})}
				>
					{m.share_progress()}
				</button>
			{/if}
			<a class="btn-primary mt-4 block text-center" href={resolve('/')}>{m.common_back_to_path()}</a
			>
		</div>
	{/if}
</main>

<CelebrationOverlay
	request={celebration}
	{celebrationLevel}
	{reduceMotion}
	onDismiss={() => (celebration = null)}
/>
