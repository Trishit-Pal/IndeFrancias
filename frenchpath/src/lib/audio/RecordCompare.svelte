<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	// Listen to the model pronunciation (TTS), record yourself, and compare by
	// playing both back. Works on all browsers with MediaRecorder; degrades to
	// TTS-only where recording isn't available.
	import { speakFrench, ttsAvailable } from './tts';
	import IconButton from '$lib/components/IconButton.svelte';

	let { text, label }: { text: string; label?: string } = $props();

	const canRecord =
		typeof navigator !== 'undefined' &&
		!!navigator.mediaDevices &&
		typeof MediaRecorder !== 'undefined';

	let recording = $state(false);
	let audioUrl = $state<string | null>(null);
	let recorder: MediaRecorder | null = null;
	let chunks: Blob[] = [];

	// Free the in-memory recording when the component goes away (replacements are revoked in onstop).
	$effect(() => () => {
		if (audioUrl) URL.revokeObjectURL(audioUrl);
	});

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
</script>

<div class="flex items-center gap-1">
	{#if ttsAvailable()}
		<IconButton
			icon="speaker"
			label={m.audio_listen_to({ text: label ?? text })}
			size={16}
			onclick={() => speakFrench(text)}
		/>
	{/if}
	{#if canRecord}
		<IconButton
			icon="mic"
			label={recording ? m.audio_record_stop() : m.audio_record_start()}
			pressed={recording}
			size={16}
			onclick={recording ? stopRecording : startRecording}
		/>
		<IconButton
			icon="play"
			label={m.audio_play_recording()}
			disabled={!audioUrl}
			size={16}
			onclick={playBack}
		/>
	{/if}
</div>
