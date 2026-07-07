<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { CelebrationRequest } from './orchestrator';
	import { clipForEvent, shouldUseFullCelebration, canUseWebGL } from './orchestrator';

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

	let Scene = $state<typeof import('./CelebrationScene.svelte').default | null>(null);
	const webglOk = canUseWebGL();
	const use3d = $derived(
		request && shouldUseFullCelebration(celebrationLevel, reduceMotion, webglOk)
	);
	let dialogEl = $state<HTMLDivElement | undefined>(undefined);

	$effect(() => {
		if (use3d && !Scene) {
			import('./CelebrationScene.svelte').then((m) => (Scene = m.default));
		}
	});

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
			{#if use3d && Scene}
				<Scene clip={clipForEvent(request.event)} />
			{:else}
				<p class="fp-confetti-lite text-5xl" aria-hidden="true">🎉</p>
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
