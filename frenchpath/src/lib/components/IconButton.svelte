<!-- IconButton.svelte — round 44px icon-only button (listen/record/play…).
     `label` is the accessible name; `pressed` (when given) renders
     aria-pressed for toggle semantics the e2e suite asserts on. -->
<script lang="ts">
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';

	let {
		icon,
		label,
		pressed = undefined,
		disabled = false,
		testid = undefined,
		size = 20,
		class: klass = '',
		onclick = undefined
	}: {
		icon: IconName;
		label: string;
		pressed?: boolean;
		disabled?: boolean;
		testid?: string;
		size?: number;
		class?: string;
		onclick?: (event: MouseEvent) => void;
	} = $props();
</script>

<button
	type="button"
	class="fp-icon-btn {klass}"
	aria-label={label}
	aria-pressed={pressed}
	data-testid={testid}
	{disabled}
	{onclick}
>
	<Icon name={icon} {size} />
</button>

<style>
	.fp-icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		border-radius: var(--fp-r-pill);
		border: 1px solid var(--fp-border);
		background: var(--fp-paper);
		color: var(--fp-ink-soft);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			background-color 0.15s ease,
			transform 0.1s ease;
	}
	.fp-icon-btn:hover:not(:disabled) {
		border-color: var(--fp-jaipur);
		color: var(--fp-jaipur);
	}
	.fp-icon-btn:focus-visible {
		outline: 2px solid var(--fp-ink);
		outline-offset: 2px;
	}
	.fp-icon-btn:active:not(:disabled) {
		transform: scale(0.94);
	}
	:global(html.reduce-motion) .fp-icon-btn:active:not(:disabled) {
		transform: none;
	}
	.fp-icon-btn[aria-pressed='true'] {
		background: var(--fp-jaipur-light);
		border-color: var(--fp-jaipur);
		color: var(--fp-jaipur);
	}
	.fp-icon-btn:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>
