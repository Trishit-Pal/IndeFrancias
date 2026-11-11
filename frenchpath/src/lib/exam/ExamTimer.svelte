<!-- ExamTimer.svelte — formal countdown shown during exam sections -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void } = $props();

	// Track elapsed (literal-initialised) and derive remaining from the prop,
	// so the countdown never re-captures a reactive prop in a $state initialiser.
	let elapsed = $state(0);
	const remaining = $derived(Math.max(0, totalSeconds - elapsed));
	const minutes = $derived(
		Math.floor(remaining / 60)
			.toString()
			.padStart(2, '0')
	);
	const seconds = $derived((remaining % 60).toString().padStart(2, '0'));
	const urgent = $derived(remaining <= 120);

	// Elapsed time comes from the wall clock, not from counting ticks: browsers throttle or
	// suspend timers in a background tab or a locked phone, and ticks would stop with them.
	let interval: ReturnType<typeof setInterval> | undefined;
	let expired = false;
	let startedAt = 0;

	function sync() {
		if (expired) return;
		elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
		if (totalSeconds - elapsed > 0) return;
		expired = true;
		clearInterval(interval);
		onExpire();
	}

	function onVisibilityChange() {
		if (document.visibilityState === 'visible') sync();
	}

	onMount(() => {
		startedAt = Date.now();
		interval = setInterval(sync, 1000);
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => document.removeEventListener('visibilitychange', onVisibilityChange);
	});
	onDestroy(() => clearInterval(interval));
</script>

<div class="fp-exam-timer" class:fp-exam-timer--urgent={urgent} aria-live="off">
	<span class="fp-timer-label">Temps restant</span>
	<span class="fp-timer-value" data-testid="exam-timer">{minutes}:{seconds}</span>
</div>

<style>
	.fp-exam-timer {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}
	.fp-timer-label {
		font-family: var(--fp-font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		opacity: 0.6;
	}
	.fp-timer-value {
		font-family: var(--fp-font-mono);
		font-size: 20px;
		font-weight: 700;
		color: var(--fp-saffron-text);
	}
	.fp-exam-timer--urgent .fp-timer-value {
		color: var(--fp-error);
		animation: fp-pulse 0.8s ease-in-out infinite;
	}
	:global(html.reduce-motion) .fp-exam-timer--urgent .fp-timer-value {
		animation: none;
	}
</style>
