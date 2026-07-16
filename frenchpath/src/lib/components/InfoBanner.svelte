<!-- InfoBanner.svelte — a small bordered callout for notes/tips.
     `variant`: 'note' (caution amber) or 'info' (seine). Decorative only —
     pass `role` through for a11y semantics where the copy warrants it. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'note',
		role = undefined,
		class: cls = '',
		children
	}: {
		variant?: 'note' | 'info';
		role?: string;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div class="fp-info-banner fp-info-banner--{variant} {cls}" {role}>
	{@render children()}
</div>

<style>
	.fp-info-banner {
		border: 1px solid;
		border-radius: var(--fp-r-md);
		padding: 0.625rem 0.875rem;
		font-size: 0.8125rem;
		line-height: 1.4;
	}
	.fp-info-banner--note {
		background: color-mix(in srgb, var(--fp-saffron) 14%, var(--fp-paper));
		border-color: color-mix(in srgb, var(--fp-saffron) 45%, transparent);
		color: color-mix(in srgb, var(--fp-saffron) 70%, var(--fp-ink));
	}
	.fp-info-banner--info {
		background: color-mix(in srgb, var(--fp-seine) 12%, var(--fp-paper));
		border-color: color-mix(in srgb, var(--fp-seine) 40%, transparent);
		color: color-mix(in srgb, var(--fp-seine) 72%, var(--fp-ink));
	}
</style>
