<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { getReviewQueue } from '$lib/srs/queue';
	import { recordReview, parseCardId } from '$lib/srs/review';
	import { effectiveRetention } from '$lib/assessment/checkpoint';
	import { settingsRepo } from '$lib/db';
	import type { SrsCard } from '$lib/db/schema';
	import { loadUnit } from '$lib/content/loader';
	import type { Card } from '$lib/content/schema';
	import { getGloss } from '$lib/content/gloss';
	import { buildLexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';
	import CharacterMira from '$lib/components/CharacterMira.svelte';
	import { isNativePlatform } from '$lib/platform';
	import { tapHaptic } from '$lib/platform/haptics';
	import type { NativeLanguage } from '$lib/db/schema';
	import { speakFrench, ttsAvailable } from '$lib/audio/tts';
	import { shareProgress } from '$lib/share/shareCard';
	import type { ReviewGrade } from '$lib/srs/fsrs';

	type ReviewItem = { srs: SrsCard; content: Card };
	type Phase = 'loading' | 'reviewing' | 'done';

	let phase = $state<Phase>('loading');
	let queue = $state<ReviewItem[]>([]);
	let index = $state(0);
	let revealed = $state(false);
	let reviewedCount = $state(0);
	let goodCount = $state(0);
	let targetRetention = $state(0.9);
	let nativeLanguage = $state<NativeLanguage>('hi');
	let difficultyTier = $state<import('$lib/db/schema').DifficultyTier>('regular');
	let sessionStartedAt = Date.now();
	let cardStartedAt = Date.now();
	let sessionDurationMs = $state(0);

	const currentItem = $derived(queue[index] ?? null);
	const reviewLexicon = $derived(
		currentItem ? buildLexicon([currentItem.content], nativeLanguage) : new Map()
	);
	const canSpeak = ttsAvailable();
	const accuracyPercent = $derived(
		reviewedCount === 0 ? 0 : Math.round((goodCount / reviewedCount) * 100)
	);

	const grades: { grade: ReviewGrade; label: () => string }[] = [
		{ grade: 'again', label: m.grade_again },
		{ grade: 'hard', label: m.grade_hard },
		{ grade: 'good', label: m.grade_good },
		{ grade: 'easy', label: m.grade_easy }
	];

	function formatDuration(ms: number): string {
		const mins = Math.floor(ms / 60_000);
		const secs = Math.floor((ms % 60_000) / 1000);
		return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
	}

	onMount(async () => {
		const settings = await settingsRepo.getSettings();
		targetRetention = effectiveRetention(settings.targetRetention, settings.difficultyTier);
		nativeLanguage = settings.nativeLanguage;
		difficultyTier = settings.difficultyTier;
		const due = await getReviewQueue();
		queue = await resolveContent(due);
		phase = queue.length > 0 ? 'reviewing' : 'reviewing';
		sessionStartedAt = Date.now();
		cardStartedAt = Date.now();
	});

	async function resolveContent(cards: SrsCard[]): Promise<ReviewItem[]> {
		const unitIds = [...new Set(cards.map((srs) => parseCardId(srs.cardId).unitId))];
		const loaded = await Promise.all(unitIds.map((id) => loadUnit(id)));
		const byUnitId = new Map(loaded.map((unit) => [unit.id, unit]));

		const items: ReviewItem[] = [];
		for (const srs of cards) {
			const { unitId, contentId } = parseCardId(srs.cardId);
			try {
				const unit = byUnitId.get(unitId);
				const content = unit?.cards.find((c) => c.id === contentId);
				if (content) items.push({ srs, content });
			} catch {
				// Skip cards whose unit can't be resolved (e.g. removed content).
			}
		}
		return items;
	}

	async function grade(grade: ReviewGrade) {
		const item = currentItem;
		if (!item) return;
		if (isNativePlatform()) void tapHaptic();
		else if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
		await recordReview(item.srs, grade, {
			targetRetention,
			durationMs: Date.now() - cardStartedAt
		});
		reviewedCount += 1;
		if (grade === 'good' || grade === 'easy') goodCount += 1;
		if (index + 1 < queue.length) {
			index += 1;
			revealed = false;
			cardStartedAt = Date.now();
		} else {
			sessionDurationMs = Date.now() - sessionStartedAt;
			phase = 'done';
		}
	}
</script>

<svelte:head><title>Review · FrenchPath</title></svelte:head>

<main class="page-shell">
	<a class="text-sm text-muted hover:underline" href={resolve('/')}>{m.common_home()}</a>

	{#if phase === 'loading'}
		<p class="mt-6 text-muted">Loading your review queue…</p>
	{:else if phase === 'reviewing' && currentItem}
		<p class="mt-2 text-sm text-muted">{index + 1} / {queue.length} due</p>

		<div class="fp-flip-card mt-4 lg:mx-auto lg:max-w-2xl">
			<div class="fp-flip-inner" class:fp-flipped={revealed}>
				<section class="fp-flip-front surface-card p-6 text-center shadow-sm">
					{#if difficultyTier === 'hard' && !revealed}
						<p class="text-3xl font-bold text-muted" data-testid="hard-prompt">
							{m.review_hard_prompt()}
						</p>
					{:else}
						<div class="flex items-center justify-center gap-2">
							<h1
								class="text-3xl font-bold text-foreground md:text-4xl"
								style="font-family: var(--fp-font-display)"
							>
								<GlossText text={currentItem.content.french} lexicon={reviewLexicon} />
							</h1>
							{#if canSpeak}
								<button
									type="button"
									class="rounded-full border border-border px-3 py-1 text-base hover:border-primary"
									aria-label="Listen"
									onclick={() => speakFrench(currentItem.content.french)}>🔊</button
								>
							{/if}
						</div>
						{#if currentItem.content.gender !== 'none'}
							<p class="mt-1 text-xs text-muted">{currentItem.content.gender}</p>
						{/if}
					{/if}

					{#if difficultyTier === 'easy' && !revealed}
						{@const gloss = getGloss(currentItem.content, nativeLanguage)}
						<p class="mt-3 text-sm text-muted" data-testid="easy-gloss-hint">{gloss.primary}</p>
					{/if}
				</section>

				<section
					class="fp-flip-back surface-card p-6 text-center shadow-sm"
					data-testid="card-back"
				>
					{#if currentItem}
						{@const gloss = getGloss(currentItem.content, nativeLanguage)}
						<div class="flex items-center justify-center gap-2">
							<h1
								class="text-3xl font-bold text-foreground md:text-4xl"
								style="font-family: var(--fp-font-display)"
							>
								<GlossText text={currentItem.content.french} lexicon={reviewLexicon} />
							</h1>
							{#if canSpeak}
								<button
									type="button"
									class="rounded-full border border-border px-3 py-1 text-base hover:border-primary"
									aria-label="Listen"
									onclick={() => speakFrench(currentItem.content.french)}>🔊</button
								>
							{/if}
						</div>
						{#if currentItem.content.gender !== 'none'}
							<p class="mt-1 text-xs text-muted">{currentItem.content.gender}</p>
						{/if}
						<div class="mt-4 border-t border-border pt-4 text-left">
							<p
								class="text-foreground"
								style="font-family: var(--fp-font-hindi); color: var(--fp-terracotta)"
							>
								{gloss.primary}
							</p>
							{#if gloss.secondary}
								<p class="text-muted">{gloss.secondary}</p>
							{/if}
							{#if currentItem.content.example}
								<p class="mt-3 text-sm text-muted italic">
									"{currentItem.content.example.french}"
								</p>
							{/if}
						</div>
					{/if}
				</section>
			</div>
		</div>

		{#if revealed}
			<div class="mt-5 grid grid-cols-4 gap-2 lg:mx-auto lg:max-w-2xl" data-testid="grade-buttons">
				{#each grades as g (g.grade)}
					<button
						type="button"
						class="fp-grade-btn fp-grade-btn--{g.grade}"
						data-grade={g.grade}
						onclick={() => grade(g.grade)}>{g.label()}</button
					>
				{/each}
			</div>
		{:else}
			<button
				type="button"
				class="btn-primary mt-5 w-full lg:mx-auto lg:block lg:max-w-2xl"
				data-testid="reveal"
				onclick={() => (revealed = true)}>{m.review_show_answer()}</button
			>
		{/if}

		<div class="mt-5 flex items-center gap-2 lg:mx-auto lg:max-w-2xl">
			<CharacterMira size="xs" animate={false} />
			<p class="text-xs" style="color: var(--fp-muted)">{m.review_fsrs_tip()}</p>
		</div>
	{:else if phase === 'reviewing'}
		<div class="mt-10 text-center" data-testid="no-reviews">
			<p class="text-5xl">✅</p>
			<h1 class="mt-3 text-2xl font-bold text-foreground">{m.review_nothing_title()}</h1>
			<p class="mt-1 text-muted">{m.review_nothing_desc()}</p>
			<a class="btn-primary mt-6 inline-block" href={resolve('/')}>{m.common_back_to_path()}</a>
		</div>
	{:else if phase === 'done'}
		<div class="mt-10 text-center" data-testid="review-done">
			<p class="text-5xl">🎉</p>
			<h1 class="mt-3 text-2xl font-bold text-foreground">{m.review_complete()}</h1>
			<ul class="mt-3 space-y-1 text-sm text-muted">
				<li data-testid="review-summary-accuracy">
					{m.review_session_accuracy({ percent: accuracyPercent })}
				</li>
				<li data-testid="review-summary-time">
					{m.review_session_time({ time: formatDuration(sessionDurationMs) })}
				</li>
				<li data-testid="review-summary-cards">
					{m.review_session_cards({ count: reviewedCount })}
				</li>
			</ul>
			<button
				type="button"
				class="btn-secondary mt-4"
				data-testid="share-review"
				onclick={() =>
					shareProgress({
						title: 'FrenchPath review',
						subtitle: `${reviewedCount} cards · ${accuracyPercent}% accuracy`
					})}
			>
				{m.share_progress()}
			</button>
			<a class="btn-primary mt-4 inline-block" href={resolve('/')}>{m.common_back_to_path()}</a>
		</div>
	{/if}
</main>
