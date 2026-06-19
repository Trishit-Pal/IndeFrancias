<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		progressRepo,
		statsRepo,
		streakRepo,
		srsRepo,
		skillProfileRepo,
		assessmentsRepo,
		settingsRepo
	} from '$lib/db';
	import type { AssessmentRecord, Skill, SkillProfileRecord } from '$lib/db/schema';
	import { countDue } from '$lib/srs/queue';
	import { todayKey, lastNDayKeys } from '$lib/utils/date';
	import { shareProgress } from '$lib/share/shareCard';
	import CharacterCoco from '$lib/components/CharacterCoco.svelte';
	import * as m from '$lib/paraglide/messages';

	let streak = $state(0);
	let longestStreak = $state(0);
	let todayXp = $state(0);
	let completed = $state(0);
	let totalCards = $state(0);
	let due = $state(0);
	let weekXp = $state<{ label: string; xp: number }[]>([]);
	let skillProfiles = $state<SkillProfileRecord[]>([]);
	let assessments = $state<AssessmentRecord[]>([]);
	let targetExamDate = $state<string | null>(null);
	let weekReviewed = $state(0);
	let totalXp = $state(0);
	let heatmap = $state<{ date: string; xp: number }[]>([]);

	const SKILL_LABELS: Record<Skill, string> = {
		listening: 'Listening',
		reading: 'Reading',
		spokenInteraction: 'Speaking (interaction)',
		spokenProduction: 'Speaking (production)',
		writing: 'Writing'
	};

	const SKILL_COLORS: Record<Skill, string> = {
		listening: 'var(--fp-seine)',
		reading: 'var(--fp-sage)',
		spokenInteraction: 'var(--fp-jaipur)',
		spokenProduction: 'var(--fp-terracotta)',
		writing: 'var(--fp-saffron)'
	};

	// 12-week practice heatmap (GitHub-style) shading thresholds.
	const HEAT_COLORS = ['#ede1cf', '#cfe0c2', '#9dbe85', '#5f8c46'];
	function heatLevel(xp: number): number {
		if (xp <= 0) return 0;
		if (xp < 20) return 1;
		if (xp < 50) return 2;
		return 3;
	}

	// Coco companion grows with cumulative XP (chef hat at Niveau 5).
	const cocoLevel = $derived(Math.min(10, Math.floor(totalXp / 250) + 1));
	const cocoXpPercent = $derived(((totalXp % 250) / 250) * 100);
	const xpToNextLevel = $derived(cocoLevel >= 10 ? 0 : 250 - (totalXp % 250));

	const weakestSkill = $derived(
		[...skillProfiles].sort(
			(a, b) =>
				['A1', 'A2', 'B1', 'B2', 'C1'].indexOf(a.estimatedLevel) -
				['A1', 'A2', 'B1', 'B2', 'C1'].indexOf(b.estimatedLevel)
		)[0]
	);

	const examCountdown = $derived(() => {
		if (!targetExamDate) return null;
		const days = Math.ceil(
			(new Date(targetExamDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		);
		return days > 0 ? days : 0;
	});

	onMount(async () => {
		const settings = await settingsRepo.getSettings();
		targetExamDate = settings.targetExamDate;
		const streakRecord = await streakRepo.getStreak();
		streak = streakRecord.currentStreak;
		longestStreak = streakRecord.longestStreak;
		todayXp = (await statsRepo.getStats(todayKey())).xp;
		completed = (await progressRepo.getAllProgress()).filter(
			(p) => p.status === 'completed'
		).length;
		totalCards = await srsRepo.countCards();
		due = await countDue();
		assessments = (await assessmentsRepo.listAssessments()).sort(
			(a, b) => b.completedAt - a.completedAt
		);

		const allStats = await statsRepo.getAllStats();
		const statsByDate = new Map(allStats.map((s) => [s.date, s] as const));
		const keys = lastNDayKeys(7);
		weekXp = keys.map((date) => ({
			label: date.slice(5),
			xp: statsByDate.get(date)?.xp ?? 0
		}));
		weekReviewed = keys.reduce((sum, date) => sum + (statsByDate.get(date)?.reviewsDone ?? 0), 0);
		totalXp = allStats.reduce((sum, s) => sum + (s.xp ?? 0), 0);
		heatmap = lastNDayKeys(84).map((date) => ({ date, xp: statsByDate.get(date)?.xp ?? 0 }));
		skillProfiles = await skillProfileRepo.getAllSkillProfiles();
	});

	const maxWeekXp = $derived(Math.max(1, ...weekXp.map((d) => d.xp)));

	const stats = $derived([
		{ label: m.stat_streak(), value: streak, icon: '🔥' },
		{ label: m.stat_xp(), value: todayXp, icon: '⭐' },
		{ label: m.stat_lessons(), value: completed, icon: '✅' },
		{ label: m.stat_cards(), value: totalCards, icon: '🧠' },
		{ label: m.stat_due(), value: due, icon: '🔁' }
	]);

	function assessmentLabel(a: AssessmentRecord): string {
		if (a.kind === 'delf_mock') {
			if (a.refId === 'b1') return 'DELF B1 mock';
			if (a.refId === 'b2') return 'DELF B2 mock';
			if (a.refId === 'c1') return 'DALF C1 mock';
			return 'DELF A2 mock';
		}
		if (a.kind === 'cefr_milestone') return `Milestone ${a.refId}`;
		return `Checkpoint ${a.refId}`;
	}
</script>

<svelte:head><title>L'Atelier · FrenchPath</title></svelte:head>

<main class="page-shell">
	<h1
		class="text-foreground"
		style="font-family: var(--fp-font-display); font-size: 38px; font-weight: 400; line-height: 1.1"
	>
		L'Atelier
	</h1>
	<p class="text-sm" style="color: var(--fp-muted)">{m.progress_subtitle()}</p>

	{#if examCountdown() !== null}
		<p class="mt-2 text-sm font-medium text-primary" data-testid="exam-countdown">
			Exam in {examCountdown()} day{examCountdown() === 1 ? '' : 's'}
		</p>
	{/if}

	<div class="mt-5 lg:grid lg:grid-cols-3 lg:gap-6">
		<section class="surface-card p-4 lg:col-span-2" aria-label={m.progress_xp_chart()}>
			<h2 class="text-sm font-semibold text-foreground">{m.progress_xp_chart()}</h2>
			<div
				class="mt-4 flex items-end justify-between gap-2 md:gap-3"
				style="height: 8rem"
				data-testid="xp-chart"
			>
				{#each weekXp as day (day.label)}
					<div class="flex flex-1 flex-col items-center gap-1">
						<div
							class="fp-progress-fill w-full max-w-10 rounded-t bg-primary"
							style="height: {Math.max(4, (day.xp / maxWeekXp) * 120)}px"
							title="{day.xp} XP"
							role="img"
							aria-label="{day.label}: {day.xp} XP"
						></div>
						<span class="text-[10px] text-muted md:text-xs">{day.label}</span>
					</div>
				{/each}
			</div>
			<p class="mt-3 text-xs text-muted" data-testid="weekly-reviews">
				Weekly reviews completed: {weekReviewed}
			</p>
		</section>

		<div class="mt-5 grid gap-3 lg:col-span-1 lg:mt-0">
			<div class="surface-card p-4">
				<p class="text-sm text-muted">{m.progress_longest_streak()}</p>
				<p
					class="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-400"
					data-testid="longest-streak"
				>
					🔥 {longestStreak}
				</p>
			</div>
			<div class="surface-card p-4">
				<p class="text-sm text-muted">{m.progress_review_forecast()}</p>
				<p class="mt-1 text-2xl font-bold text-primary" data-testid="review-forecast">
					{due}
				</p>
				{#if due > 0}
					<a
						class="mt-2 inline-block text-sm font-medium text-primary hover:underline"
						href={resolve('/review')}
					>
						{m.nav_review()} →
					</a>
				{/if}
			</div>
			<button
				type="button"
				class="btn-secondary w-full text-sm"
				data-testid="share-progress"
				onclick={() =>
					shareProgress({
						title: 'FrenchPath progress',
						subtitle: `${completed} lessons · ${streak}-day streak`,
						streak,
						xp: todayXp
					})}
			>
				Share progress card
			</button>
		</div>
	</div>

	<ul class="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
		{#each stats as stat (stat.label)}
			<li class="fp-stat-card">
				<span class="text-xl md:text-2xl">{stat.icon}</span>
				<span class="fp-stat-num" style="font-family: var(--fp-font-display)">{stat.value}</span>
				<span class="fp-stat-lbl">{stat.label}</span>
			</li>
		{/each}
	</ul>

	<section class="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-1">
		{#if skillProfiles.length > 0}
			<div class="surface-card p-4 md:col-span-2 lg:col-span-1" data-testid="skill-profile">
				<h2 class="text-sm font-semibold text-foreground">{m.progress_skills()}</h2>
				{#if weakestSkill}
					<p class="mt-1 text-xs text-muted" data-testid="weak-skill">
						Focus area: {SKILL_LABELS[weakestSkill.skill]} ({weakestSkill.estimatedLevel})
						<a class="text-primary underline" href={resolve('/review')}>Review →</a>
					</p>
				{/if}
				<ul class="mt-3 space-y-3">
					{#each skillProfiles as profile (profile.skill)}
						<li>
							<div class="flex justify-between text-sm">
								<span class="text-foreground">{SKILL_LABELS[profile.skill]}</span>
								<span class="font-medium text-primary">{profile.estimatedLevel}</span>
							</div>
							<div
								class="mt-1 h-2.5 overflow-hidden rounded-full"
								style="border: 1.5px solid var(--fp-ink); background: var(--fp-paper-warm)"
							>
								<div
									class="fp-progress-fill h-full rounded-full"
									style="width: {(['A1', 'A2', 'B1', 'B2', 'C1'].indexOf(profile.estimatedLevel) +
										1) *
										20}%; background: {SKILL_COLORS[profile.skill]}"
								></div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if assessments.length > 0}
			<div class="surface-card p-4" data-testid="assessment-history">
				<h2 class="text-sm font-semibold text-foreground">Assessment history</h2>
				<ul class="mt-3 divide-y divide-border text-sm">
					{#each assessments as a (a.assessmentId)}
						<li class="flex justify-between py-2">
							<span class="text-foreground">{assessmentLabel(a)}</span>
							<span class="text-muted">{a.score}% · +{a.xpAwarded} XP</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>

	<section class="mt-5 grid gap-5 lg:grid-cols-3">
		<div class="surface-card p-4 lg:col-span-2">
			<h2 style="font-family: var(--fp-font-display); font-size: 18px">Activité · 12 semaines</h2>
			<div class="fp-heatmap mt-3" role="img" aria-label="Practice activity, last 84 days">
				{#each heatmap as cell (cell.date)}
					<span
						class="fp-heat-cell"
						style="background: {HEAT_COLORS[heatLevel(cell.xp)]}"
						title="{cell.date}: {cell.xp} XP"
					></span>
				{/each}
			</div>
		</div>

		<div class="surface-card p-4 text-center">
			<CharacterCoco size="lg" level={cocoLevel} animate={true} />
			<p style="font-family: var(--fp-font-display); font-size: 18px">Coco · Niveau {cocoLevel}</p>
			<div class="fp-progress-bar mt-2">
				<div class="fp-progress-fill" style="width: {cocoXpPercent}%"></div>
			</div>
			<p
				style="font-family: var(--fp-font-mono); font-size: 10px; color: var(--fp-muted); margin-top: 6px"
			>
				{#if cocoLevel < 10}{xpToNextLevel} XP → Niveau {cocoLevel + 1}{:else}Niveau max ⭐{/if}
			</p>
		</div>
	</section>
</main>
