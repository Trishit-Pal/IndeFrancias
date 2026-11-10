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
	let stream: MediaStream | null = null;
	let chunks: Blob[] = [];
	let starting = false; // a double tap while the mic prompt is open must not open a second stream
	let destroyed = false;

	function releaseMic() {
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
	}

	// Unmounting mid-recording (e.g. "Start lesson" on the new-words list) must turn the mic off,
	// and free the in-memory recording (replacements are revoked in onstop).
	$effect(() => () => {
		destroyed = true;
		if (recorder?.state === 'recording') recorder.stop();
		releaseMic();
		if (audioUrl) URL.revokeObjectURL(audioUrl);
	});

	async function startRecording() {
		if (recording || starting) return;
		starting = true;
		try {
			const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
			if (destroyed) {
				mic.getTracks().forEach((track) => track.stop());
				return;
			}
			stream = mic;
			chunks = [];
			const active = new MediaRecorder(mic);
			recorder = active;
			active.ondataavailable = (event) => chunks.push(event.data);
			active.onstop = () => {
				mic.getTracks().forEach((track) => track.stop()); // this recording's own stream
				if (destroyed) return; // a late onstop after unmount: don't create a URL nothing would revoke
				if (audioUrl) URL.revokeObjectURL(audioUrl);
				// Safari records mp4, Chrome webm: label the blob with what was actually recorded.
				audioUrl = URL.createObjectURL(new Blob(chunks, { type: active.mimeType }));
			};
			active.start();
			recording = true;
		} catch {
			recording = false; // mic denied/unavailable — silently fall back
			releaseMic();
		} finally {
			starting = false;
		}
	}

	function stopRecording() {
		recorder?.stop();
		recording = false;
	}

	function playBack() {
		// An autoplay rejection is not an app error; don't trip the global banner.
		if (audioUrl) new Audio(audioUrl).play().catch(() => {});
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
