<script lang="ts">
	import { resolve } from '$app/paths';
	import InfoBanner from '$lib/components/InfoBanner.svelte';
	import type { ReviewMode, TodayPlan } from './todayPlan';
	import * as m from '$lib/paraglide/messages';

	let { plan, nextUnitId }: { plan: TodayPlan; nextUnitId: string | null } = $props();

	const modeLabels: Record<ReviewMode, () => string> = {
		read: m.review_mode_read,
		listen: m.review_mode_listen,
		type: m.review_mode_type,
		speak: m.review_mode_speak
	};
	const href = $derived(
		plan.kind === 'review'
			? `${resolve('/review')}?mode=${plan.mode}`
			: plan.kind === 'lesson' && nextUnitId
				? resolve('/learn/[unitId]', { unitId: nextUnitId })
				: null
	);
</script>

<section class="surface-card mb-5 p-4" data-testid="today-card" aria-label={m.today_title()}>
	<h2 class="text-sm font-semibold text-balance text-foreground">{m.today_title()}</h2>
	<p class="mt-1 text-sm text-foreground">
		{#if plan.kind === 'review'}
			{@const args = {
				count: plan.cardCount,
				minutes: plan.minutes,
				mode: modeLabels[plan.mode]()
			}}
			{plan.cardCount === 1 ? m.today_review_one(args) : m.today_review_many(args)}
		{:else if plan.kind === 'lesson'}
			{m.today_lesson()}
		{:else}
			{m.today_rest()}
		{/if}
	</p>
	{#if href}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href is built from resolve() plus a query string -->
		<a class="btn-primary mt-3 inline-flex min-h-11 items-center" {href} data-testid="today-start">
			{m.today_start()}
		</a>
	{/if}
	{#if plan.kind === 'review' && plan.fallbackHint}
		<InfoBanner variant="info" class="mt-3">
			<a
				class="inline-flex min-h-11 items-center underline"
				href={resolve('/settings')}
				data-testid="today-hint"
			>
				{plan.fallbackHint === 'tts' ? m.today_hint_tts() : m.today_hint_asr()}
			</a>
		</InfoBanner>
	{/if}
</section>
