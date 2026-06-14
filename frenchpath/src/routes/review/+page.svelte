<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { getReviewQueue } from '$lib/srs/queue';
	import { recordReview, parseCardId } from '$lib/srs/review';
	import { settingsRepo } from '$lib/db';
	import type { SrsCard } from '$lib/db/schema';
	import { loadUnit } from '$lib/content/loader';
	import type { Card } from '$lib/content/schema';
	import { speakFrench, ttsAvailable } from '$lib/audio/tts';
	import type { ReviewGrade } from '$lib/srs/fsrs';

	type ReviewItem = { srs: SrsCard; content: Card };
	type Phase = 'loading' | 'reviewing' | 'done';

	let phase = $state<Phase>('loading');
	let queue = $state<ReviewItem[]>([]);
	let index = $state(0);
	let revealed = $state(false);
	let reviewedCount = $state(0);
	let targetRetention = $state(0.9);
	let startedAt = Date.now();

	const currentItem = $derived(queue[index] ?? null);
	const canSpeak = ttsAvailable();

	const grades: { grade: ReviewGrade; label: () => string; classes: string }[] = [
		{
			grade: 'again',
			label: m.grade_again,
			classes: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-950 dark:text-red-200'
		},
		{
			grade: 'hard',
			label: m.grade_hard,
			classes:
				'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-200'
		},
		{
			grade: 'good',
			label: m.grade_good,
			classes:
				'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950 dark:text-green-200'
		},
		{
			grade: 'easy',
			label: m.grade_easy,
			classes: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-200'
		}
	];

	onMount(async () => {
		targetRetention = (await settingsRepo.getSettings()).targetRetention;
		const due = await getReviewQueue();
		queue = await resolveContent(due);
		phase = 'reviewing';
		startedAt = Date.now();
	});

	async function resolveContent(cards: SrsCard[]): Promise<ReviewItem[]> {
		const items: ReviewItem[] = [];
		for (const srs of cards) {
			const { unitId, contentId } = parseCardId(srs.cardId);
			try {
				const unit = await loadUnit(unitId);
				const content = unit.cards.find((c) => c.id === contentId);
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
		await recordReview(item.srs, grade, {
			targetRetention,
			durationMs: Date.now() - startedAt
		});
		reviewedCount += 1;
		if (index + 1 < queue.length) {
			index += 1;
			revealed = false;
			startedAt = Date.now();
		} else {
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

		<section class="surface-card mt-4 p-6 text-center shadow-sm lg:mx-auto lg:max-w-2xl">
			<div class="flex items-center justify-center gap-2">
				<h1 class="text-3xl font-bold text-foreground md:text-4xl">{currentItem.content.french}</h1>
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

			{#if revealed}
				<div class="mt-4 border-t border-border pt-4 text-left" data-testid="card-back">
					<p class="text-foreground">{currentItem.content.englishGloss}</p>
					<p class="text-muted">{currentItem.content.hindiGloss}</p>
					{#if currentItem.content.example}
						<p class="mt-3 text-sm text-muted italic">
							"{currentItem.content.example.french}"
						</p>
					{/if}
				</div>
			{/if}
		</section>

		{#if revealed}
			<div class="mt-5 grid grid-cols-4 gap-2 lg:mx-auto lg:max-w-2xl" data-testid="grade-buttons">
				{#each grades as g (g.grade)}
					<button
						type="button"
						class="min-h-11 rounded-xl px-2 py-3 text-sm font-semibold {g.classes}"
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
			<p class="mt-1 text-muted">
				You reviewed {reviewedCount} card{reviewedCount === 1 ? '' : 's'}.
			</p>
			<a class="btn-primary mt-6 inline-block" href={resolve('/')}>{m.common_back_to_path()}</a>
		</div>
	{/if}
</main>
