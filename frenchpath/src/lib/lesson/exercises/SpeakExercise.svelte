<script lang="ts">
	import type { Exercise } from '$lib/content/schema';
	import type { ExerciseResponse } from '$lib/lesson/engine';
	import type { Lexicon } from '$lib/content/lexicon';
	import { speakFrench, ttsAvailable } from '$lib/audio/tts';
	import { transcribe, preloadAsr } from '$lib/speech/asr';
	import { getModelStatus, downloadModel } from '$lib/speech/modelSource';
	import { scorePronunciation, type PronunciationScore } from '$lib/speech/score';
	import { MODEL_SIZE_MB } from '$lib/speech/modelManifest';
	import GlossText from '$lib/components/GlossText.svelte';
	import IconButton from '$lib/components/IconButton.svelte';
	import * as m from '$lib/paraglide/messages';

	let {
		exercise,
		// eslint-disable-next-line no-useless-assignment -- Svelte bindable prop
		response = $bindable(),
		submitted,
		lexicon
	}: {
		exercise: Extract<Exercise, { type: 'speak' }>;
		response: ExerciseResponse | null;
		submitted: boolean;
		lexicon: Lexicon;
	} = $props();

	// ponytail: asr.ts's e2e stub bypasses real transcription, but
	// modelSource.ts's getModelStatus() is a real (network + Cache Storage)
	// check with no test hook of its own. Treat the stub's presence as
	// "model ready" here too, so e2e can drive record→transcribe without a
	// real model file. Doesn't touch the reviewed Task 10 modules.
	const E2E_STUB_KEY = 'fp-e2e-stub-asr';
	function hasAsrStub(): boolean {
		return typeof localStorage !== 'undefined' && localStorage.getItem(E2E_STUB_KEY) !== null;
	}

	type ModelStatus = 'checking' | 'ready' | 'needs-download' | 'downloading' | 'failed';
	let modelStatus = $state<ModelStatus>('checking');
	let downloadPct = $state(0);
	let recording = $state(false);
	let busy = $state(false);
	let score = $state<PronunciationScore | null>(null);
	let asrFailed = $state(false);
	let playing = $state(false);

	let mediaStream: MediaStream | null = null;
	let audioCtx: AudioContext | null = null;
	let chunks: Float32Array[] = [];
	let starting = false; // guards the async gap between tap and recording=true

	const canSpeak = ttsAvailable();

	$effect(() => {
		if (hasAsrStub()) {
			modelStatus = 'ready';
			return;
		}
		getModelStatus()
			.then((s) => {
				modelStatus = s;
				if (s === 'ready') void preloadAsr().catch(() => (asrFailed = true));
			})
			.catch(() => (modelStatus = 'failed'));
	});

	// Cleanup microphone and AudioContext on component unmount or if recording is interrupted
	$effect(() => {
		return () => {
			mediaStream?.getTracks().forEach((t) => t.stop());
			void audioCtx?.close();
		};
	});

	function play() {
		playing = true;
		speakFrench(exercise.audioText ?? exercise.phrase);
		setTimeout(() => (playing = false), 1200);
	}

	async function startDownload() {
		modelStatus = 'downloading';
		downloadPct = 0;
		try {
			await downloadModel((pct) => (downloadPct = pct));
			modelStatus = 'ready';
		} catch {
			modelStatus = 'failed';
		}
	}

	async function toggleRecord() {
		if (submitted || busy || starting) return;
		if (recording) {
			await stopRecording();
			return;
		}
		starting = true;
		chunks = [];
		try {
			mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
		} catch {
			asrFailed = true;
			return;
		} finally {
			// Safe: everything from here through recording=true is synchronous,
			// so no second tap can interleave once the guard drops.
			starting = false;
		}
		audioCtx = new AudioContext({ sampleRate: 16000 });
		const source = audioCtx.createMediaStreamSource(mediaStream);
		const proc = audioCtx.createScriptProcessor(4096, 1, 1);
		proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
		source.connect(proc);
		proc.connect(audioCtx.destination);
		recording = true;
	}

	async function stopRecording() {
		recording = false;
		mediaStream?.getTracks().forEach((t) => t.stop());
		mediaStream = null;
		await audioCtx?.close();
		audioCtx = null;
		const total = chunks.reduce((n, c) => n + c.length, 0);
		const audio = new Float32Array(total);
		let offset = 0;
		for (const c of chunks) {
			audio.set(c, offset);
			offset += c.length;
		}
		chunks = [];
		busy = true;
		try {
			const words = await transcribe(audio, 16000);
			score = scorePronunciation(exercise.phrase, words);
			response = { type: 'speak', overall: score.overall };
		} catch {
			asrFailed = true;
		} finally {
			busy = false;
		}
	}

	function selfAssess(ok: boolean) {
		response = { type: 'speak', overall: 'retry', selfOk: ok };
	}

	function retryFallback() {
		asrFailed = false;
		score = null;
		response = null;
	}
