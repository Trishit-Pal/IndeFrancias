<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import {
		NATIVE_LANGUAGES,
		NATIVE_LANGUAGE_LABELS,
		type NativeLanguage,
		type LearningGoal,
		type DailyGoalPreset,
		xpFromPreset,
		NATIVE_TO_UI
	} from '$lib/profile/types';
	import { LEARNING_GOAL_LABELS } from '$lib/profile/goalCopy';
	import type { Settings, DifficultyTier } from '$lib/db/schema';
	import { setLocale } from '$lib/paraglide/runtime';

	let {
		onComplete,
		reduceMotion = false
	}: {
		onComplete: (profile: Partial<Settings>) => void | Promise<void>;
		reduceMotion?: boolean;
	} = $props();

	const STEPS = [
		'welcome',
		'language',
		'goal',
		'difficulty',
		'rhythm',
		'sovereignty',
		'ready'
	] as const;
	type Step = (typeof STEPS)[number];

	let step = $state<Step>('welcome');
	let nativeLanguage = $state<NativeLanguage>('hi');
	let learningGoal = $state<LearningGoal>('general');
	let targetExamDate = $state('');
	let dailyGoalPreset = $state<DailyGoalPreset>('regular');
	let showFrenchTips = $state(true);
	let celebrationLevel = $state<'full' | 'minimal'>('full');
	let difficultyTier = $state<DifficultyTier>('regular');

	const tiers: { value: DifficultyTier; label: () => string; desc: () => string }[] = [
		{ value: 'easy', label: m.onb_difficulty_easy_label, desc: m.onb_difficulty_easy_desc },
		{
			value: 'regular',
			label: m.onb_difficulty_regular_label,
			desc: m.onb_difficulty_regular_desc
		},
		{ value: 'hard', label: m.onb_difficulty_hard_label, desc: m.onb_difficulty_hard_desc }
	];

	const stepIndex = $derived(STEPS.indexOf(step));

	const points = [
		{ icon: '🌉', text: m.onb_p1 },
		{ icon: '📴', text: m.onb_p2 },
		{ icon: '🧠', text: m.onb_p3 },
		{ icon: '🇮🇳', text: m.onb_p4 },
		{ icon: '❄️', text: m.onb_p5 }
	];

	const goals: LearningGoal[] = ['general', 'travel', 'delf_a2', 'work', 'heritage', 'delf_b2'];

	const presets: { value: DailyGoalPreset; label: string; xp: number }[] = [
		{ value: 'casual', label: m.onb_preset_casual(), xp: 20 },
		{ value: 'regular', label: m.onb_preset_regular(), xp: 50 },
		{ value: 'intense', label: m.onb_preset_intense(), xp: 100 }
	];

	function next() {
		const i = STEPS.indexOf(step);
		if (i < STEPS.length - 1) step = STEPS[i + 1]!;
	}

	function back() {
		const i = STEPS.indexOf(step);
		if (i > 0) step = STEPS[i - 1]!;
	}

	async function finish() {
		const uiLanguage = NATIVE_TO_UI[nativeLanguage] ?? 'en';
		await onComplete({
			nativeLanguage,
			learningGoal,
			targetExamDate: targetExamDate || null,
			dailyGoalPreset,
			dailyGoalXp: xpFromPreset(dailyGoalPreset),
			showFrenchTips,
			celebrationLevel,
			difficultyTier,
			uiLanguage,
			onboarded: true
		});
		setLocale(uiLanguage);
	}
</script>

<section
	class="page-shell flex min-h-dvh flex-col justify-center py-8"
	data-testid="onboarding-wizard"
