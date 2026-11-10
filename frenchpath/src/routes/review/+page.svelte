<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import { parseReviewMode, presentationFor } from '$lib/srs/reviewMode';
	import { createOnceGate } from '$lib/srs/onceGate';
	import { loadCaps } from '$lib/srs/caps';
	import type { Caps } from '$lib/gamification/todayPlan';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { getReviewQueue } from '$lib/srs/queue';
	import { recordReview, parseCardId } from '$lib/srs/review';
	import { isRecalled } from '$lib/srs/contextGrade';
	import { effectiveRetention } from '$lib/assessment/checkpoint';
	import { settingsRepo } from '$lib/db';
	import type { SrsCard } from '$lib/db/schema';
	import { loadUnit } from '$lib/content/loader';
	import type { Card } from '$lib/content/schema';
	import { getGloss } from '$lib/content/gloss';
	import { buildLexicon } from '$lib/content/lexicon';
	import GlossText from '$lib/components/GlossText.svelte';
	import CharacterMira from '$lib/components/CharacterMira.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import IconButton from '$lib/components/IconButton.svelte';
	import { isNativePlatform } from '$lib/platform';
	import { tapHaptic } from '$lib/platform/haptics';
	import InfoBanner from '$lib/components/InfoBanner.svelte';
	import type { NativeLanguage } from '$lib/db/schema';
	import { speakFrench, ttsAvailable } from '$lib/audio/tts';
	import { shareProgress } from '$lib/share/shareCard';
	import type { ReviewGrade } from '$lib/srs/fsrs';
	import type { ReviewMode } from '$lib/gamification/todayPlan';
	import ContextCard from '$lib/srs/ContextCard.svelte';
	import LeechRescue from '$lib/srs/LeechRescue.svelte';
	import { isLeech } from '$lib/srs/leech';
	import {
		buildContextPrompt,
		glossOnlyPrompt,
		type CandidateCard,
		type ContextPrompt
	} from '$lib/srs/contextCard';
	import { maybeRunFsrsOptimizer } from '$lib/srs/optimizer';

	type ReviewItem = {
		srs: SrsCard;
		content: Card;
		prompt: ContextPrompt | null;
		presentation: ReviewMode | 'flip';
	};
	type Phase = 'loading' | 'reviewing' | 'done' | 'error';

	let phase = $state<Phase>('loading');
	let queue = $state<ReviewItem[]>([]);
	let index = $state(0);
	let revealed = $state(false);
	let reviewedCount = $state(0);
	let goodCount = $state(0);
	let targetRetention = $state(0.9);
	let nativeLanguage = $state<NativeLanguage>('hi');
	let difficultyTier = $state<import('$lib/db/schema').DifficultyTier>('regular');
	let fsrsWeights = $state<number[] | null>(null);
	let sessionStartedAt = Date.now();
	let cardStartedAt = Date.now();
	let sessionDurationMs = $state(0);
	let asrReady = $state(false);
	let ttsReady = $state(false);
	// card ids whose rescue panel was already shown this session (once per card)
	const rescued = new SvelteSet<string>();
	let cardArea = $state<HTMLElement>();

	const mode = $derived(parseReviewMode(page.url.searchParams.get('mode')));
	const currentItem = $derived(queue[index] ?? null);
	const reviewLexicon = $derived(
		currentItem ? buildLexicon([currentItem.content], nativeLanguage) : new Map()
	);
	const canSpeak = ttsAvailable();
	const showRescue = $derived(
		currentItem !== null && isLeech(currentItem.srs) && !rescued.has(currentItem.srs.cardId)
	);
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
		try {
			const settings = await settingsRepo.getSettings();
			targetRetention = effectiveRetention(settings.targetRetention, settings.difficultyTier);
			nativeLanguage = settings.nativeLanguage;
			difficultyTier = settings.difficultyTier;
			fsrsWeights = settings.fsrsWeights;
			const [due, caps] = await Promise.all([getReviewQueue(), loadCaps()]);
			asrReady = caps.asr;
			ttsReady = caps.tts;
			queue = await resolveContent(due, caps);
			phase = 'reviewing';
			sessionStartedAt = Date.now();
			cardStartedAt = Date.now();
		} catch (error) {
			// A failed IndexedDB read or content load must not leave the page on "Loading…" forever.
			console.error('[review] load failed', error);
			phase = 'error';
		}
	});

	async function resolveContent(cards: SrsCard[], caps: Caps): Promise<ReviewItem[]> {
		const unitIds = [...new Set(cards.map((srs) => parseCardId(srs.cardId).unitId))];
		const loaded = await Promise.all(unitIds.map((id) => loadUnit(id)));
		const byUnitId = new Map(loaded.map((unit) => [unit.id, unit]));

		const candidates: CandidateCard[] = loaded.flatMap((unit) =>
			unit.cards.map((card) => ({ card, unitId: unit.id }))
		);
		const items: ReviewItem[] = [];
		for (const srs of cards) {
			const { unitId, contentId } = parseCardId(srs.cardId);
			try {
				const unit = byUnitId.get(unitId);
				const content = unit?.cards.find((c) => c.id === contentId);
				if (content) {
					const built = buildContextPrompt(content, unitId, candidates, srs.cardId);
					const isSpeaking = srs.skill === 'spokenProduction' || srs.skill === 'spokenInteraction';
					const presentation = presentationFor(srs, mode, built !== null, caps, isSpeaking);
					// mature card without a sentence: typed recall against the gloss
					const prompt = built ?? (presentation === 'flip' ? null : glossOnlyPrompt(content));
					items.push({ srs, content, prompt, presentation });
				}
			} catch {
				// Skip cards whose unit can't be resolved (e.g. removed content).
			}
		}
		return items;
	}

	async function dismissRescue() {
		if (!currentItem) return;
		rescued.add(currentItem.srs.cardId);
		cardStartedAt = Date.now(); // reading the panel is not answer time
		await tick();
		const first = cardArea?.querySelector<HTMLElement>('input, button');
		first?.focus();
	}

	// Grading awaits an IndexedDB write; a second tap in that window must not
	// record the same card twice (it would corrupt the FSRS state).
	const gradeGate = createOnceGate();
	let grading = $state(false); // mirrors the gate for the disabled attribute
	let gradeError = $state(false);

	async function grade(grade: ReviewGrade, measuredMs?: number) {
		const item = currentItem;
		if (!item) return;
		try {
			await gradeGate.run(async () => {
				gradeError = false;
				grading = true;
				try {
					await gradeItem(item, grade, measuredMs);
				} finally {
					grading = false;
				}
			});
		} catch {
			// recordReview is one transaction: nothing was saved and the card stays for another tap.
			gradeError = true;
		}
	}

	async function gradeItem(item: ReviewItem, grade: ReviewGrade, measuredMs?: number) {
		if (isNativePlatform()) void tapHaptic();
		else if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
		await recordReview(item.srs, grade, {
			targetRetention,
			durationMs: measuredMs ?? Date.now() - cardStartedAt,
			weights: fsrsWeights
		});
		reviewedCount += 1;
		if (isRecalled(grade)) goodCount += 1;
		if (index + 1 < queue.length) {
			index += 1;
			revealed = false;
			cardStartedAt = Date.now();
		} else {
			sessionDurationMs = Date.now() - sessionStartedAt;
			phase = 'done';
			void maybeRunFsrsOptimizer();
		}
	}
