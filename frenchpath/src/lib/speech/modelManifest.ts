// Single source of truth for the bundled ASR model. The hash pins the exact
// artifact: runtime downloads verify against it before anything is stored.
export const MODEL_FILENAME = 'vosk-model-small-fr-0.22.zip';
export const MODEL_URL_PATH = `/models/${MODEL_FILENAME}`;
export const MODEL_UPSTREAM = `https://alphacephei.com/vosk/models/${MODEL_FILENAME}`;
/** SHA-256 of the artifact — computed once by scripts/fetch-vosk-model.mjs --print-hash. */
export const MODEL_SHA256 = 'cabf6180e177eb9b3a9a9d43a437bd5e549f3a7d09525e5d69a3fed787be12ad';
export const MODEL_SIZE_MB = 41;
