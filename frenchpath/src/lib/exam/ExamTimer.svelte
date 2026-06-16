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

	let interval: ReturnType<typeof setInterval> | undefined;
	onMount(() => {
		interval = setInterval(() => {
			elapsed += 1;
			if (totalSeconds - elapsed <= 0) {
				clearInterval(interval);
				onExpire();
			}
		}, 1000);
	});
	onDestroy(() => clearInterval(interval));
</script>

<div class="fp-exam-timer" class:fp-exam-timer--urgent={urgent} aria-live="off">
	<span class="fp-timer-label">Temps restant</span>
	<span class="fp-timer-value">{minutes}:{seconds}</span>
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
		color: #f2c14e;
	}
	.fp-exam-timer--urgent .fp-timer-value {
		color: #e94f64;
		animation: fp-pulse 0.8s ease-in-out infinite;
	}
</style>