</script>

<svelte:head><title>{m.nav_review()} · FrenchPath</title></svelte:head>

<main class="page-shell">
	<a
		class="inline-flex min-h-11 items-center text-sm text-muted hover:underline"
		href={resolve('/')}>{m.common_home()}</a
	>

	{#if phase === 'loading'}
		<p class="mt-6 text-muted" role="status">{m.review_loading()}</p>
	{:else if phase === 'error'}
		<InfoBanner variant="error" role="alert" class="mt-6">
			<p>{m.review_load_error()}</p>
			<button type="button" class="btn-secondary mt-3 text-sm" onclick={() => location.reload()}>
				{m.common_retry()}
			</button>
		</InfoBanner>
	{:else if phase === 'reviewing' && currentItem}
		<p class="mt-2 text-sm text-muted">
			{m.review_queue_progress({ current: index + 1, total: queue.length })}
		</p>

		{#if gradeError}
			<InfoBanner variant="error" role="alert" class="mt-4">
				<p>{m.review_grade_error()}</p>
			</InfoBanner>
		{/if}

		<div bind:this={cardArea}>
			{#if showRescue}
				{#key currentItem.srs.cardId}
					<div class="mt-4">
						<LeechRescue
							content={currentItem.content}
							exampleGloss={currentItem.content.example
								? getGloss(currentItem.content.example, nativeLanguage).primary
								: ''}
							canSpeak={ttsReady}
							onDone={dismissRescue}
						/>
					</div>
				{/key}
			{:else if currentItem.prompt && currentItem.presentation !== 'flip'}
				{#key currentItem.srs.cardId}
					<div class="mt-4">
						<ContextCard
							prompt={currentItem.prompt}
							mode={currentItem.presentation as ReviewMode}
							gloss={getGloss(currentItem.content, nativeLanguage).primary}
							asr={asrReady}
							onAnswered={grade}
						/>
					</div>
				{/key}
			{:else}
				<div class="fp-flip-card mt-4 lg:mx-auto lg:max-w-2xl">
					<div class="fp-flip-inner" class:fp-flipped={revealed}>
						<!-- inert: the face that isn't showing is out of the tab order and the a11y tree. -->
						<section class="fp-flip-front surface-card p-6 text-center shadow-sm" inert={revealed}>
							{#if difficultyTier === 'hard' && !revealed}
								<p class="text-3xl font-bold text-muted" data-testid="hard-prompt">
									{m.review_hard_prompt()}
								</p>
							{:else}
								<div class="flex items-center justify-center gap-2">
									<h1 class="fp-display-lg text-balance text-foreground">
										<GlossText text={currentItem.content.french} lexicon={reviewLexicon} />
									</h1>
									{#if canSpeak}
										<IconButton
											icon="speaker"
											label={m.audio_play()}
											onclick={() => speakFrench(currentItem.content.french)}
										/>
									{/if}
								</div>
								{#if currentItem.content.gender !== 'none'}
									<p class="mt-1 text-xs text-muted">
										{currentItem.content.gender === 'masculine'
											? m.review_gender_masculine()
											: m.review_gender_feminine()}
									</p>
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
							inert={!revealed}
						>
							{#if currentItem}
								{@const gloss = getGloss(currentItem.content, nativeLanguage)}
								<div class="flex items-center justify-center gap-2">
									<h1 class="fp-display-lg text-balance text-foreground">
										<GlossText text={currentItem.content.french} lexicon={reviewLexicon} />
									</h1>
									{#if canSpeak}
										<IconButton
											icon="speaker"
											label={m.audio_play()}
											onclick={() => speakFrench(currentItem.content.french)}
										/>
									{/if}
								</div>
								{#if currentItem.content.gender !== 'none'}
									<p class="mt-1 text-xs text-muted">
										{currentItem.content.gender === 'masculine'
											? m.review_gender_masculine()
											: m.review_gender_feminine()}
									</p>
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
					<div
						class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:mx-auto lg:max-w-2xl"
						data-testid="grade-buttons"
					>
						{#each grades as g (g.grade)}
							<button
								type="button"
								class="fp-grade-btn fp-grade-btn--{g.grade}"
								data-grade={g.grade}
								disabled={grading}
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
			{/if}
		</div>

		<div class="mt-5 flex items-center gap-2 lg:mx-auto lg:max-w-2xl">
			<CharacterMira size="xs" animate={false} />
			<p class="text-xs text-muted">{m.review_fsrs_tip()}</p>
		</div>
	{:else if phase === 'reviewing'}
		<div class="mt-10 text-center" data-testid="no-reviews">
			<span class="fp-medallion" aria-hidden="true"><Icon name="check" size={34} /></span>
			<h1 class="fp-display-md mt-3 text-balance text-foreground">
				{m.review_nothing_title()}
			</h1>
			<p class="mt-1 text-muted">{m.review_nothing_desc()}</p>
			<a class="btn-primary mt-6 inline-block" href={resolve('/')}>{m.common_back_to_path()}</a>
		</div>
	{:else if phase === 'done'}
		<div class="mt-10 text-center" data-testid="review-done">
			<span class="fp-medallion" aria-hidden="true"><Icon name="spark" size={34} /></span>
			<h1 class="fp-display-md mt-3 text-balance text-foreground">{m.review_complete()}</h1>
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
