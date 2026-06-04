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

	// objective sub-state
	let itemIndex = $state(0);
	let response = $state<ExerciseResponse | null>(null);
	let submitted = $state(false);
	let correctInSection = $state(0);

	// productive sub-state
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
		const rating = checkedRubric.filter(Boolean).length; // 0–5
		nextSection(productiveSkillScore(rating));
	}
</script>

<svelte:head><title>Mock DELF A2 · FrenchPath</title></svelte:head>

<main class="mx-auto min-h-dvh max-w-xl px-4 py-6">
	<a class="text-sm text-slate-500 hover:underline" href={resolve('/')}>{m.common_home()}</a>

	{#if phase === 'intro'}
		<h1 class="mt-2 text-2xl font-bold text-slate-900">{DELF_A2.title}</h1>
		<p class="mt-2 text-slate-600">{m.exam_intro_desc()}</p>
		<ul class="mt-4 space-y-1 text-sm text-slate-500">
			{#each sections as s (s.skill)}
				<li>• {s.title}</li>
			{/each}
		</ul>
		<button
			type="button"
			class="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
			data-testid="start-exam"
			onclick={() => (phase = 'section')}>{m.exam_start()}</button
		>
	{:else if phase === 'section' && section}
		<p class="mt-2 text-xs font-semibold tracking-wide text-blue-600 uppercase">
			Section {sectionIndex + 1} / {sections.length} · {section.skill}
		</p>
		<h2 class="mt-1 text-xl font-bold text-slate-900">{section.title}</h2>
		<p class="mt-1 text-sm text-slate-500">{section.instructions}</p>

		{#if isObjective && objItem}
			<p class="mt-4 mb-2 text-sm text-slate-500">
				Question {itemIndex + 1} of {'items' in section ? section.items.length : 0}
			</p>
			{#key objItem.id}
				<Exercise exercise={objItem} bind:response {submitted} />
			{/key}
			{#if submitted}
				<button
					type="button"
					class="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white"
					data-testid="exam-continue"
					onclick={advanceObjective}>{m.exam_continue()}</button
				>
			{:else}
				<button
					type="button"
					class="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:bg-slate-300"
					data-testid="exam-check"
					disabled={response === null}
					onclick={checkItem}>{m.exam_check()}</button
				>
			{/if}
		{:else if section && 'prompt' in section}
			<p class="mt-4 rounded-xl bg-slate-50 p-4 text-slate-900">{section.prompt}</p>
			<textarea
				class="mt-3 w-full rounded-lg border border-slate-300 p-3"
				rows="4"
				placeholder="Write or note your answer here (not graded automatically)…"
			></textarea>
			<button
				type="button"
				class="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-blue-400"
				onclick={() => (modelShown = !modelShown)}
			>
				{modelShown ? m.exam_hide_model() : m.exam_show_model()}
			</button>
			{#if modelShown}
				<p class="mt-2 rounded-lg bg-green-50 p-3 text-sm text-green-900 italic">
					{section.modelAnswer}
				</p>
			{/if}
			<fieldset class="mt-4">
				<legend class="text-sm font-semibold text-slate-700">{m.exam_self_assess()}</legend>
				<div class="mt-2 space-y-2">
					{#each section.rubric as item, i (i)}
						<label class="flex items-start gap-2 text-sm text-slate-700">
							<input type="checkbox" class="mt-0.5 h-4 w-4" bind:checked={checkedRubric[i]} />
							{item}
						</label>
					{/each}
				</div>
			</fieldset>
			<button
				type="button"
				class="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white"
				data-testid="exam-submit-section"
				onclick={submitProductive}>{m.exam_submit_section()}</button
			>
		{/if}
	{:else if phase === 'result' && result}
		<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-6" data-testid="exam-result">
			<p class="text-center text-5xl">{result.passed ? '🎓' : '📚'}</p>
			<h1 class="mt-2 text-center text-2xl font-bold text-slate-900">
				{result.total} / 100 — {result.passed ? m.exam_pass() : m.exam_not_yet()}
			</h1>
			{#if result.eliminated && !result.passed}
				<p class="mt-1 text-center text-sm text-red-700">{m.exam_eliminated()}</p>
			{/if}
			<ul class="mt-5 space-y-3">
				{#each Object.entries(result.perSkill) as [skill, score] (skill)}
					<li>
						<div class="flex justify-between text-sm">
							<span class="text-slate-700 capitalize">{skill}</span>
							<span class={score < 5 ? 'text-red-600' : 'text-slate-500'}>{score} / 25</span>
						</div>
						<div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
							<div
								class="h-full rounded-full {score < 5 ? 'bg-red-500' : 'bg-blue-500'}"
								style="width: {(score / 25) * 100}%"
							></div>
						</div>
					</li>
				{/each}
			</ul>
			<a
				class="mt-6 block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white"
				href={resolve('/')}>{m.common_back_to_path()}</a
			>
		</div>
	{/if}
</main>
