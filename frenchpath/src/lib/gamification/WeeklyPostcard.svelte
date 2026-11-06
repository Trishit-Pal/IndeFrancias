<script lang="ts">
	import type { WeeklyRecap } from './weeklyRecap';
	import { sharePostcard } from '$lib/share/shareCard';
	import * as m from '$lib/paraglide/messages';

	let { recap }: { recap: WeeklyRecap } = $props();

	let busy = $state(false);
	async function share(): Promise<void> {
		if (busy) return;
		busy = true;
		try {
			await sharePostcard(recap, labels);
		} catch {
			// ponytail: failures and cancels (AbortError) stay silent; add a calm note if the share UI gains one
		} finally {
			busy = false;
		}
	}

	const isEmpty = $derived(recap.reviews === 0 && recap.lessons === 0);
	const items = $derived([
		{ label: m.postcard_reviews(), value: String(recap.reviews) },
		{ label: m.postcard_accuracy(), value: `${recap.accuracy}%` },
		{ label: m.postcard_words(), value: String(recap.wordsRecalled) },
		{ label: m.postcard_xp(), value: String(recap.xp) },
		{ label: m.postcard_lessons(), value: String(recap.lessons) },
		{ label: m.postcard_streak(), value: String(recap.streak) },
		{ label: m.postcard_units(), value: `${recap.unitsDone}/${recap.unitsTotal}` }
	]);
	const labels = $derived({
		title: m.postcard_title(),
		empty: m.postcard_empty(),
		reviews: m.postcard_reviews(),
		accuracy: m.postcard_accuracy(),
		words: m.postcard_words(),
		xp: m.postcard_xp(),
		lessons: m.postcard_lessons(),
		streak: m.postcard_streak(),
		units: m.postcard_units()
	});
</script>

<section class="surface-card p-4" data-testid="weekly-postcard" aria-label={m.postcard_title()}>
	<h2 class="text-sm font-semibold text-balance text-foreground">{m.postcard_title()}</h2>
	{#if isEmpty}
		<p class="mt-2 text-sm text-muted">{m.postcard_empty()}</p>
	{:else}
		<dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
			{#each items as item (item.label)}
				<div>
					<dt class="text-xs text-muted">{item.label}</dt>
					<dd
						class="fp-figure text-xl font-bold"
						style="color: var(--fp-saffron-text); font-family: var(--fp-font-display)"
					>
						{item.value}
					</dd>
				</div>
			{/each}
		</dl>
	{/if}
	<button
		type="button"
		class="btn-secondary mt-3 min-h-11 text-sm"
		data-testid="share-postcard"
		disabled={busy}
		aria-busy={busy}
		onclick={share}
	>
		{m.postcard_share()}
	</button>
</section>
