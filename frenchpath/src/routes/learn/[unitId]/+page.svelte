<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { loadUnit, listUnitSummaries } from '$lib/content/loader';
	import { renderInlineMarkdown } from '$lib/content/markdown';
	import type { Unit } from '$lib/content/schema';
	import { gradeExercise, scorePercent, type ExerciseResponse } from '$lib/lesson/engine';
	import { completeLesson, type CompleteOutcome } from '$lib/lesson/complete';
	import { isUnitLocked } from '$lib/lesson/progression';
	import { progressRepo } from '$lib/db';
	import { ensurePersistence } from '$lib/pwa/persist';
	import RecordCompare from '$lib/audio/RecordCompare.svelte';
	import Exercise from '$lib/lesson/exercises/Exercise.svelte';
import { fly, fade } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages';

	type Phase = 'loading' | 'intro' | 'exercise' | 'finished' | 'error' | 'locked';

	let unit = $state<Unit | null>(null);
	let phase = $state<Phase>('loading');
	let errorMessage = $state('');

	let index = $state(0);
	let response = $state<ExerciseResponse | null>(null);
	let submitted = $state(false);
	let correct = $state(false);
	let correctCount = $state(0);
	let outcome = $state<CompleteOutcome | null>(null);

	const current = $derived(unit?.exercises[index] ?? null);
	const total = $derived(unit?.exercises.length ?? 0);
	const score = $derived(scorePercent(correctCount, total));
	const progress = $derived(total === 0 ? 0 : Math.round((index / total) * 100));

	onMount(async () => {
		try {
			const unitId = page.params.unitId ?? '';
			const all = await progressRepo.getAllProgress();
			const progressById = Object.fromEntries(all.map((p) => [p.lessonId, p]));
			if (isUnitLocked(unitId, listUnitSummaries(), progressById)) {
				phase = 'locked';
				return;
			}
			unit = await loadUnit(unitId);
			phase = 'intro';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Failed to load this lesson.';
			phase = 'error';
		}
	});

	function check() {
		if (!current || !response) return;
		correct = gradeExercise(current, response);
		if (correct) correctCount += 1;
		submitted = true;
	}

	async function advance() {
		if (!unit) return;
		if (index + 1 < unit.exercises.length) {
			index += 1;
			response = null;
			submitted = false;
			correct = false;
		} else {
			outcome = await completeLesson(unit, { correct: correctCount, total, score });
			await ensurePersistence();
			phase = 'finished';
		}
	}
</script>

<svelte:head><title>{unit ? unit.title : 'Lesson'} · FrenchPath</title></svelte:head>

