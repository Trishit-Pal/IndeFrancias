// French text-to-speech via the Web Speech API's SpeechSynthesis, which is
// broadly supported (unlike SpeechRecognition). Degrades silently when absent.
export function ttsAvailable(): boolean {
	return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakFrench(text: string, rate = 1): void {
	if (!ttsAvailable()) return;
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = 'fr-FR';
	utterance.rate = rate;
	window.speechSynthesis.cancel();
	window.speechSynthesis.speak(utterance);
}
