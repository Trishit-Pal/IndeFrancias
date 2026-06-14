import { describe, expect, it } from 'vitest';
import {
	getDefaultFrenchVoiceUri,
	isFrenchVoice,
	listFrenchVoices,
	resolveFrenchVoice
} from './tts';

function mockVoice(
	name: string,
	lang: string,
	voiceURI: string,
	localService = true
): SpeechSynthesisVoice {
	return { name, lang, voiceURI, localService } as SpeechSynthesisVoice;
}

describe('tts voice selection', () => {
	const voices = [
		mockVoice('Google US English', 'en-US', 'en-us'),
		mockVoice('Google français', 'fr-FR', 'fr-fr-1'),
		mockVoice('Microsoft Julie', 'fr-FR', 'fr-fr-2', false),
		mockVoice('Google français (Canada)', 'fr-CA', 'fr-ca-1')
	];

	it('filters French voices only', () => {
		expect(listFrenchVoices(voices)).toHaveLength(3);
		expect(listFrenchVoices(voices).every(isFrenchVoice)).toBe(true);
	});

	it('prefers fr-FR over fr-CA', () => {
		const sorted = listFrenchVoices(voices);
		expect(sorted[0]?.lang).toMatch(/^fr-FR/i);
	});

	it('returns default fr voice URI', () => {
		expect(getDefaultFrenchVoiceUri(voices)).toBe('fr-fr-1');
	});

	it('resolves by URI and rejects English', () => {
		expect(resolveFrenchVoice('fr-ca-1', voices)?.voiceURI).toBe('fr-ca-1');
		expect(resolveFrenchVoice('en-us', voices)?.voiceURI).toBe('fr-fr-1');
	});

	it('falls back to first French voice when URI unknown', () => {
		expect(resolveFrenchVoice(null, voices)?.voiceURI).toBe('fr-fr-1');
	});
});