>
	<div class="mb-6 flex justify-center gap-1.5" aria-hidden="true">
		{#each STEPS as s, i (s)}
			<span
				class="h-1.5 w-8 rounded-full transition-colors {i <= stepIndex
					? 'bg-primary'
					: 'bg-border'}"
			></span>
		{/each}
	</div>

	{#key step}
		<div class="mx-auto w-full max-w-lg">
			{#if step === 'welcome'}
				<div class="text-center">
					<img
						src="/icon.svg"
						alt=""
						class="fp-motion-safe-bounce-in mx-auto h-20 w-20 rounded-2xl shadow-sm"
					/>
					<h1 class="mt-5 text-3xl font-bold text-foreground">{m.onb_title()}</h1>
					<p class="mt-2 text-muted md:text-lg">{m.onb_subtitle()}</p>
					<ul class="mt-8 space-y-3 text-left">
						{#each points as point, i (point.icon)}
							<li
								class="surface-card fp-stagger-item flex items-center gap-3 p-3"
								style="--fp-stagger: {i}"
							>
								<span class="text-2xl" aria-hidden="true">{point.icon}</span>
								<span class="text-sm text-foreground">{point.text()}</span>
							</li>
						{/each}
					</ul>
					<button
						type="button"
						class="btn-primary mt-8 w-full text-lg"
						data-testid="onboarding-next"
						onclick={next}
					>
						{m.onb_next()}
					</button>
				</div>
			{:else if step === 'language'}
				<h2 class="text-xl font-bold text-foreground">{m.onb_native_title()}</h2>
				<p class="mt-2 text-sm text-muted">{m.onb_native_desc()}</p>
				<div
					class="mt-4 grid grid-cols-2 gap-2"
					role="radiogroup"
					aria-label={m.onb_native_title()}
				>
					{#each NATIVE_LANGUAGES as lang (lang)}
						<button
							type="button"
							role="radio"
							aria-checked={nativeLanguage === lang}
							class="surface-card fp-pressable p-3 text-left transition {nativeLanguage === lang
								? 'border-primary ring-2 ring-primary/30'
								: 'hover:border-primary/50'}"
							data-testid="native-lang-{lang}"
							onclick={() => (nativeLanguage = lang)}
						>
							<span class="font-semibold text-foreground">{NATIVE_LANGUAGE_LABELS[lang]}</span>
						</button>
					{/each}
				</div>
				<div class="mt-6 flex gap-2">
					<button type="button" class="btn-secondary flex-1" onclick={back}>{m.onb_back()}</button>
					<button
						type="button"
						class="btn-primary flex-1"
						data-testid="onboarding-next"
						onclick={next}>{m.onb_next()}</button
					>
				</div>
			{:else if step === 'goal'}
				<h2 class="text-xl font-bold text-foreground">{m.onb_goal_title()}</h2>
				<p class="mt-2 text-sm text-muted">{m.onb_goal_desc()}</p>
				<div class="mt-4 space-y-2" role="radiogroup">
					{#each goals as goal (goal)}
						<button
							type="button"
							role="radio"
							aria-checked={learningGoal === goal}
							class="surface-card fp-pressable w-full p-3 text-left {learningGoal === goal
								? 'border-primary ring-2 ring-primary/30'
								: ''}"
							data-testid="goal-{goal}"
							onclick={() => (learningGoal = goal)}
						>
							<span class="font-semibold">{LEARNING_GOAL_LABELS[goal]}</span>
						</button>
					{/each}
				</div>
				{#if learningGoal === 'delf_a2' || learningGoal === 'delf_b2'}
					<label class="mt-4 block text-sm text-muted" for="exam-date">
						{m.onb_exam_date_label()}
					</label>
					<input
						id="exam-date"
						type="date"
						class="field-input mt-1"
						bind:value={targetExamDate}
						data-testid="exam-date"
					/>
				{/if}
				<div class="mt-6 flex gap-2">
					<button type="button" class="btn-secondary flex-1" onclick={back}>{m.onb_back()}</button>
					<button
						type="button"
						class="btn-primary flex-1"
						data-testid="onboarding-next"
						onclick={next}>{m.onb_next()}</button
					>
				</div>
			{:else if step === 'difficulty'}
				<h2 class="text-xl font-bold text-foreground">{m.onb_difficulty_title()}</h2>
				<p class="mt-2 text-sm text-muted">{m.onb_difficulty_desc()}</p>
				<div class="mt-4 space-y-2" role="radiogroup">
					{#each tiers as t (t.value)}
						<button
							type="button"
							role="radio"
							aria-checked={difficultyTier === t.value}
							class="surface-card fp-pressable w-full p-3 text-left {difficultyTier === t.value
								? 'border-primary ring-2 ring-primary/30'
								: ''}"
							data-testid="tier-{t.value}"
							onclick={() => (difficultyTier = t.value)}
						>
							<span class="font-semibold">{t.label()}</span>
							<span class="mt-1 block text-sm text-muted">{t.desc()}</span>
						</button>
					{/each}
				</div>
				<div class="mt-6 flex gap-2">
					<button type="button" class="btn-secondary flex-1" onclick={back}>{m.onb_back()}</button>
					<button
						type="button"
						class="btn-primary flex-1"
						data-testid="onboarding-next"
						onclick={next}>{m.onb_next()}</button
					>
				</div>
			{:else if step === 'rhythm'}
				<h2 class="text-xl font-bold text-foreground">{m.onb_rhythm_title()}</h2>
				<p class="mt-2 text-sm text-muted">{m.onb_rhythm_desc()}</p>
				<div class="mt-4 space-y-2" role="radiogroup">
					{#each presets as preset (preset.value)}
						<button
							type="button"
							role="radio"
							aria-checked={dailyGoalPreset === preset.value}
							class="surface-card fp-pressable flex w-full items-center justify-between p-4 {dailyGoalPreset ===
							preset.value
								? 'border-primary ring-2 ring-primary/30'
								: ''}"
							data-testid="preset-{preset.value}"
							onclick={() => (dailyGoalPreset = preset.value)}
						>
							<span class="font-semibold">{preset.label}</span>
							<span class="text-sm text-muted">{preset.xp} XP / day</span>
						</button>
					{/each}
				</div>
				<div class="mt-6 flex gap-2">
					<button type="button" class="btn-secondary flex-1" onclick={back}>{m.onb_back()}</button>
					<button
						type="button"
						class="btn-primary flex-1"
						data-testid="onboarding-next"
						onclick={next}>{m.onb_next()}</button
					>
				</div>
			{:else if step === 'sovereignty'}
				<h2 class="text-xl font-bold text-foreground">{m.onb_sovereignty_title()}</h2>
				<ul class="mt-4 space-y-3 text-sm text-foreground">
					<li class="surface-card p-3">🔒 {m.onb_sovereignty_1()}</li>
					<li class="surface-card p-3">📤 {m.onb_sovereignty_2()}</li>
					<li class="surface-card p-3">🚫 {m.onb_sovereignty_3()}</li>
				</ul>
				<div class="mt-6 flex gap-2">
					<button type="button" class="btn-secondary flex-1" onclick={back}>{m.onb_back()}</button>
					<button
						type="button"
						class="btn-primary flex-1"
						data-testid="onboarding-next"
						onclick={next}>{m.onb_next()}</button
					>
				</div>
			{:else if step === 'ready'}
				<div class="text-center">
					<p class="text-4xl {reduceMotion ? '' : 'fp-confetti-lite'}" aria-hidden="true">🎉</p>
					<h2 class="mt-4 text-2xl font-bold text-foreground">{m.onb_ready_title()}</h2>
					<p class="mt-2 text-muted">{m.onb_ready_desc()}</p>
					<button
						type="button"
						class="btn-primary mt-8 w-full text-lg"
						data-testid="onboarding-start"
						onclick={finish}
					>
						{m.onb_cta()}
					</button>
				</div>
			{/if}
		</div>
	{/key}

	<p
		class="mx-auto mt-6 max-w-lg rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
		role="note"
	>
		{m.onb_beta()}
	</p>
</section>
