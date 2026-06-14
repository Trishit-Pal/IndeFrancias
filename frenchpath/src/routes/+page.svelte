<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { listUnitSummaries } from '$lib/content/loader';
	import { progressRepo, streakRepo, settingsRepo, skillProfileRepo } from '$lib/db';
	import type { ProgressRecord } from '$lib/db/schema';
	import { countDue } from '$lib/srs/queue';
	import { passedAssessmentIds } from '$lib/assessment/checkpoint';
	import {
		availableGates,
		buildLockReasonMap,
		computeUnitStates,
		delfUnlocked,
		delfB1Unlocked,
		delfB2Unlocked,
		dalfC1Unlocked
	} from '$lib/lesson/progression';
	import PathScene from '$lib/path/PathScene.svelte';
	import GateBanner from '$lib/components/GateBanner.svelte';
	import WeakSkillChips from '$lib/components/WeakSkillChips.svelte';
	import CelebrationOverlay from '$lib/celebration/CelebrationOverlay.svelte';
	import type { CelebrationRequest } from '$lib/celebration/orchestrator';
	import { getNextDueMs } from '$lib/srs/queue';
	import { dailyGoalProgress, type DailyGoal } from '$lib/gamification/activity';
	import { ensurePersistence } from '$lib/pwa/persist';
	import type OnboardingWizardComponent from '$lib/components/OnboardingWizard.svelte';
	import CoachTip from '$lib/components/CoachTip.svelte';
	import { suggestUnitForWeakSkill } from '$lib/gamification/adaptiveSuggestions';
	import type { SkillProfileRecord } from '$lib/db/schema';
	import { homeSubtitleForGoal } from '$lib/profile/goalCopy';
	import * as m from '$lib/paraglide/messages';

	const units = listUnitSummaries();
	let progressById = $state<Record<string, ProgressRecord>>({});
	let due = $state(0);
	let streak = $state(0);
	let freezesAvailable = $state(3);
	let goal = $state<DailyGoal>({ xp: 0, goal: 30, met: false });
	let loaded = $state(false);
	let onboarded = $state(false);
	let learningGoal = $state<import('$lib/db/schema').LearningGoal>('general');
	let targetExamDate = $state<string | null>(null);
	let reduceMotion = $state(false);
	let celebrationLevel = $state<'full' | 'minimal'>('full');
	let passedIds = $state<Set<string>>(new Set());
	let nextReviewIn = $state<string | null>(null);
	let celebration = $state<CelebrationRequest | null>(null);
	let skillProfiles = $state<SkillProfileRecord[]>([]);
	let OnboardingWizard = $state<typeof OnboardingWizardComponent | null>(null);

	const states = $derived(computeUnitStates(units, progressById, passedIds));
	const lockReasons = $derived(buildLockReasonMap(units, progressById, passedIds));
	const openGates = $derived(availableGates(progressById, passedIds));
	const goalPercent = $derived(
		goal.goal === 0 ? 0 : Math.min(100, Math.round((goal.xp / goal.goal) * 100))
	);
	const homeSubtitle = $derived(homeSubtitleForGoal(learningGoal, targetExamDate));
	const a2Completed = $derived(delfUnlocked(passedIds));
	const b1Completed = $derived(delfB1Unlocked(passedIds));
	const b2Completed = $derived(delfB2Unlocked(passedIds));
	const c1ExamUnlocked = $derived(dalfC1Unlocked(passedIds));
	const currentUnitId = $derived(
		units.find((u) => (states.get(u.id) ?? 'locked') === 'available')?.id
	);
	const pendingGate = $derived(openGates[0] ?? null);
	const adaptiveTip = $derived(
		suggestUnitForWeakSkill(units, skillProfiles, states)?.reason ?? null
	);

	async function checkStreakMilestones(
		currentStreak: number,
		celebrated: number[]
	): Promise<number[]> {
		const milestones = [7, 30] as const;
		let updated = [...celebrated];
		for (const milestone of milestones) {
			if (currentStreak >= milestone && !updated.includes(milestone)) {
				celebration = {
					event: milestone === 7 ? 'streak_7' : 'streak_30',
					title: `${milestone}-day streak!`,
					subtitle: 'Keep the momentum going.'
				};
				updated = [...updated, milestone];
			}
		}
		if (updated.length !== celebrated.length) {
			await settingsRepo.saveSettings({ celebratedMilestones: updated });
		}
		return updated;
	}

	onMount(async () => {
		const [s, all, dueCount, streakRecord, goalProgress, passed, profiles, nextDue] =
			await Promise.all([
				settingsRepo.getSettings(),
				progressRepo.getAllProgress(),
				countDue(),
				streakRepo.getStreak(),
				dailyGoalProgress(),
				passedAssessmentIds(),
				skillProfileRepo.getAllSkillProfiles(),
				getNextDueMs()
			]);

		onboarded = s.onboarded;
		learningGoal = s.learningGoal;
		targetExamDate = s.targetExamDate;
		reduceMotion = s.reduceMotion;
		celebrationLevel = s.celebrationLevel;
		progressById = Object.fromEntries(all.map((p) => [p.lessonId, p]));
		due = dueCount;
		streak = streakRecord.currentStreak;
		freezesAvailable = streakRecord.freezesAvailable;
		goal = goalProgress;
		passedIds = passed;
		skillProfiles = profiles;
		nextReviewIn = nextDue;
		await checkStreakMilestones(streakRecord.currentStreak, s.celebratedMilestones ?? []);
		if (!s.onboarded) {
			const mod = await import('$lib/components/OnboardingWizard.svelte');
			OnboardingWizard = mod.default;
		}
		loaded = true;
	});

	async function finishOnboarding(profile: Partial<import('$lib/db/schema').Settings>) {
		onboarded = true;
		if (profile.learningGoal) learningGoal = profile.learningGoal;
		if (profile.targetExamDate !== undefined) targetExamDate = profile.targetExamDate;
		await settingsRepo.saveSettings(profile);
		goal = await dailyGoalProgress();
		void ensurePersistence();
	}