</script>

<div class="space-y-4" data-testid="speak-exercise">
	<div class="flex items-start justify-between gap-3">
		<GlossText text={exercise.phrase} {lexicon} class="fp-quote-fr text-xl text-foreground" />
		{#if canSpeak}
			<button
				type="button"
				class="min-h-11 rounded-full border border-border px-4 py-2 hover:border-primary {playing
					? 'fp-tts-pulse'
					: ''}"
				onclick={play}
				data-testid="speak-play"
			>
				🔊
			</button>
		{/if}
	</div>

	{#if modelStatus === 'needs-download' || modelStatus === 'downloading'}
		<div class="surface-card space-y-3 p-4" data-testid="speak-download-card">
			<p class="font-semibold text-foreground">{m.speak_pack_title()}</p>
			<p class="text-sm text-muted">{m.speak_pack_body({ size: MODEL_SIZE_MB })}</p>
			{#if modelStatus === 'downloading'}
				<div
					class="h-2 w-full overflow-hidden rounded-full bg-subtle"
					role="progressbar"
					aria-valuenow={downloadPct}
					aria-valuemin={0}
					aria-valuemax={100}
				>
					<div class="h-full bg-primary" style="width: {downloadPct}%"></div>
				</div>
				<p class="text-sm text-muted" aria-live="polite">
					{m.speak_pack_progress({ pct: downloadPct })}
				</p>
			{:else}
				<button
					type="button"
					class="min-h-11 rounded-full border border-border px-4 py-2 hover:border-primary"
					data-testid="speak-download-confirm"
					onclick={startDownload}
				>
					{m.speak_pack_download()}
				</button>
			{/if}
		</div>
	{:else if modelStatus === 'ready' && !asrFailed}
		<IconButton
			icon="mic"
			label={recording ? m.speak_stop() : m.speak_record()}
			pressed={recording}
			disabled={submitted || busy}
			testid="speak-record"
			onclick={toggleRecord}
		/>
		{#if busy}
			<p class="text-sm text-muted" aria-live="polite">{m.speak_transcribing()}</p>
		{/if}
	{/if}

	{#if score}
		<div class="fp-speak-chips flex flex-wrap gap-2" role="status" aria-live="polite">
			{#each score.words as wv, i (wv.expected + i)}
				<span
					class="fp-chip fp-chip--{wv.verdict}"
					data-testid="speak-word-chip"
					data-verdict={wv.verdict}
					style="--fp-chip-i: {i}"
				>
					{wv.expected}
				</span>
			{/each}
		</div>
		<p class="sr-only" aria-live="polite">
			{score.overall === 'good'
				? m.speak_result_good()
				: score.overall === 'partial'
					? m.speak_result_partial()
					: m.speak_result_retry()}
		</p>
	{/if}

	{#if asrFailed || modelStatus === 'failed'}
		<div class="surface-card space-y-3 p-4" data-testid="speak-fallback">
			<p class="text-foreground">{m.speak_fallback_prompt()}</p>
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="min-h-11 rounded-full border border-border px-4 py-2 hover:border-primary"
					data-testid="speak-fallback-yes"
					disabled={submitted}
					onclick={() => selfAssess(true)}
				>
					{m.speak_fallback_yes()}
				</button>
				<button
					type="button"
					class="min-h-11 rounded-full border border-border px-4 py-2 hover:border-primary"
					data-testid="speak-fallback-retry"
					disabled={submitted}
					onclick={retryFallback}
				>
					{m.speak_fallback_retry()}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.fp-chip {
		display: inline-flex;
		align-items: center;
		padding: 6px 14px;
		border-radius: var(--fp-r-pill);
		font-weight: 600;
		color: var(--fp-ink);
		animation: fp-chip-in 220ms var(--fp-ease-out) backwards;
		animation-delay: calc(var(--fp-chip-i, 0) * 60ms);
	}
	.fp-chip--good {
		background: color-mix(in srgb, var(--fp-sage) 30%, var(--fp-paper));
	}
	.fp-chip--unclear {
		background: color-mix(in srgb, var(--fp-saffron) 30%, var(--fp-paper));
	}
	.fp-chip--missed {
		background: color-mix(in srgb, var(--fp-error) 24%, var(--fp-paper));
	}

	@keyframes fp-chip-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fp-chip {
			animation: none;
		}
	}
</style>
