<script lang="ts">
	// Listen to the model pronunciation (TTS), record yourself, and compare by
	// playing both back. Works on all browsers with MediaRecorder; degrades to
	// TTS-only where recording isn't available.
	import { speakFrench, ttsAvailable } from './tts';

	let { text, label }: { text: string; label?: string } = $props();

	const canRecord =
		typeof navigator !== 'undefined' &&
		!!navigator.mediaDevices &&
		typeof MediaRecorder !== 'undefined';

	let recording = $state(false);
	let audioUrl = $state<string | null>(null);
	let recorder: MediaRecorder | null = null;
	let chunks: Blob[] = [];

	async function startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			chunks = [];
			recorder = new MediaRecorder(stream);
			recorder.ondataavailable = (event) => chunks.push(event.data);
			recorder.onstop = () => {
				if (audioUrl) URL.revokeObjectURL(audioUrl);
				audioUrl = URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' }));
				stream.getTracks().forEach((track) => track.stop());
			};
			recorder.start();
			recording = true;
		} catch {
			recording = false; // mic denied/unavailable — silently fall back
		}
	}

	function stopRecording() {
		recorder?.stop();
		recording = false;
	}

	function playBack() {
		if (audioUrl) void new Audio(audioUrl).play();
	}

	const btn =
		'rounded-full border border-slate-300 px-3 py-1 text-sm hover:border-blue-400 disabled:opacity-40';
</script>

<div class="flex items-center gap-1">
	{#if ttsAvailable()}
		<button
			type="button"
			class={btn}
			aria-label={`Listen to ${label ?? text}`}
			onclick={() => speakFrench(text)}>🔊</button
		>
	{/if}
	{#if canRecord}
		{#if recording}
			<button
				type="button"
				class="{btn} border-red-400 text-red-600"
				aria-label="Stop recording"
				onclick={stopRecording}>⏹</button
			>
		{:else}
			<button type="button" class={btn} aria-label="Record yourself" onclick={startRecording}
				>🎤</button
			>
		{/if}
		<button
			type="button"
			class={btn}
			aria-label="Play your recording"
			disabled={!audioUrl}
			onclick={playBack}>▶</button
		>
	{/if}
</div>
