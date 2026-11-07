<!-- DailyRitual.svelte — Time-of-day background + greeting -->
<!-- Usage: <DailyRitual {ritual} {learnerName} /> -->
<script lang="ts">
	type Ritual = 'morning' | 'afternoon' | 'evening';

	let { ritual = 'morning', learnerName = '' }: { ritual?: Ritual; learnerName?: string } =
		$props();

	// Auto-detect from local time if no override
	const autoRitual = $derived((): Ritual => {
		const h = new Date().getHours();
		if (h < 12) return 'morning';
		if (h < 18) return 'afternoon';
		return 'evening';
	});
	const activeRitual = $derived(ritual ?? autoRitual());

	// Backgrounds live in the scoped CSS below (keyed by data-ritual) so each
	// gets a designed dark-theme variant instead of one hardcoded gradient.
	const rituals = {
		morning: {
			labelFr: 'Café du matin',
			labelHi: 'सुप्रभात',
			emoji: '☀️',
			color: 'var(--fp-terracotta)',
			icon: '🥐'
		},
		afternoon: {
			labelFr: 'Pique-nique',
			labelHi: 'दोपहर',
			emoji: '🧺',
			color: 'var(--fp-sage)',
			icon: '🧀'
		},
		evening: {
			labelFr: 'Bistro du soir',
			labelHi: 'शाम',
			emoji: '🌙',
			color: 'var(--fp-saffron)',
			icon: '🍷'
		}
	} as const;

	const r = $derived(rituals[activeRitual]);
	const isEvening = $derived(activeRitual === 'evening');
</script>

<div class="fp-daily-ritual" data-ritual={activeRitual}>
	<div class="fp-ritual-label" style="color:{r.color}">
		<span class="fp-ritual-cefr">{r.emoji}</span>
		<span class="fp-ritual-fr">{r.labelFr}</span>
		<span class="fp-ritual-hi" class:fp-ritual-hi--light={isEvening}>{r.labelHi}</span>
	</div>
	{#if learnerName}
		<p class="fp-ritual-greeting" class:fp-ritual-greeting--light={isEvening}>
			Bonjour, {learnerName}
		</p>
	{/if}
</div>

<style>
	.fp-daily-ritual {
		border-radius: var(--fp-r-xl);
		padding: 20px 22px;
		transition: background 0.8s ease;
	}
	/* Light: soft daylight pastels. Dark: the same hours after sunset —
	   dawn-warmed, dusk-sage, and deep-night indigo. */
	.fp-daily-ritual[data-ritual='morning'] {
		background: linear-gradient(180deg, #fce3c4 0%, #f7e0ce 45%, #efe9da 100%);
	}
	:global(.dark) .fp-daily-ritual[data-ritual='morning'] {
		background: linear-gradient(180deg, #43304b 0%, #382a49 45%, #211e3d 100%);
	}
	.fp-daily-ritual[data-ritual='afternoon'] {
		background: linear-gradient(180deg, #d9e8c8 0%, #e8ead2 50%, #efe9da 100%);
	}
	:global(.dark) .fp-daily-ritual[data-ritual='afternoon'] {
		background: linear-gradient(180deg, #2b3d38 0%, #283349 50%, #211e3d 100%);
	}
	.fp-daily-ritual[data-ritual='evening'] {
		background: linear-gradient(180deg, #3a3258 0%, #5a4a63 55%, #7a5a55 100%);
	}
	:global(.dark) .fp-daily-ritual[data-ritual='evening'] {
		background: linear-gradient(180deg, #1d1a38 0%, #33294f 55%, #4a3549 100%);
	}
	.fp-ritual-label {
		display: flex;
		align-items: baseline;
		gap: 8px;
		flex-wrap: wrap;
	}
	.fp-ritual-fr {
		font-family: var(--fp-font-display);
		font-style: italic;
		font-size: clamp(22px, 3vw, 34px);
		line-height: 1.05;
		color: var(--fp-ink);
	}
	.fp-ritual-hi {
		font-family: var(--fp-font-hindi);
		font-size: 16px;
		color: var(--fp-muted);
	}
	.fp-ritual-hi--light {
		color: rgba(247, 239, 227, 0.75);
	}
	.fp-ritual-greeting {
		font-family: var(--fp-font-ui);
		font-size: 14px;
		color: var(--fp-ink-soft);
		margin: 6px 0 0;
	}
	.fp-ritual-greeting--light {
		color: rgba(247, 239, 227, 0.8);
	}
</style>
