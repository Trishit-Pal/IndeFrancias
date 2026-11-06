<!-- Modal.svelte — confirmation dialog on the native <dialog> + showModal().
     The browser makes the page behind it inert (focus can't Tab out), closes
     on Escape (routed to onClose), and returns focus to the opener on close().
     The <dialog> stays mounted and is toggled via showModal()/close(): removing
     an open dialog from the DOM would skip the focus restore.
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

	let dialog = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function onCancel(event: Event) {
		// Escape: let the parent own `open` instead of the browser closing it.
		event.preventDefault();
		onClose?.();
	}
</script>

<!-- Clicks on the dialog box itself (outside the inner panel) are backdrop clicks. -->
<dialog
	bind:this={dialog}
	class="fp-modal"
	aria-labelledby={labelledby}
	data-testid={testid}
	oncancel={onCancel}
	onclick={(e) => {
		if (e.target === e.currentTarget) onClose?.();
	}}
>
	<div class="fp-modal-panel surface-card w-full max-w-md p-5">
		{@render children()}
	</div>
</dialog>

<style>
	.fp-modal {
		/* Full-viewport transparent box so a click outside the panel hits it. */
		position: fixed;
		inset: 0;
		width: 100%;
		max-width: none;
		height: 100%;
		max-height: none;
		margin: 0;
		padding: 1rem;
		border: 0;
		background: transparent;
		color: inherit;
	}
	.fp-modal[open] {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.fp-modal::backdrop {
		/* Literal night scrim: older WebViews don't inherit custom props into ::backdrop. */
		background: color-mix(in srgb, #100e20 55%, transparent);
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
