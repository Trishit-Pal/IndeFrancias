<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { CelebrationRequest } from './orchestrator';
	import { clipForEvent, shouldUseFullCelebration } from './orchestrator';
	import CelebrationScene from './CelebrationScene.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let {
		request,
		celebrationLevel = 'full',
		reduceMotion = false,
		onDismiss
	}: {
		request: CelebrationRequest | null;
		celebrationLevel?: 'full' | 'minimal';
		reduceMotion?: boolean;
		onDismiss: () => void;
	} = $props();

	const useScene = $derived(request && shouldUseFullCelebration(celebrationLevel, reduceMotion));
	let dialogEl = $state<HTMLDivElement | undefined>(undefined);

	// Move keyboard focus into the dialog so Escape/Tab work without a prior click.
	$effect(() => {
		if (request) dialogEl?.focus();
	});

	function dismiss() {
		onDismiss();
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) dismiss();
	}

	function onBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') dismiss();
	}
</script>

{#if request}
	<div
		bind:this={dialogEl}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 focus:outline-none"
		role="dialog"
		aria-modal="true"
		aria-labelledby="celebration-title"
		tabindex="-1"
		onclick={onBackdropClick}
		onkeydown={onBackdropKeydown}
		data-testid="celebration-overlay"
	>
		<div class="surface-card w-full max-w-md p-6 text-center shadow-xl">
			{#if useScene}
				<CelebrationScene clip={clipForEvent(request.event)} />
			{:else}
				<span class="fp-medallion fp-confetti-lite" aria-hidden="true">
					<Icon name="spark" size={34} />
				</span>
			{/if}
			<h2 id="celebration-title" class="mt-4 text-xl font-bold text-balance text-foreground">
				{request.title}
			</h2>
			{#if request.subtitle}
				<p class="mt-2 text-sm text-muted">{request.subtitle}</p>
			{/if}
			<button
				type="button"
				class="btn-primary mt-6 w-full"
				onclick={dismiss}
				data-testid="celebration-skip"
			>
				{m.lesson_continue()}
			</button>
		</div>
	</div>
{/if}