<main class="mx-auto min-h-dvh max-w-xl px-4 py-6">
	{#if phase === 'loading'}
		<p class="text-slate-500">{m.lesson_loading()}</p>
	{:else if phase === 'error'}
		<div class="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
			<p class="font-semibold">Could not load the lesson</p>
			<p class="text-sm">{errorMessage}</p>
			<a class="mt-3 inline-block text-blue-700 underline" href={resolve('/')}>Back to home</a>
		</div>
	{:else if phase === 'locked'}
		<div
			class="rounded-xl border border-slate-300 bg-slate-50 p-6 text-center"
			data-testid="locked"
		>
			<p class="text-4xl">🔒</p>
			<p class="mt-2 font-semibold text-slate-800">{m.lesson_locked_title()}</p>
			<p class="text-sm text-slate-500">{m.lesson_locked_desc()}</p>
			<a
				class="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white"
				href={resolve('/')}>{m.common_back_to_path()}</a>
		</div>
	{:else if phase === 'intro' && unit}
		<a class="text-sm text-slate-500 hover:underline" href={resolve('/')}>{m.common_home()}</a>
		<span class="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
			{unit.cefrLevel}
		</span>
		<h1 class="mt-2 text-2xl font-bold text-slate-900">{unit.title}</h1>
		<p class="mt-2 text-slate-600">{unit.objective}</p>

		{#if unit.bridge}
			<section class="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
				<h2 class="font-semibold text-amber-900">🌉 {unit.bridge.title}</h2>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped + trusted bridge content -->
				<p class="mt-1 text-sm text-amber-900">{@html renderInlineMarkdown(unit.bridge.body)}</p>
			</section>
		{/if}

		{#if unit.cards.length}
			<section class="mt-5">
				<h2 class="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
					{m.lesson_new_words()}
				</h2>
				<ul class="divide-y divide-slate-100 rounded-xl border border-slate-200">
					{#each unit.cards as card (card.id)}
						<li class="flex items-center justify-between gap-3 px-4 py-3">
							<div>
								<p class="font-medium text-slate-900">
									{card.french}
									{#if card.gender !== 'none'}
										<span class="text-xs text-slate-400">({card.gender})</span>
									{/if}
								</p>
								<p class="text-sm text-slate-500">{card.englishGloss} · {card.hindiGloss}</p>
							</div>
							<RecordCompare text={card.french} label={card.french} />
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<button
			type="button"
			class="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
			data-testid="start-lesson"
			onclick={() => (phase = 'exercise')}
		>
			Start ({total} questions)
		</button>
	{:else if phase === 'exercise' && current}
		<div class="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
			<div class="h-full bg-blue-500 transition-all" style="width: {progress}%"></div>
		</div>
		<p class="mb-4 text-sm text-slate-500">Question {index + 1} of {total}</p>

		<div class="grid grid-cols-1 grid-rows-1">
    {#key current.id}
			        <div class="col-start-1 row-start-1" in:fly={{ x: 20, duration: 300 }} out:fly={{ x: -20, duration: 300 }}>
            <Exercise exercise={current} bind:response {submitted} />
        </div>
		{/key}
</div>

		{#if submitted}
			<div
				transition:fade={{ duration: 200 }}
				class="mt-5 rounded-xl p-3 text-sm font-medium {correct
					? 'bg-green-100 text-green-800 animate-spring-in'
					: 'bg-red-100 text-red-800 animate-shake'}"
				data-testid="feedback"
				role="status"
			>
				{correct ? m.lesson_correct() : m.lesson_incorrect()}
			</div>
			<button
				type="button"
				class="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
				data-testid="continue"
				onclick={advance}
			>
				{index + 1 < total ? m.lesson_continue() : m.lesson_finish()}
			</button>
		{:else}
			<button
				type="button"
				class="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
				data-testid="check"
				disabled={response === null}
				onclick={check}
			>
				{m.lesson_check()}
			</button>
		{/if}
	{:else if phase === 'finished'}
		<div class="rounded-2xl border border-slate-200 bg-white p-6 text-center" data-testid="summary">
			<p class="text-5xl">{score >= 80 ? '🎉' : '💪'}</p>
			<h1 class="mt-3 text-2xl font-bold text-slate-900">{m.lesson_complete()}</h1>
			<p class="mt-1 text-slate-600">
				You scored <span class="font-semibold text-slate-900">{score}%</span>
				({correctCount}/{total}).
			</p>
			{#if outcome && outcome.goalXp > 0}
				<p class="mt-1 text-sm font-medium text-green-700" data-testid="xp-awarded">
					{outcome.isNewBest ? 'New best!' : ''} +{outcome.goalXp} XP
				</p>
			{:else}
				<p class="mt-1 text-sm text-slate-500" data-testid="practice-note">
					Practice complete — no new XP (best: {outcome?.bestScore ?? score}%).
					<a class="text-blue-700 underline" href={resolve('/review')}>Review due cards</a>>
					to keep your streak.
				</p>
			{/if}
			<p class="mt-1 text-sm text-slate-500">{m.lesson_srs_note()}</p>
			<div class="mt-6 grid gap-3">
				<a
					class="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
					href={resolve('/review')}>{m.lesson_review_now()}</a>
				<a
					class="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700"
					href={resolve('/')}>{m.common_back_to_path()}</a>
			</div>
		</div>
	{/if}
	</main>

	<style>
		@keyframes shake {
			0%, 100% { transform: translateX(0); }
			25% { transform: translateX(-4px); }
			75% { transform: translateX(4px); }
		}

		@keyframes spring-in {
			0% { transform: scale(0.9); opacity: 0; }
			60% { transform: scale(1.05); opacity: 1; }
			100% { transform: scale(1); opacity: 1; }
		}

		.animate-shake {
			animation: shake 0.3s ease-in-out;
		}

		.animate-spring-in {
			animation: spring-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		}

		@media (prefers-reduced-motion: reduce) {
			.animate-shake, .animate-spring-in {
				animation: none !important;
				transform: none !important;
			}
		}
	</style>

