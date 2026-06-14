<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { listUnitSummaries } from '$lib/content/loader';
	import { progressRepo, streakRepo, settingsRepo } from '$lib/db';
	import type { ProgressRecord } from '$lib/db/schema';
	import { countDue } from '$lib/srs/queue';
	import { computeUnitStates } from '$lib/lesson/progression';
	import { dailyGoalProgress, type DailyGoal } from '$lib/gamification/activity';
	import { ensurePersistence } from '$lib/pwa/persist';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import * as m from '$lib/paraglide/messages';

	const units = listUnitSummaries();
	let progressById = $state<Record<string, ProgressRecord>>({});
	let due = $state(0);
	let streak = $state(0);
	let freezesAvailable = $state(3);
	let goal = $state<DailyGoal>({ xp: 0, goal: 30, met: false });
	let loaded = $state(false);
	let onboarded = $state(false);

	const states = $derived(computeUnitStates(units, progressById));
	const goalPercent = $derived(
		goal.goal === 0 ? 0 : Math.min(100, Math.round((goal.xp / goal.goal) * 100))
	);
	// The mock DELF A2 unlocks once the learner finishes an A2 unit.
	const a2Completed = $derived(
		Object.values(progressById).some((p) => p.status === 'completed' && p.cefrLevel === 'A2')
	);

	onMount(async () => {
		onboarded = (await settingsRepo.getSettings()).onboarded;
		const all = await progressRepo.getAllProgress();
		progressById = Object.fromEntries(all.map((p) => [p.lessonId, p]));
		due = await countDue();
		const streakRecord = await streakRepo.getStreak();
		streak = streakRecord.currentStreak;
		freezesAvailable = streakRecord.freezesAvailable;
		goal = await dailyGoalProgress();
		loaded = true;
	});

	async function finishOnboarding() {
		onboarded = true; // dismiss the welcome immediately
		await settingsRepo.saveSettings({ onboarded: true });
		void ensurePersistence(); // request persistence in the background
	}
</script>

<svelte:head><title>FrenchPath — Learn French</title></svelte:head>

{#if !loaded}
	<main class="mx-auto min-h-dvh max-w-xl px-4 py-6">
		<p class="text-slate-400">Loading…</p>
	</main>
{:else if !onboarded}
	<Onboarding onComplete={finishOnboarding} />
{:else}
	<main class="mx-auto min-h-dvh max-w-xl px-4 py-6">
		<header class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<img src="/icon.svg" alt="" class="h-10 w-10 rounded-lg shadow-sm" />
				<div>
					<h1 class="text-2xl font-bold text-slate-900">FrenchPath</h1>
					<p class="text-sm text-slate-500">{m.home_subtitle()}</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div
					class="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800"
					title={m.home_streak_freezes()}
					data-testid="streak-badge"
				>
					<span aria-hidden="true">🔥</span>
					<span>{streak}</span>
				</div>
				<div
					class="flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800"
					title={m.home_streak_freezes()}
					data-testid="freezes-badge"
				>
					<span aria-hidden="true">❄️</span>
					<span>{freezesAvailable}</span>
					<span class="sr-only">{m.home_streak_freezes()}</span>
				</div>
			</div>
		</header>

		<section class="mt-5 rounded-xl border border-slate-200 bg-white p-4">
			<div class="flex items-center justify-between text-sm">
				<span class="font-medium text-slate-700">{m.home_daily_goal()}</span>
				<span class="text-slate-500" data-testid="daily-goal">
					{goal.xp} / {goal.goal} XP {goal.met ? '✓' : ''}
				</span>
			</div>
			<div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
				<div
					class="h-full rounded-full {goal.met ? 'bg-green-500' : 'bg-blue-500'}"
					style="width: {goalPercent}%"
				></div>
			</div>
		</section>

		{#if due > 0}
			<a
				href={resolve('/review')}
				class="mt-4 flex items-center justify-between rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
				data-testid="due-badge"
			>
				<span>🔁 {due} card{due === 1 ? '' : 's'} due for review</span>
				<span aria-hidden="true">→</span>
			</a>
		{/if}

		<h2 class="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
			{m.home_your_path()}
		</h2>
		<ul class="space-y-3">
			{#each units as unit (unit.id)}
				{@const status = states.get(unit.id) ?? 'locked'}
				{@const p = progressById[unit.id]}
				<li>
					{#if status === 'locked'}
						<div
							class="block cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-60"
							data-testid="unit-card"
							aria-disabled="true"
						>
							<div class="flex items-center justify-between">
								<span
									class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500"
								>
									{unit.cefrLevel}
								</span>
								<span class="text-sm text-slate-400">{m.home_locked()}</span>
							</div>
							<h3 class="mt-2 font-semibold text-slate-500">{unit.title}</h3>
							<p class="mt-1 text-sm text-slate-400">{m.home_locked_hint()}</p>
						</div>
					{:else}
						<a
							href={resolve('/learn/[unitId]', { unitId: unit.id })}
							class="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm"
							data-testid="unit-card"
						>
							<div class="flex items-center justify-between">
								<span
									class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
								>
									{unit.cefrLevel}
								</span>
								{#if status === 'completed'}
									<span class="text-sm font-medium text-green-600">✓ {p?.score ?? 0}%</span>
								{:else}
									<span class="text-sm font-medium text-blue-600">{m.home_start()}</span>
								{/if}
							</div>
							<h3 class="mt-2 font-semibold text-slate-900">{unit.title}</h3>
							<p class="mt-1 text-sm text-slate-500">{unit.objective}</p>
						</a>
					{/if}
				</li>
			{/each}
		</ul>

		{#if a2Completed}
			<a
				href={resolve('/exam/delf-a2')}
				class="mt-4 block rounded-xl border border-blue-300 bg-blue-50 p-4 transition hover:border-blue-400"
				data-testid="delf-card"
			>
				<span class="text-sm font-semibold text-blue-800">{m.delf_title()}</span>
				<p class="mt-1 text-sm text-slate-600">{m.delf_desc()}</p>
			</a>
		{/if}
	</main>
{/if}
