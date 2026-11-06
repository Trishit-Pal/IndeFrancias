import type { Caps } from '$lib/gamification/todayPlan';
import { ttsAvailable, voicesReady, isFrenchVoice } from '$lib/audio/tts';
import { getModelStatus } from '$lib/speech/modelSource';

/** Device capabilities for review modes. Never downloads or prompts. */
export async function loadCaps(): Promise<Caps> {
	let tts: boolean;
	let asr: boolean;
	try {
		tts = ttsAvailable() && (await voicesReady()).some(isFrenchVoice);
	} catch {
		tts = false;
	}
	try {
		asr = (await getModelStatus()) === 'ready';
	} catch {
		asr = false;
	}
	return { tts, asr };
}
