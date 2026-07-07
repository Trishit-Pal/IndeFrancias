<!-- frenchpath/src/lib/components/LessonComplete.svelte -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import type { CompleteOutcome } from '$lib/lesson/complete';

	let {
		score,
		correctCount,
		total,
		outcome,
		reducedMotion = false,
		onShare
	}: {
		score: number;
		correctCount: number;
		total: number;
		outcome: CompleteOutcome | null;
		reducedMotion?: boolean;
		onShare: () => void;
	} = $props();
</script>

<div class="surface-card rounded-2xl p-6 text-center lg:mx-auto lg:max-w-lg" data-testid="summary">
	<p class="text-5xl">{score >= 80 ? '🎉' : '💪'}</p>
	<h1 class="fp-display-md mt-3 text-foreground {reducedMotion ? '' : 'fp-stamp-in'}">
		{m.lesson_complete()}
	</h1>
	<p class="mt-1 text-muted">
		You scored <span class="font-semibold text-foreground">{score}%</span>
		({correctCount}/{total}).
	</p>
	{#if outcome && outcome.goalXp > 0}
		<p
			class="fp-figure mt-1 text-sm font-medium text-green-700 dark:text-green-400"
			data-testid="xp-awarded"
		>
			{outcome.isNewBest ? m.lesson_new_best() : ''} +{outcome.goalXp} XP
		</p>
	{:else}
		<p class="mt-1 text-sm text-muted" data-testid="practice-note">
			Practice complete — no new XP (best: {outcome?.bestScore ?? score}%).
			<a class="text-primary underline" href={resolve('/review')}>{m.lesson_review_cards()}</a>
			to keep your streak.
		</p>
	{/if}
	<p class="mt-1 text-sm text-muted">{m.lesson_srs_note()}</p>
	<button
		type="button"
		class="btn-secondary mt-4 w-full"
		data-testid="share-lesson"
		onclick={onShare}
	>
		{m.share_progress()}
	</button>
	<div class="mt-3 grid gap-3">
		<a class="btn-primary block" href={resolve('/review')}>{m.lesson_review_now()}</a>
		<a class="btn-secondary block" href={resolve('/')}>{m.common_back_to_path()}</a>
	</div>
</div>

<style>
	.fp-stamp-in {
		animation: fp-stamp 0.6s ease-out both;
	}
</style>