</script>

<svelte:head><title>FrenchPath — Learn French</title></svelte:head>

{#if !loaded}
	<main class="page-shell">
		<p class="text-muted">Loading…</p>
	</main>
{:else if !onboarded && OnboardingWizard}
	<OnboardingWizard onComplete={finishOnboarding} {reduceMotion} />
{:else}
	<main class="page-shell fp-parallax-bg">
		<header class="flex flex-wrap items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<img src="/icon.svg" alt="" class="h-10 w-10 rounded-lg shadow-sm lg:hidden" />
				<div>
					<h1 class="text-2xl font-bold text-foreground md:text-3xl lg:sr-only">FrenchPath</h1>
					<p class="text-sm text-muted lg:sr-only">{homeSubtitle}</p>
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
							class="fp-progress-fill h-full rounded-full {goal.met
								? 'bg-green-500'
								: 'bg-primary'}"
							style="width: {goalPercent}%"
							data-testid="daily-goal-bar"
						></div>
					</div>
				</section>

				{#if nextReviewIn}
					<p class="text-sm text-muted" data-testid="next-review">
						{m.home_next_review({ time: nextReviewIn })}
					</p>
				{/if}

				{#if pendingGate}
					<GateBanner reason={m.gate_banner_reason({ label: pendingGate.label })} />
				{/if}

				<WeakSkillChips />

				{#if adaptiveTip}
					<CoachTip tip={adaptiveTip} />
				{/if}

				{#each openGates as gate (gate.id)}
					<a
						href={resolve('/checkpoint/[groupId]', { groupId: gate.id })}
						class="btn-primary flex items-center justify-between"
						data-testid="checkpoint-node-{gate.id}"
					>
						<span>📝 {gate.label}</span>
						<span aria-hidden="true">→</span>
					</a>
				{/each}

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

				{#if b1Completed}
					<a
						href={resolve('/exam/delf-b1')}
						class="block rounded-xl border border-primary/40 bg-blue-50 p-4 transition hover:border-primary dark:bg-blue-950/40"
						data-testid="delf-b1-card"
					>
						<span class="text-sm font-semibold text-primary">Mock DELF B1</span>
						<p class="mt-1 text-sm text-muted">Intermediate four-skill mock exam.</p>
					</a>
				{/if}

				{#if b2Completed}
					<a
						href={resolve('/exam/delf-b2')}
						class="block rounded-xl border border-primary/40 bg-blue-50 p-4 transition hover:border-primary dark:bg-blue-950/40"
						data-testid="delf-b2-card"
					>
						<span class="text-sm font-semibold text-primary">Mock DELF B2</span>
						<p class="mt-1 text-sm text-muted">Upper-intermediate mock with argumentation tasks.</p>
					</a>
				{/if}

				{#if c1ExamUnlocked}
					<a
						href={resolve('/exam/dalf-c1')}
						class="block rounded-xl border border-primary/40 bg-blue-50 p-4 transition hover:border-primary dark:bg-blue-950/40"
						data-testid="dalf-c1-card"
					>
						<span class="text-sm font-semibold text-primary">Mock DALF C1</span>
						<p class="mt-1 text-sm text-muted">Advanced synthesis, essay, and exposé practice.</p>
					</a>
				{/if}
			</div>

			<div>
				<h2 class="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
					{m.home_your_path()}
				</h2>
				<PathScene {units} {states} {progressById} {lockReasons} {currentUnitId} {reduceMotion} />
			</div>
		</div>
	</main>
{/if}

<CelebrationOverlay
	request={celebration}
	{celebrationLevel}
	{reduceMotion}
	onDismiss={() => (celebration = null)}
/>
