// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/vanillajs" />
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	/** '1' only for the Playwright build; gates the e2e ASR stub (see src/lib/speech/asr.ts). */
	interface ImportMetaEnv {
		readonly VITE_E2E?: string;
	}
}

export {};
