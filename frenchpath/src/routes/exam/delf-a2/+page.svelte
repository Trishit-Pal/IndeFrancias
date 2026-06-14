<script lang="ts">
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { DELF_A2 } from '../../../content/exams/delf-a2';
	import type { ExamSkill } from '$lib/exam/types';
	import { gradeExercise, type ExerciseResponse } from '$lib/lesson/engine';
	import {
		scoreExam,
		objectiveSkillScore,
		productiveSkillScore,
		type ExamResult
	} from '$lib/exam/score';
	import { recordDailyActivity } from '$lib/gamification/activity';
	import Exercise from '$lib/lesson/exercises/Exercise.svelte';

	const sections = DELF_A2.sections;

	let phase = $state<'intro' | 'section' | 'result'>('intro');
	let sectionIndex = $state(0);
	let perSkill = $state<Record<ExamSkill, number>>({
		listening: 0,
		reading: 0,
		writing: 0,
		speaking: 0
	});
	let result = $state<ExamResult | null>(null);

	let itemIndex = $state(0);
	let response = $state<ExerciseResponse | null>(null);
	let submitted = $state(false);
	let correctInSection = $state(0);

	let modelShown = $state(false);
	let checkedRubric = $state<boolean[]>([]);

	const section = $derived(sections[sectionIndex]);
	const isObjective = $derived(section && 'items' in section);
	const objItem = $derived(section && 'items' in section ? section.items[itemIndex] : null);

	function resetSubState() {
		itemIndex = 0;
		response = null;
		submitted = false;
		correctInSection = 0;
		modelShown = false;
		checkedRubric = [];
	}

	function nextSection(skillScore: number) {
		if (section) perSkill = { ...perSkill, [section.skill]: skillScore };
		if (sectionIndex + 1 < sections.length) {
			sectionIndex += 1;
			resetSubState();
		} else {
			result = scoreExam(perSkill);
			recordDailyActivity();
			phase = 'result';
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
			nextSection(objectiveSkillScore(correctInSection, section.items.length));
		}
	}

	function submitProductive() {
		const rating = checkedRubric.filter(Boolean).length;
		nextSection(productiveSkillScore(rating));
	}
</script>

<svelte:head><title>Mock DELF A2 · FrenchPath</title></svelte:head>

<main class="page-shell lg:max-w-3xl">
	<a class="text-sm text-muted hover:underline" href={resolve('/')}>{m.common_home()}</a>

	{#if phase === 'intro'}
		<h1 class="mt-2 text-2xl font-bold text-foreground md:text-3xl">{DELF_A2.title}</h1>
		<p class="mt-2 text-muted">{m.exam_intro_desc()}</p>
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
				<Exercise exercise={objItem} bind:response {submitted} />
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
								class="h-full rounded-full {score < 5 ? 'bg-red-500' : 'bg-primary'}"
								style="width: {(score / 25) * 100}%"
							></div>
						</div>
					</li>
				{/each}
			</ul>
			<a class="btn-primary mt-6 block text-center" href={resolve('/')}>{m.common_back_to_path()}</a
			>
		</div>
	{/if}
</main>
