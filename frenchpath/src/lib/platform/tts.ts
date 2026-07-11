// Native (Capacitor) French TTS. Plugin is dynamically imported so the web
// bundle/SSR never touches it. Mirrors the silent-fallback behavior of the web
// Web Speech path in `$lib/audio/tts`.

export async function nativeSpeakFrench(text: string, rate: number): Promise<void> {
	try {
		const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
		await TextToSpeech.stop().catch(() => {});
		await TextToSpeech.speak({ text, lang: 'fr-FR', rate });
	} catch {
		// Native TTS unavailable on this device — stay silent, like the web path.
	}
}

/** Stops in-progress native speech (e.g. when the user pauses shadowing playback). */
export async function nativeStopSpeaking(): Promise<void> {
	try {
		const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
		await TextToSpeech.stop();
	} catch {
		// Native TTS unavailable — nothing to stop.
	}
}
