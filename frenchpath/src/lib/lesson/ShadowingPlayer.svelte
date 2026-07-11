<script lang="ts">
	// Shadowing: play French audio while highlighting each word in sync, so the
	// learner can read along and repeat aloud. Uses the existing TTS layer only
	// (no ASR). Highlight sync prefers native `utterance.onboundary`; browsers
	// that don't fire it (e.g. the Capacitor native shell) fall back to an even
	// per-word timer paced by the user's configured speech rate.
	import { onMount } from 'svelte';
	import { speakFrench, stopSpeaking, getConfiguredRate } from '$lib/audio/tts';
	import * as m from '$lib/paraglide/messages';

	let { audioText }: { audioText: string } = $props();

	// ponytail: 150 wpm is a rough French speech-rate estimate for the
	// fallback pacing, not a measured value — good enough for a highlight cue.
	const FRENCH_WPM = 150;

	const tokens = $derived.by(() => {
		const matches: { word: string; start: number }[] = [];
		const re = /\S+/g;
		let match: RegExpExecArray | null;
		while ((match = re.exec(audioText))) matches.push({ word: match[0], start: match.index });
		return matches;
	});

	let currentIndex = $state(-1);
	let playing = $state(false);
	let loop = $state(false);
	let fallbackTimer: ReturnType<typeof setInterval> | null = null;
	let stopping = false; // Chrome fires onend on cancel(); don't loop-restart on our own stop

	function clearFallback() {
		if (fallbackTimer !== null) clearInterval(fallbackTimer);
		fallbackTimer = null;
	}

	function indexAtChar(charIndex: number): number {
		let idx = 0;
		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i]!.start <= charIndex) idx = i;
			else break;
		}
		return idx;
	}

	function stop() {
		stopping = true;
		stopSpeaking();
		clearFallback();
		playing = false;
		currentIndex = -1;
	}

	function play() {
		if (tokens.length === 0) return;
		stopping = false;
		clearFallback();
		playing = true;
		currentIndex = 0;
		const perWordMs = 60_000 / (FRENCH_WPM * getConfiguredRate());
		speakFrench(audioText, {
			onBoundary: (charIndex) => {
				clearFallback(); // onboundary is available — stop guessing via timer.
				currentIndex = indexAtChar(charIndex);
			},
			onEnd: () => {
				clearFallback();
				playing = false;
				currentIndex = -1;
				if (loop && !stopping) play();
			}
		});
		fallbackTimer = setInterval(() => {
			currentIndex = Math.min(currentIndex + 1, tokens.length - 1);
		}, perWordMs);
	}

	function toggle() {
		if (playing) stop();
		else play();
	}

	onMount(() => {
		play();
		return stop;
	});
</script>

<div class="space-y-2">
	<p class="text-sm text-muted">{m.shadow_hint()}</p>
	<div class="flex items-center gap-2">
		<button
			type="button"
			class="min-h-11 rounded-full border border-border px-4 py-2 hover:border-primary"
			aria-pressed={playing}
			onclick={toggle}
			data-testid="shadow-play"
		>
			{playing ? m.shadow_stop() : m.shadow_start()}
		</button>
		<button
			type="button"
			class="min-h-11 rounded-full border px-3 py-2 text-sm {loop
				? 'border-primary text-primary'
				: 'border-border'}"
			aria-pressed={loop}
			onclick={() => (loop = !loop)}
			data-testid="shadow-loop"
		>
			🔁 {m.shadow_loop()}
		</button>
	</div>
	<div
		class="fp-shadow-transcript flex flex-wrap gap-1 rounded-lg bg-subtle px-3 py-2"
		data-testid="shadow-transcript"
	>
		{#each tokens as token, i (i)}
			<span
				class="fp-shadow-word rounded px-1 {i === currentIndex ? 'fp-shadow-word--active' : ''}"
				data-testid="shadow-word"
			>
				{token.word}
			</span>
		{/each}
	</div>
</div>

<style>
	.fp-shadow-word {
		transition: background-color 150ms ease;
	}
	.fp-shadow-word--active {
		background: var(--fp-jaipur-light);
	}
</style>
