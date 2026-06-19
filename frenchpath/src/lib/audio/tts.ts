// French text-to-speech via Web Speech API. Always uses a French voice when available.
// On the Capacitor native shell, speaking routes to the native TTS plugin.
import { isNativePlatform } from '$lib/platform';
import { nativeSpeakFrench } from '$lib/platform/tts';

export interface SpeakOptions {
	voiceUri?: string | null;
	rate?: number;
}

/** Module-level defaults; updated from layout when settings load. */
let cachedVoiceUri: string | null = null;
let cachedRate = 1;

export function configureTts(voiceUri: string | null, rate: number): void {
	cachedVoiceUri = voiceUri;
	cachedRate = clampRate(rate);
}

function clampRate(rate: number): number {
	return Math.min(1.25, Math.max(0.75, rate));
}

export function ttsAvailable(): boolean {
	return isNativePlatform() || (typeof window !== 'undefined' && 'speechSynthesis' in window);
}

/** True when voice.lang starts with fr (fr-FR, fr-CA, etc.). */
export function isFrenchVoice(voice: SpeechSynthesisVoice): boolean {
	return /^fr/i.test(voice.lang);
}

/** All installed French voices, fr-FR first, then other fr-* locales. */
export function listFrenchVoices(
	voices: SpeechSynthesisVoice[] = getVoices()
): SpeechSynthesisVoice[] {
	const french = voices.filter(isFrenchVoice);
	return french.sort((a, b) => {
		const aFr = a.lang.toLowerCase().startsWith('fr-fr') ? 0 : 1;
		const bFr = b.lang.toLowerCase().startsWith('fr-fr') ? 0 : 1;
		if (aFr !== bFr) return aFr - bFr;
		if (a.localService !== b.localService) return a.localService ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}

function getVoices(): SpeechSynthesisVoice[] {
	if (!ttsAvailable()) return [];
	return window.speechSynthesis.getVoices();
}

/** Resolves when voices are populated (Chrome/Android loads async). */
export function voicesReady(timeoutMs = 3000): Promise<SpeechSynthesisVoice[]> {
	if (!ttsAvailable()) return Promise.resolve([]);

	const existing = listFrenchVoices();
	if (existing.length > 0) return Promise.resolve(existing);

	return new Promise((resolve) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			window.speechSynthesis.removeEventListener('voiceschanged', onChange);
			clearTimeout(timer);
			resolve(listFrenchVoices());
		};
		const onChange = () => finish();
		const timer = setTimeout(finish, timeoutMs);
		window.speechSynthesis.addEventListener('voiceschanged', onChange);
		// Trigger load on some browsers
		void window.speechSynthesis.getVoices();
	});
}

/** Best default: first fr-FR local voice, else any fr voice. */
export function getDefaultFrenchVoiceUri(
	voices: SpeechSynthesisVoice[] = getVoices()
): string | null {
	const french = listFrenchVoices(voices);
	return french[0]?.voiceURI ?? null;
}

/** Pick voice by URI; rejects non-French voices. */
export function resolveFrenchVoice(
	voiceUri: string | null | undefined,
	voices: SpeechSynthesisVoice[] = getVoices()
): SpeechSynthesisVoice | null {
	const french = listFrenchVoices(voices);
	if (french.length === 0) return null;

	if (voiceUri) {
		const match = french.find((v) => v.voiceURI === voiceUri || v.name === voiceUri);
		if (match) return match;
	}

	return french[0];
}

export function speakFrench(text: string, options: SpeakOptions = {}): void {
	if (!text.trim()) return;

	if (isNativePlatform()) {
		void nativeSpeakFrench(text, clampRate(options.rate ?? cachedRate));
		return;
	}

	if (!ttsAvailable()) return;

	const voices = getVoices();
	const voiceUri = options.voiceUri !== undefined ? options.voiceUri : cachedVoiceUri;
	const rate = clampRate(options.rate ?? cachedRate);
	const voice = resolveFrenchVoice(voiceUri, voices);

	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = voice?.lang ?? 'fr-FR';
	utterance.rate = rate;
	if (voice) utterance.voice = voice;

	window.speechSynthesis.cancel();
	window.speechSynthesis.speak(utterance);
}
