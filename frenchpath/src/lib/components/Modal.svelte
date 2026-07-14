<!-- Modal.svelte — focused overlay dialog for confirmations.
     Backdrop click and Escape close it; the panel takes focus on open.
     Pass `labelledby` pointing at a heading id inside the panel, and a
     `testid` that lands on the dialog element (e2e selects it). -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = false,
		labelledby = undefined,
		testid = undefined,
		onClose = undefined,
		children
	}: {
		open?: boolean;
		labelledby?: string;
		testid?: string;
		onClose?: () => void;
		children: Snippet;
	} = $props();

	let panel = $state<HTMLElement | null>(null);

	$effect(() => {
		if (open && panel) panel.focus();
	});

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose?.();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<!-- z-50: above the mobile nav (z-10) and the learn confidence sheet (z-40). -->
	<div
		class="fp-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose?.();
		}}
	>
		<div
			bind:this={panel}
			class="fp-modal-panel surface-card w-full max-w-md p-5"
			role="dialog"
			aria-modal="true"
			aria-labelledby={labelledby}
			data-testid={testid}
			tabindex="-1"
		>
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.fp-modal-backdrop {
		background: color-mix(in srgb, var(--fp-midnight) 55%, transparent);
		backdrop-filter: blur(2px);
	}
	.fp-modal-panel {
		box-shadow: var(--fp-elevation-3);
		animation: fp-modal-in var(--fp-duration-md) var(--fp-ease-out);
	}
	@keyframes fp-modal-in {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	:global(html.reduce-motion) .fp-modal-panel {
		animation: none;
	}
</style>
