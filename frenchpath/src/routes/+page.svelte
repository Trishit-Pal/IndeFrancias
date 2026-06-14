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
		onboarded = true;
		await settingsRepo.saveSettings({ onboarded: true });
		void ensurePersistence();
	}
</script>

<svelte:head><title>FrenchPath — Learn French</title></svelte:head>

{#if !loaded}
	<main class="page-shell">
		<p class="text-muted">Loading…</p>
	</main>
{:else if !onboarded}
	<Onboarding onComplete={finishOnboarding} />
{:else}
	<main class="page-shell">
		<header class="flex flex-wrap items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<img src="/icon.svg" alt="" class="h-10 w-10 rounded-lg shadow-sm lg:hidden" />
				<div>
					<h1 class="text-2xl font-bold text-foreground md:text-3xl lg:sr-only">FrenchPath</h1>
					<p class="text-sm text-muted lg:sr-only">{m.home_subtitle()}</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div
					class="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800 dark:bg-orange-950 dark:text-orange-200"
					title={m.home_streak_freezes()}
					data-testid="streak-badge"
				>
					<span aria-hidden="true">🔥</span>
					<span>{streak}</span>
				</div>
				<div
					class="flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200"
					title={m.home_streak_freezes()}
					data-testid="freezes-badge"
				>
					<span aria-hidden="true">❄️</span>
					<span>{freezesAvailable}</span>
					<span class="sr-only">{m.home_streak_freezes()}</span>
				</div>
			</div>
		</header>

		<div class="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-6">
			<div class="space-y-4">
				<section class="surface-card p-4">
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium text-foreground">{m.home_daily_goal()}</span>
						<span class="text-muted" data-testid="daily-goal">
							{goal.xp} / {goal.goal} XP {goal.met ? '✓' : ''}
						</span>
					</div>
					<div class="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
						<div
							class="h-full rounded-full {goal.met ? 'bg-green-500' : 'bg-primary'}"
							style="width: {goalPercent}%"
						></div>
					</div>
				</section>

				{#if due > 0}
					<a
						href={resolve('/review')}
						class="btn-primary flex items-center justify-between"
						data-testid="due-badge"
					>
						<span>🔁 {due} card{due === 1 ? '' : 's'} due for review</span>
						<span aria-hidden="true">→</span>
					</a>
				{/if}

				{#if a2Completed}
					<a
						href={resolve('/exam/delf-a2')}
						class="block rounded-xl border border-primary/40 bg-blue-50 p-4 transition hover:border-primary dark:bg-blue-950/40"
						data-testid="delf-card"
					>
						<span class="text-sm font-semibold text-primary">{m.delf_title()}</span>
						<p class="mt-1 text-sm text-muted">{m.delf_desc()}</p>
					</a>
				{/if}
			</div>

			<div>
				<h2 class="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
					{m.home_your_path()}
				</h2>
				<ul class="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
					{#each units as unit (unit.id)}
						{@const status = states.get(unit.id) ?? 'locked'}
						{@const p = progressById[unit.id]}
						<li>
							{#if status === 'locked'}
								<div
									class="block cursor-not-allowed rounded-xl border border-border bg-subtle p-4 opacity-60"
									data-testid="unit-card"
									aria-disabled="true"
								>
									<div class="flex items-center justify-between">
										<span
											class="rounded-full bg-border px-2 py-0.5 text-xs font-semibold text-muted"
										>
											{unit.cefrLevel}
										</span>
										<span class="text-sm text-muted">{m.home_locked()}</span>
									</div>
									<h3 class="mt-2 font-semibold text-muted">{unit.title}</h3>
									<p class="mt-1 text-sm text-muted">{m.home_locked_hint()}</p>
								</div>
							{:else}
								<a
									href={resolve('/learn/[unitId]', { unitId: unit.id })}
									class="surface-card block p-4 transition hover:border-primary hover:shadow-sm"
									data-testid="unit-card"
								>
									<div class="flex items-center justify-between">
										<span
											class="rounded-full bg-subtle px-2 py-0.5 text-xs font-semibold text-muted"
										>
											{unit.cefrLevel}
										</span>
										{#if status === 'completed'}
											<span class="text-sm font-medium text-green-600 dark:text-green-400"
												>✓ {p?.score ?? 0}%</span
											>
										{:else}
											<span class="text-sm font-medium text-primary">{m.home_start()}</span>
										{/if}
									</div>
									<h3 class="mt-2 font-semibold text-foreground">{unit.title}</h3>
									<p class="mt-1 text-sm text-muted">{unit.objective}</p>
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</main>
{/if}
